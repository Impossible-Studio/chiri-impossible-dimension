import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { sharedZoneRoom } from './sharedZoneProtocol'
import { SharedZoneClientState } from './sharedZoneTypes'

let initialized = false
let state: SharedZoneClientState = {
  enabled: false,
  revision: 0,
  chiris: [],
  objects: [],
  locks: []
}

const listeners = new Set<(nextState: SharedZoneClientState) => void>()

function publish(nextState: SharedZoneClientState): void {
  state = nextState
  for (const listener of listeners) listener(state)
}

function requestSnapshot(): void {
  void sharedZoneRoom.send('sharedZoneSnapshotRequest', {})
}

export function initializeSharedZoneClient(): void {
  if (initialized) return
  initialized = true

  sharedZoneRoom.onMessage('sharedZoneReady', data => {
    publish({ ...state, enabled: data.enabled })
    requestSnapshot()
  })

  sharedZoneRoom.onMessage('sharedZoneSnapshot', data => {
    try {
      const parsed = JSON.parse(data.stateJson) as SharedZoneClientState
      publish({
        enabled: Boolean(parsed.enabled),
        revision: Number(parsed.revision) || 0,
        chiris: Array.isArray(parsed.chiris) ? parsed.chiris : [],
        objects: Array.isArray(parsed.objects) ? parsed.objects : [],
        locks: Array.isArray(parsed.locks) ? parsed.locks : []
      })
    } catch (error) {
      console.error('SHARED ZONE CLIENT: invalid snapshot', error)
    }
  })

  sharedZoneRoom.onMessage('sharedChiriChanged', data => {
    const chiris = state.chiris.filter(chiri => chiri.ownerId !== data.ownerId)
    if (data.present) {
      chiris.push({
        ownerId: data.ownerId,
        variantId: data.variantId,
        position: data.position,
        rotationY: data.rotationY,
        behavior: data.behavior
      })
    }
    publish({ ...state, revision: data.revision, chiris })
  })

  sharedZoneRoom.onMessage('sharedObjectChanged', data => {
    const objects = state.objects.filter(object => object.objectId !== data.objectId)
    if (data.present) {
      objects.push({
        objectId: data.objectId,
        ownerId: data.ownerId,
        itemId: data.itemId,
        position: data.position,
        rotation: data.rotation,
        scale: data.scale,
        updatedBy: data.updatedBy
      })
    }
    publish({ ...state, revision: data.revision, objects })
  })

  sharedZoneRoom.onMessage('sharedObjectLockChanged', data => {
    const locks = state.locks.filter(lock => lock.objectId !== data.objectId)
    if (data.ownerId && data.expiresAt > 0) {
      locks.push({ objectId: data.objectId, ownerId: data.ownerId, expiresAt: data.expiresAt })
    }
    publish({ ...state, revision: data.revision, locks })
  })

  sharedZoneRoom.onMessage('sharedZoneError', data => {
    console.log(`SHARED ZONE: ${data.code} - ${data.message}`)
  })

  sharedZoneRoom.onReady(ready => {
    if (ready) requestSnapshot()
  })
}

export function getSharedZoneState(): SharedZoneClientState {
  return state
}

export function onSharedZoneStateChanged(listener: (nextState: SharedZoneClientState) => void): () => void {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

export function placeSharedChiri(
  variantId: string,
  position: Vector3,
  rotationY: number,
  behavior = 'wander'
): Promise<void> {
  return sharedZoneRoom.send('sharedChiriUpsert', { variantId, position, rotationY, behavior })
}

export function removeSharedChiri(): Promise<void> {
  return sharedZoneRoom.send('sharedChiriRemove', {})
}

export function requestSharedObjectLock(objectId: string): Promise<void> {
  return sharedZoneRoom.send('sharedObjectLockRequest', { objectId })
}

export function moveSharedObject(
  objectId: string,
  position: Vector3,
  rotation: Quaternion,
  scale: Vector3
): Promise<void> {
  return sharedZoneRoom.send('sharedObjectMove', { objectId, position, rotation, scale })
}

export function createSharedObject(
  objectId: string,
  itemId: string,
  position: Vector3,
  rotation: Quaternion,
  scale: Vector3
): Promise<void> {
  return sharedZoneRoom.send('sharedObjectCreate', { objectId, itemId, position, rotation, scale })
}

export function removeSharedObject(objectId: string): Promise<void> {
  return sharedZoneRoom.send('sharedObjectRemove', { objectId })
}

export function releaseSharedObjectLock(objectId: string): Promise<void> {
  return sharedZoneRoom.send('sharedObjectLockRelease', { objectId })
}
