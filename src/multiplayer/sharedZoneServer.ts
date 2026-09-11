import { Storage } from '@dcl/sdk/server'
import { engine } from '@dcl/sdk/ecs'
import { SHARED_ZONE_CONFIG } from './sharedZoneConfig'
import { isInsideSharedZone } from './sharedZoneConfig'
import { sharedZoneRoom } from './sharedZoneProtocol'
import { HOUSE_FURNITURE } from '../house/houseConfig'
import { hasLiveChiri } from './chiriPresenceServer'
import {
  SharedChiriState,
  SharedObjectLock,
  SharedObjectState,
  SharedQuaternion,
  SharedVector3,
  SharedZoneState
} from './sharedZoneTypes'

const chiris = new Map<string, SharedChiriState>()
const objects = new Map<string, SharedObjectState>()
const locks = new Map<string, SharedObjectLock>()

let revision = 0
let initialized = false
let stateLoaded: Promise<void> | undefined
const chiriHeadings = new Map<string, number>()
const chiriTurnAt = new Map<string, number>()
let autonomousElapsed = 0
let autonomousPersistElapsed = 0

function currentPersistentState(): SharedZoneState {
  return {
    revision,
    chiris: [...chiris.values()],
    objects: [...objects.values()]
  }
}

function isFiniteVector3(value: SharedVector3): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z)
}

function isFiniteQuaternion(value: SharedQuaternion): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z) && Number.isFinite(value.w)
}

function isAllowedScale(scale: SharedVector3): boolean {
  return (
    isFiniteVector3(scale) &&
    scale.x >= 0.05 &&
    scale.x <= 10 &&
    scale.y >= 0.05 &&
    scale.y <= 10 &&
    scale.z >= 0.05 &&
    scale.z <= 10
  )
}

function isEditableObject(objectId: string): boolean {
  return objects.has(objectId)
}

function furnitureIdFromItem(itemId: string): string | null {
  if (!itemId.startsWith('house_furniture:')) return null
  const furnitureId = itemId.slice('house_furniture:'.length)
  return HOUSE_FURNITURE[furnitureId] ? furnitureId : null
}

function isValidObjectId(objectId: string, sender: string): boolean {
  return objectId.length > sender.length + 1 &&
    objectId.length <= SHARED_ZONE_CONFIG.maxObjectIdLength &&
    objectId.startsWith(`${sender}:`)
}

function sendError(to: string, code: string, message: string): void {
  void sharedZoneRoom.send('sharedZoneError', { code, message }, { to: [to] })
}

function sendSnapshot(to: string): void {
  void sharedZoneRoom.send(
    'sharedZoneSnapshot',
    {
      stateJson: JSON.stringify({
        enabled: SHARED_ZONE_CONFIG.enabled,
        ...currentPersistentState(),
        locks: [...locks.values()].filter(lock => lock.expiresAt > Date.now())
      })
    },
    { to: [to] }
  )
}

async function loadPersistentState(): Promise<void> {
  try {
    // getValues returns an empty collection for a brand-new world. Calling
    // get() directly would make the preview report an expected 404 as an error.
    const result = await Storage.getValues({ prefix: SHARED_ZONE_CONFIG.storageKey, limit: 10 })
    const stored = result.data.find(entry => entry.key === SHARED_ZONE_CONFIG.storageKey)?.value as
      | SharedZoneState
      | undefined
    if (!stored) return

    revision = Number.isFinite(stored.revision) ? stored.revision : 0

    for (const chiri of stored.chiris ?? []) {
      if (!chiri.ownerId || !isInsideSharedZone(chiri.position)) continue
      chiris.set(chiri.ownerId, chiri)
    }

    for (const object of stored.objects ?? []) {
      if (!object.ownerId || !furnitureIdFromItem(object.itemId)) continue
      if (!isInsideSharedZone(object.position) || !isFiniteQuaternion(object.rotation) || !isAllowedScale(object.scale)) continue
      objects.set(object.objectId, object)
    }
  } catch (error) {
    console.error('SHARED ZONE: failed to load persistent state', error)
  }
}

function persistState(): void {
  void Storage.set(SHARED_ZONE_CONFIG.storageKey, currentPersistentState()).catch(error => {
    console.error('SHARED ZONE: failed to persist state', error)
  })
}

function rejectWhenDisabled(sender: string): boolean {
  if (SHARED_ZONE_CONFIG.enabled) return false
  sendError(sender, 'shared-zone-disabled', 'The collaborative zone is not enabled yet.')
  return true
}

function getSender(context?: { from: string }): string | undefined {
  const sender = context?.from?.trim().toLowerCase()
  return sender || undefined
}

function updatePersistentChiris(dt: number): void {
  autonomousElapsed += dt
  autonomousPersistElapsed += dt
  if (autonomousElapsed < .5 || chiris.size === 0) return
  const stepDt = autonomousElapsed
  autonomousElapsed = 0
  const now = Date.now()
  const bounds = SHARED_ZONE_CONFIG.bounds
  let changed = false

  for (const chiri of chiris.values()) {
    let heading = chiriHeadings.get(chiri.ownerId) ??
      ([...chiri.ownerId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360) * Math.PI / 180
    if ((chiriTurnAt.get(chiri.ownerId) ?? 0) <= now) {
      heading += (Math.random() - .5) * 1.8
      chiriTurnAt.set(chiri.ownerId, now + 3_000 + Math.random() * 5_000)
    }
    let nextX = chiri.position.x + Math.cos(heading) * .8 * stepDt
    let nextZ = chiri.position.z + Math.sin(heading) * .8 * stepDt
    if (nextX < bounds.minX + 1 || nextX > bounds.maxX - 1) {
      heading = Math.PI - heading
      nextX = Math.max(bounds.minX + 1, Math.min(bounds.maxX - 1, nextX))
    }
    if (nextZ < bounds.minZ + 1 || nextZ > bounds.maxZ - 1) {
      heading = -heading
      nextZ = Math.max(bounds.minZ + 1, Math.min(bounds.maxZ - 1, nextZ))
    }
    chiriHeadings.set(chiri.ownerId, heading)
    chiri.position = { x: nextX, y: chiri.position.y, z: nextZ }
    chiri.rotationY = 90 - heading * 180 / Math.PI
    revision++
    changed = true
    void sharedZoneRoom.send('sharedChiriChanged', { ...chiri, present: true, revision })
  }
  if (changed && autonomousPersistElapsed >= 10) {
    autonomousPersistElapsed = 0
    persistState()
  }
}

export async function initializeSharedZoneServer(): Promise<void> {
  if (initialized) return
  initialized = true

  stateLoaded = loadPersistentState()

  sharedZoneRoom.onMessage('sharedZoneSnapshotRequest', async (_data, context) => {
    const sender = getSender(context)
    if (!sender) return
    await stateLoaded
    sendSnapshot(sender)
  })

  sharedZoneRoom.onMessage('sharedChiriUpsert', async (data, context) => {
    const sender = getSender(context)
    if (!sender || rejectWhenDisabled(sender)) return
    await stateLoaded

    if (!SHARED_ZONE_CONFIG.allowedChiriVariants.includes(data.variantId)) {
      sendError(sender, 'invalid-chiri-variant', 'This Chiri variant is not allowed in the shared zone.')
      return
    }

    if (!isInsideSharedZone(data.position) || !Number.isFinite(data.rotationY)) {
      sendError(sender, 'invalid-chiri-transform', 'Chiri must stay inside the shared zone.')
      return
    }

    const chiri: SharedChiriState = {
      ownerId: sender,
      variantId: data.variantId,
      position: data.position,
      rotationY: data.rotationY,
      behavior: data.behavior
    }

    chiris.set(sender, chiri)
    revision++
    persistState()
    void sharedZoneRoom.send('sharedChiriChanged', { ...chiri, present: true, revision })
  })

  sharedZoneRoom.onMessage('sharedChiriRemove', async (_data, context) => {
    const sender = getSender(context)
    if (!sender || rejectWhenDisabled(sender)) return
    await stateLoaded

    const previous = chiris.get(sender)
    if (!previous) return

    chiris.delete(sender)
    revision++
    persistState()
    void sharedZoneRoom.send('sharedChiriChanged', {
      ...previous,
      present: false,
      revision
    })
  })

  sharedZoneRoom.onMessage('sharedObjectLockRequest', async (data, context) => {
    const sender = getSender(context)
    if (!sender || rejectWhenDisabled(sender)) return
    await stateLoaded

    if (!isEditableObject(data.objectId)) {
      sendError(sender, 'object-not-editable', 'This object cannot be edited in the shared zone.')
      return
    }

    const now = Date.now()
    const currentLock = locks.get(data.objectId)
    const canLock = !currentLock || currentLock.expiresAt <= now || currentLock.ownerId === sender

    if (!canLock) {
      void sharedZoneRoom.send(
        'sharedObjectLockChanged',
        {
          objectId: data.objectId,
          ownerId: currentLock.ownerId,
          granted: false,
          expiresAt: currentLock.expiresAt,
          revision
        },
        { to: [sender] }
      )
      return
    }

    const lock: SharedObjectLock = {
      objectId: data.objectId,
      ownerId: sender,
      expiresAt: now + SHARED_ZONE_CONFIG.lockDurationMs
    }
    locks.set(data.objectId, lock)
    void sharedZoneRoom.send('sharedObjectLockChanged', { ...lock, granted: true, revision })
  })

  sharedZoneRoom.onMessage('sharedObjectCreate', async (data, context) => {
    const sender = getSender(context)
    if (!sender || rejectWhenDisabled(sender)) return
    await stateLoaded

    if (!isValidObjectId(data.objectId, sender) || objects.has(data.objectId)) {
      sendError(sender, 'invalid-object-id', 'This shared object id is invalid or already exists.')
      return
    }
    if (!furnitureIdFromItem(data.itemId) || data.itemId.length > SHARED_ZONE_CONFIG.maxItemIdLength) {
      sendError(sender, 'invalid-shared-item', 'Only supported furniture can be dropped in the Void.')
      return
    }
    const ownedCount = [...objects.values()].filter(object => object.ownerId === sender).length
    if (ownedCount >= SHARED_ZONE_CONFIG.maxSharedObjectsPerPlayer) {
      sendError(sender, 'shared-object-limit', 'You reached the shared furniture limit.')
      return
    }
    if (!isInsideSharedZone(data.position) || !isFiniteQuaternion(data.rotation) || !isAllowedScale(data.scale)) {
      sendError(sender, 'invalid-object-transform', 'The object must stay inside the collaborative Void.')
      return
    }

    const object: SharedObjectState = {
      objectId: data.objectId,
      ownerId: sender,
      itemId: data.itemId,
      position: data.position,
      rotation: data.rotation,
      scale: data.scale,
      updatedBy: sender
    }
    objects.set(object.objectId, object)
    revision++
    persistState()
    void sharedZoneRoom.send('sharedObjectChanged', { ...object, present: true, revision })
  })

  sharedZoneRoom.onMessage('sharedObjectMove', async (data, context) => {
    const sender = getSender(context)
    if (!sender || rejectWhenDisabled(sender)) return
    await stateLoaded

    const lock = locks.get(data.objectId)
    if (!lock || lock.ownerId !== sender || lock.expiresAt <= Date.now()) {
      locks.delete(data.objectId)
      sendError(sender, 'object-lock-required', 'Request the object lock before moving it.')
      return
    }

    if (!isEditableObject(data.objectId)) {
      sendError(sender, 'object-not-editable', 'This object cannot be edited in the shared zone.')
      return
    }

    if (!isInsideSharedZone(data.position) || !isFiniteQuaternion(data.rotation) || !isAllowedScale(data.scale)) {
      sendError(sender, 'invalid-object-transform', 'The object transform is outside the allowed shared-zone limits.')
      return
    }

    const object: SharedObjectState = {
      objectId: data.objectId,
      ownerId: objects.get(data.objectId)!.ownerId,
      itemId: objects.get(data.objectId)!.itemId,
      position: data.position,
      rotation: data.rotation,
      scale: data.scale,
      updatedBy: sender
    }

    objects.set(data.objectId, object)
    lock.expiresAt = Date.now() + SHARED_ZONE_CONFIG.lockDurationMs
    revision++
    persistState()
    void sharedZoneRoom.send('sharedObjectChanged', { ...object, present: true, revision })
  })

  sharedZoneRoom.onMessage('sharedObjectRemove', async (data, context) => {
    const sender = getSender(context)
    if (!sender || rejectWhenDisabled(sender)) return
    await stateLoaded
    const object = objects.get(data.objectId)
    if (!object || object.ownerId !== sender) {
      sendError(sender, 'shared-object-not-owned', 'Only the owner can save this object to Inventory.')
      return
    }
    objects.delete(data.objectId)
    locks.delete(data.objectId)
    revision++
    persistState()
    void sharedZoneRoom.send('sharedObjectChanged', { ...object, present: false, revision })
  })

  sharedZoneRoom.onMessage('giftRequest', (data, context) => {
    const sender = getSender(context)
    const targetId = data.targetId.trim().toLowerCase()
    const valid = Boolean(sender && targetId && targetId !== sender && hasLiveChiri(targetId) &&
      data.giftId.startsWith(`${sender}:`) && data.giftId.length <= 140 &&
      data.itemId.length > 0 && data.itemId.length <= SHARED_ZONE_CONFIG.maxItemIdLength)
    if (!sender) return
    if (!valid) {
      void sharedZoneRoom.send('giftResult', {
        giftId: data.giftId,
        accepted: false,
        message: 'That Chiri is no longer available to receive the gift.'
      }, { to: [sender] })
      return
    }
    void sharedZoneRoom.send('giftDelivered', {
      giftId: data.giftId,
      senderId: sender,
      targetId,
      itemId: data.itemId
    }, { to: [targetId] })
    void sharedZoneRoom.send('giftResult', {
      giftId: data.giftId,
      accepted: true,
      message: 'Gift sent!'
    }, { to: [sender] })
  })

  sharedZoneRoom.onMessage('sharedObjectLockRelease', async (data, context) => {
    const sender = getSender(context)
    if (!sender || rejectWhenDisabled(sender)) return
    await stateLoaded

    const lock = locks.get(data.objectId)
    if (!lock || lock.ownerId !== sender) return

    locks.delete(data.objectId)
    void sharedZoneRoom.send('sharedObjectLockChanged', {
      objectId: data.objectId,
      ownerId: '',
      granted: false,
      expiresAt: 0,
      revision
    })
  })

  await stateLoaded
  engine.addSystem(updatePersistentChiris)

  sharedZoneRoom.onReady(ready => {
    if (!ready) return
    void sharedZoneRoom.send('sharedZoneReady', {
      enabled: SHARED_ZONE_CONFIG.enabled,
      protocolVersion: SHARED_ZONE_CONFIG.protocolVersion
    })
  })

  console.log(`SHARED ZONE SERVER: ready (enabled=${SHARED_ZONE_CONFIG.enabled})`)
}
