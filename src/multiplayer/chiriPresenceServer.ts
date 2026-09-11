import { engine } from '@dcl/sdk/ecs'
import { CHIRI_PRESENCE_CONFIG } from './chiriPresenceConfig'
import { sharedZoneRoom } from './sharedZoneProtocol'
import {
  LiveChiriSnapshot,
  LiveChiriState,
  LiveQuaternion,
  LiveVector3
} from './chiriPresenceTypes'

type ServerLiveChiriState = LiveChiriState & {
  lastSeenAt: number
}

const liveChiris = new Map<string, ServerLiveChiriState>()
let revision = 0
let initialized = false
let cleanupElapsed = 0

function getSender(context?: { from: string }): string | undefined {
  const sender = context?.from?.trim().toLowerCase()
  return sender || undefined
}

function isFiniteVector3(value: LiveVector3): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z)
}

function isFiniteQuaternion(value: LiveQuaternion): boolean {
  return (
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.z) &&
    Number.isFinite(value.w)
  )
}

function isInsideWorld(position: LiveVector3): boolean {
  const bounds = CHIRI_PRESENCE_CONFIG.bounds
  return (
    isFiniteVector3(position) &&
    position.x >= bounds.minX &&
    position.x <= bounds.maxX &&
    position.y >= bounds.minY &&
    position.y <= bounds.maxY &&
    position.z >= bounds.minZ &&
    position.z <= bounds.maxZ
  )
}

function sanitizeEquippedItems(json: string): string[] | undefined {
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return undefined

    return [...new Set(
      parsed
        .filter(item => typeof item === 'string')
        .map(item => item.trim())
        .filter(item => item.length > 0 && item.length <= CHIRI_PRESENCE_CONFIG.maxAccessoryIdLength)
    )].slice(0, CHIRI_PRESENCE_CONFIG.maxEquippedItems)
  } catch {
    return undefined
  }
}

function publicState(state: ServerLiveChiriState): LiveChiriState {
  return {
    ownerId: state.ownerId,
    variantId: state.variantId,
    equippedItems: state.equippedItems,
    equippedMateId: state.equippedMateId,
    position: state.position,
    rotation: state.rotation,
    animation: state.animation
  }
}

function sendChanged(state: LiveChiriState, present: boolean): void {
  void sharedZoneRoom.send('liveChiriChanged', {
    ownerId: state.ownerId,
    present,
    variantId: state.variantId,
    equippedItemsJson: JSON.stringify(state.equippedItems),
    equippedMateId: state.equippedMateId ?? '',
    position: state.position,
    rotation: state.rotation,
    animation: state.animation,
    revision
  })
}

function removePresence(ownerId: string): void {
  const previous = liveChiris.get(ownerId)
  if (!previous) return

  liveChiris.delete(ownerId)
  revision++
  sendChanged(publicState(previous), false)
}

function sendSnapshot(to: string): void {
  const snapshot: LiveChiriSnapshot = {
    revision,
    chiris: [...liveChiris.values()].map(publicState)
  }

  void sharedZoneRoom.send(
    'liveChiriSnapshot',
    { stateJson: JSON.stringify(snapshot) },
    { to: [to] }
  )
}

function cleanupStalePresence(dt: number): void {
  cleanupElapsed += dt
  if (cleanupElapsed < CHIRI_PRESENCE_CONFIG.serverCleanupIntervalSeconds) return
  cleanupElapsed = 0

  const expiresBefore =
    Date.now() - CHIRI_PRESENCE_CONFIG.serverTimeoutSeconds * 1000

  for (const [ownerId, state] of liveChiris) {
    if (state.lastSeenAt < expiresBefore) removePresence(ownerId)
  }
}

export function initializeChiriPresenceServer(): void {
  if (initialized) return
  initialized = true

  sharedZoneRoom.onMessage('liveChiriSnapshotRequest', (_data, context) => {
    const sender = getSender(context)
    if (sender) sendSnapshot(sender)
  })

  sharedZoneRoom.onMessage('liveChiriUpsert', (data, context) => {
    const sender = getSender(context)
    if (!sender) return

    const equippedItems = sanitizeEquippedItems(data.equippedItemsJson)
    if (
      !CHIRI_PRESENCE_CONFIG.allowedVariants.includes(data.variantId) ||
      !CHIRI_PRESENCE_CONFIG.allowedAnimations.includes(data.animation) ||
      !isInsideWorld(data.position) ||
      !isFiniteQuaternion(data.rotation) ||
      equippedItems === undefined ||
      data.equippedMateId.length > CHIRI_PRESENCE_CONFIG.maxAccessoryIdLength
    ) {
      return
    }

    const state: ServerLiveChiriState = {
      ownerId: sender,
      variantId: data.variantId,
      equippedItems,
      equippedMateId: data.equippedMateId || null,
      position: data.position,
      rotation: data.rotation,
      animation: data.animation,
      lastSeenAt: Date.now()
    }

    liveChiris.set(sender, state)
    revision++
    sendChanged(publicState(state), true)
  })

  sharedZoneRoom.onMessage('liveChiriRemove', (_data, context) => {
    const sender = getSender(context)
    if (sender) removePresence(sender)
  })

  engine.addSystem(cleanupStalePresence)
  console.log('CHIRI PRESENCE SERVER: ready')
}

export function hasLiveChiri(ownerId: string): boolean {
  return liveChiris.has(ownerId.trim().toLowerCase())
}
