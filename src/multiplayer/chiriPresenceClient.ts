import {
  Animator,
  ColliderLayer,
  engine,
  Entity,
  GltfContainer,
  InputAction,
  pointerEventsSystem,
  Transform
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { isMobile } from '@dcl/sdk/platform'
import { getPlayer } from '@dcl/sdk/players'
import {
  CHIRI_ANIMATION_CLIPS,
  CHIRI_COMPANION_CONFIG,
  CHIRI_VARIANTS,
  ChiriAnimation,
  ChiriVariantId,
  createChiriAnimationStates,
  getChiriPresenceSnapshot,
  getChiriMode
} from '../companion/chiriCompanion'
import { getChiriAccessoryDefinition } from '../companion/chiriAppearance'
import { CHIRI_PRESENCE_CONFIG } from './chiriPresenceConfig'
import { sharedZoneRoom } from './sharedZoneProtocol'
import { isInsideSharedZone } from './sharedZoneConfig'
import { selectGiftTarget } from './giftState'
import { placeSharedChiri, removeSharedChiri } from './sharedZoneClient'
import { LiveChiriSnapshot, LiveChiriState } from './chiriPresenceTypes'

type RemoteChiriRuntime = {
  entity: Entity
  state: LiveChiriState
  targetPosition: Vector3
  targetRotation: Quaternion
  variantId: ChiriVariantId
  animation: ChiriAnimation
  accessoryEntities: Map<string, Entity>
}

const remoteChiris = new Map<string, RemoteChiriRuntime>()
let initialized = false
let roomReady = false
let viewerWasInsideZone = false
let persistentChiriPublished = false
let persistentPublishElapsed = 0
let persistentCleanupSent = false
let publishElapsed = 0
let heartbeatElapsed = 0
let publishedVisible = false
let lastPublished:
  | {
      variantId: ChiriVariantId
      equippedItemsJson: string
      equippedMateId: string
      position: Vector3
      rotation: Quaternion
      animation: ChiriAnimation
    }
  | undefined

function localPlayerId(): string {
  return getPlayer()?.userId.trim().toLowerCase() ?? ''
}

function normalizeVariant(value: string): ChiriVariantId {
  return value === 'mecha' ? 'mecha' : 'classic'
}

function normalizeAnimation(value: string): ChiriAnimation {
  if (
    value === 'walk' ||
    value === 'run' ||
    value === 'jump' ||
    value === 'wave' ||
    value === 'bored'
  ) {
    return value
  }

  if (value === 'fly' && CHIRI_COMPANION_CONFIG.flyAnimationAvailable) {
    return 'fly'
  }

  return 'idle'
}

function getVariantScale(variantId: ChiriVariantId): number {
  const variant = CHIRI_VARIANTS[variantId]
  return isMobile() ? variant.mobileScale : variant.desktopScale
}

function removeRemoteChiri(ownerId: string): void {
  const runtime = remoteChiris.get(ownerId)
  if (!runtime) return

  for (const entity of runtime.accessoryEntities.values()) {
    engine.removeEntity(entity)
  }
  engine.removeEntity(runtime.entity)
  remoteChiris.delete(ownerId)
}

function removeAllRemoteChiris(): void {
  for (const ownerId of [...remoteChiris.keys()]) removeRemoteChiri(ownerId)
}

function syncRemoteAccessories(runtime: RemoteChiriRuntime): void {
  const equippedIds = new Set(runtime.state.equippedItems)

  for (const [accessoryId, entity] of runtime.accessoryEntities) {
    if (equippedIds.has(accessoryId)) continue
    engine.removeEntity(entity)
    runtime.accessoryEntities.delete(accessoryId)
  }

  for (const accessoryId of equippedIds) {
    if (runtime.accessoryEntities.has(accessoryId)) continue
    const definition = getChiriAccessoryDefinition(accessoryId)
    if (!definition) continue

    const entity = engine.addEntity()
    Transform.create(entity, {
      parent: runtime.entity,
      position: definition.position,
      rotation: definition.rotation,
      scale: definition.scale
    })
    GltfContainer.create(entity, {
      src: definition.modelPath,
      visibleMeshesCollisionMask: ColliderLayer.CL_NONE,
      invisibleMeshesCollisionMask: ColliderLayer.CL_NONE
    })
    runtime.accessoryEntities.set(accessoryId, entity)
  }
}

function replaceRemoteVariant(
  runtime: RemoteChiriRuntime,
  variantId: ChiriVariantId,
  animation: ChiriAnimation
): void {
  const variant = CHIRI_VARIANTS[variantId]
  const transform = Transform.get(runtime.entity)
  const scale = getVariantScale(variantId)

  Transform.createOrReplace(runtime.entity, {
    position: transform.position,
    rotation: transform.rotation,
    scale: Vector3.create(scale, scale, scale)
  })
  GltfContainer.createOrReplace(runtime.entity, {
    src: variant.modelPath,
    visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
    invisibleMeshesCollisionMask: ColliderLayer.CL_POINTER
  })
  Animator.createOrReplace(runtime.entity, {
    states: createChiriAnimationStates(animation)
  })
  runtime.variantId = variantId
  runtime.animation = animation
}

function playRemoteAnimation(
  runtime: RemoteChiriRuntime,
  animation: ChiriAnimation
): void {
  if (runtime.animation === animation) return

  const targetClip = CHIRI_ANIMATION_CLIPS[animation]
  const animator = Animator.getMutable(runtime.entity)
  for (const state of animator.states) {
    const isTarget = state.clip === targetClip
    state.playing = isTarget
    state.loop = animation !== 'jump'
    state.weight = isTarget ? 1 : 0
    state.speed = 1
    state.shouldReset = isTarget
  }
  runtime.animation = animation
}

function upsertRemoteChiri(state: LiveChiriState): void {
  const ownerId = state.ownerId.trim().toLowerCase()
  if (!ownerId || ownerId === localPlayerId()) return

  const variantId = normalizeVariant(state.variantId)
  const animation = normalizeAnimation(state.animation)
  const position = Vector3.create(state.position.x, state.position.y, state.position.z)
  const rotation = Quaternion.create(
    state.rotation.x,
    state.rotation.y,
    state.rotation.z,
    state.rotation.w
  )
  let runtime = remoteChiris.get(ownerId)

  if (!runtime) {
    const entity = engine.addEntity()
    const scale = getVariantScale(variantId)
    Transform.create(entity, {
      position,
      rotation,
      scale: Vector3.create(scale, scale, scale)
    })
    GltfContainer.create(entity, {
      src: CHIRI_VARIANTS[variantId].modelPath,
      visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
      invisibleMeshesCollisionMask: ColliderLayer.CL_POINTER
    })
    Animator.create(entity, { states: createChiriAnimationStates(animation) })
    pointerEventsSystem.onPointerDown({
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: 'Interact with Chiri',
        maxDistance: 9
      }
    }, () => {
      const playerName = getPlayer({ userId: ownerId })?.name
      selectGiftTarget(ownerId, playerName ? `${playerName}'s Chiri` : "Player's Chiri")
    })

    runtime = {
      entity,
      state,
      targetPosition: position,
      targetRotation: rotation,
      variantId,
      animation,
      accessoryEntities: new Map()
    }
    remoteChiris.set(ownerId, runtime)
    syncRemoteAccessories(runtime)
    return
  }

  runtime.state = state
  runtime.targetPosition = position
  runtime.targetRotation = rotation

  if (runtime.variantId !== variantId) {
    replaceRemoteVariant(runtime, variantId, animation)
  } else {
    playRemoteAnimation(runtime, animation)
  }
  syncRemoteAccessories(runtime)
}

function parseEquippedItems(json: string): string[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed)
      ? parsed.filter(item => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function stateFromChangedMessage(data: {
  ownerId: string
  variantId: string
  equippedItemsJson: string
  equippedMateId: string
  position: Vector3
  rotation: Quaternion
  animation: string
}): LiveChiriState {
  return {
    ownerId: data.ownerId,
    variantId: data.variantId,
    equippedItems: parseEquippedItems(data.equippedItemsJson),
    equippedMateId: data.equippedMateId || null,
    position: data.position,
    rotation: data.rotation,
    animation: data.animation
  }
}

function applySnapshot(snapshot: LiveChiriSnapshot): void {
  const self = localPlayerId()
  const presentOwners = new Set(
    snapshot.chiris
      .map(chiri => chiri.ownerId.trim().toLowerCase())
      .filter(ownerId => ownerId && ownerId !== self)
  )

  for (const ownerId of [...remoteChiris.keys()]) {
    if (!presentOwners.has(ownerId)) removeRemoteChiri(ownerId)
  }

  for (const state of snapshot.chiris) upsertRemoteChiri(state)
}

function requestSnapshot(): void {
  if (!roomReady) return
  void sharedZoneRoom.send('liveChiriSnapshotRequest', {})
}

function positionChanged(a: Vector3, b: Vector3): boolean {
  return Vector3.distanceSquared(a, b) >=
    CHIRI_PRESENCE_CONFIG.positionChangeThreshold ** 2
}

function rotationChanged(a: Quaternion, b: Quaternion): boolean {
  return (
    Math.abs(a.x - b.x) +
    Math.abs(a.y - b.y) +
    Math.abs(a.z - b.z) +
    Math.abs(a.w - b.w)
  ) >= CHIRI_PRESENCE_CONFIG.rotationChangeThreshold
}

function publishLocalChiri(dt: number): void {
  publishElapsed += dt
  heartbeatElapsed += dt
  if (!roomReady || publishElapsed < CHIRI_PRESENCE_CONFIG.publishIntervalSeconds) return
  publishElapsed = 0

  const snapshot = getChiriPresenceSnapshot()
  const persistentInVoid = snapshot.visible && snapshot.position &&
    getChiriMode() === 'free-roam' && isInsideSharedZone(snapshot.position)

  persistentPublishElapsed += dt
  if (persistentInVoid && snapshot.position && snapshot.rotation) {
    persistentCleanupSent = false
    if (!persistentChiriPublished || persistentPublishElapsed >= .5) {
      persistentPublishElapsed = 0
      persistentChiriPublished = true
      void placeSharedChiri(
        snapshot.variantId,
        snapshot.position,
        Quaternion.toEulerAngles(snapshot.rotation).y,
        'wander'
      )
    }
  } else if (persistentChiriPublished) {
    persistentChiriPublished = false
    persistentPublishElapsed = 0
    void removeSharedChiri()
    persistentCleanupSent = true
  } else if (!persistentCleanupSent && roomReady) {
    persistentCleanupSent = true
    void removeSharedChiri()
  }

  if (!snapshot.visible || !snapshot.position || !snapshot.rotation || persistentInVoid) {
    if (publishedVisible) void sharedZoneRoom.send('liveChiriRemove', {})
    publishedVisible = false
    lastPublished = undefined
    heartbeatElapsed = 0
    return
  }

  const equippedItemsJson = JSON.stringify(
    snapshot.equippedItems.slice(0, CHIRI_PRESENCE_CONFIG.maxEquippedItems)
  )
  const equippedMateId = snapshot.equippedMateId ?? ''
  const appearanceChanged =
    !lastPublished ||
    lastPublished.variantId !== snapshot.variantId ||
    lastPublished.equippedItemsJson !== equippedItemsJson ||
    lastPublished.equippedMateId !== equippedMateId ||
    lastPublished.animation !== snapshot.animation
  const transformChanged =
    !lastPublished ||
    positionChanged(lastPublished.position, snapshot.position) ||
    rotationChanged(lastPublished.rotation, snapshot.rotation)
  const heartbeatDue = heartbeatElapsed >= CHIRI_PRESENCE_CONFIG.heartbeatSeconds

  if (!appearanceChanged && !transformChanged && !heartbeatDue) return

  void sharedZoneRoom.send('liveChiriUpsert', {
    variantId: snapshot.variantId,
    equippedItemsJson,
    equippedMateId,
    position: snapshot.position,
    rotation: snapshot.rotation,
    animation: snapshot.animation
  })
  publishedVisible = true
  heartbeatElapsed = 0
  lastPublished = {
    variantId: snapshot.variantId,
    equippedItemsJson,
    equippedMateId,
    position: Vector3.create(
      snapshot.position.x,
      snapshot.position.y,
      snapshot.position.z
    ),
    rotation: Quaternion.create(
      snapshot.rotation.x,
      snapshot.rotation.y,
      snapshot.rotation.z,
      snapshot.rotation.w
    ),
    animation: snapshot.animation
  }
}

function updateRemoteChiris(dt: number): void {
  const alpha = Math.min(
    1,
    1 - Math.exp(-CHIRI_PRESENCE_CONFIG.interpolationSpeed * dt)
  )

  for (const runtime of remoteChiris.values()) {
    const transform = Transform.get(runtime.entity)
    const distanceSquared = Vector3.distanceSquared(
      transform.position,
      runtime.targetPosition
    )
    const position = distanceSquared > 64
      ? runtime.targetPosition
      : Vector3.lerp(transform.position, runtime.targetPosition, alpha)
    const rotation = Quaternion.slerp(
      transform.rotation,
      runtime.targetRotation,
      alpha
    )

    Transform.createOrReplace(runtime.entity, {
      position,
      rotation,
      scale: transform.scale
    })
  }
}

function updatePresence(dt: number): void {
  const viewerInsideZone = isInsideSharedZone(getPlayer()?.position ?? { x: 0, y: 0, z: 0 })
  if (viewerInsideZone && !viewerWasInsideZone) {
    requestSnapshot()
  }
  viewerWasInsideZone = viewerInsideZone

  publishLocalChiri(dt)
  updateRemoteChiris(dt)
}

export function initializeChiriPresenceClient(): void {
  if (initialized) return
  initialized = true

  sharedZoneRoom.onMessage('liveChiriSnapshot', data => {
    try {
      applySnapshot(JSON.parse(data.stateJson) as LiveChiriSnapshot)
    } catch (error) {
      console.error('CHIRI PRESENCE: invalid snapshot', error)
    }
  })

  sharedZoneRoom.onMessage('liveChiriChanged', data => {
    const ownerId = data.ownerId.trim().toLowerCase()
    if (!data.present) {
      removeRemoteChiri(ownerId)
      return
    }
    upsertRemoteChiri(stateFromChangedMessage(data))
  })

  sharedZoneRoom.onReady(ready => {
    roomReady = ready
    if (ready) {
      publishElapsed = CHIRI_PRESENCE_CONFIG.publishIntervalSeconds
      requestSnapshot()
    } else {
      publishedVisible = false
      lastPublished = undefined
      removeAllRemoteChiris()
    }
  })

  roomReady = sharedZoneRoom.isReady()
  viewerWasInsideZone = isInsideSharedZone(getPlayer()?.position ?? { x: 0, y: 0, z: 0 })
  if (roomReady) requestSnapshot()
  engine.addSystem(updatePresence)
}

export function getVisibleRemoteChiriCount(): number {
  return remoteChiris.size
}
