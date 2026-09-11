import { Storage } from '@dcl/sdk/server'
import { getPlayer } from '@dcl/sdk/players'
import { POINTS_CONFIG, type PointActivity } from '../gameplay/pointsConfig'
import { SEEDS } from '../farming/seedLocations'
import { FOREST_FLOWER_SPAWNS } from '../farming/flowerConfig'
import { CHIRI_MECHA_PART_IDS } from '../mecha/chiriMechaConfig'
import { MATE_TYPES } from '../mates/mateConfig'
import { getMateSpawns } from '../mates/mateLocations'
import {
  LEADERBOARD_ACTIVITY_POLICIES,
  LEADERBOARD_CONFIG
} from './leaderboardConfig'
import { leaderboardRoom } from './leaderboardProtocol'
import type {
  LeaderboardEntry,
  LeaderboardPeriodState,
  LeaderboardPlayerState,
  LeaderboardSnapshot
} from './leaderboardTypes'

const DAY_MS = 24 * 60 * 60 * 1_000
const PERIOD_MS = LEADERBOARD_CONFIG.periodDays * DAY_MS
const FIRST_PERIOD_MS = Date.parse(LEADERBOARD_CONFIG.firstPeriodStartsAt)
const RECENT_EVENT_LIMIT = 256
const WALLET_PATTERN = /^0x[0-9a-f]{40}$/
const VALID_SEED_REFERENCES = new Set(SEEDS.map(seed => `${seed.cropId}:${seed.id}`))
const VALID_FLOWER_REFERENCES = new Set(
  FOREST_FLOWER_SPAWNS.map(spawn => `${spawn.flowerId}:${spawn.id}`)
)
const VALID_MATE_REFERENCES = new Set(
  MATE_TYPES.flatMap(mate => getMateSpawns(mate).map(spawn => `${mate.id}:${spawn.id}`))
)
const VALID_MECHA_REFERENCES = new Set<string>(CHIRI_MECHA_PART_IDS)

let initialized = false
let currentPeriod: LeaderboardPeriodState | undefined
let operationQueue: Promise<void> = Promise.resolve()

function queueOperation(operation: () => Promise<void>): void {
  operationQueue = operationQueue
    .catch(error => console.error('LEADERBOARD: previous operation failed', error))
    .then(operation)
    .catch(error => console.error('LEADERBOARD: operation failed', error))
}

function periodInfo(now: number) {
  const periodId = Math.max(0, Math.floor((now - FIRST_PERIOD_MS) / PERIOD_MS))
  const startsAt = FIRST_PERIOD_MS + periodId * PERIOD_MS
  return { periodId, startsAt, endsAt: startsAt + PERIOD_MS }
}

function periodStorageKey(periodId: number): string {
  return `${LEADERBOARD_CONFIG.periodStoragePrefix}${periodId}`
}

function normalizeWallet(value: string | undefined): string | undefined {
  const wallet = value?.trim().toLowerCase()
  return wallet && WALLET_PATTERN.test(wallet) ? wallet : undefined
}

function sanitizeName(value: string | undefined, wallet: string): string {
  const cleaned = (value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24)
  return cleaned || `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
}

function playerNameFromConnection(wallet: string, fallback: string): string {
  // On the authoritative server this player record comes from the authenticated
  // connection, not from an arbitrary wallet included by a client.
  const connectedPlayer = getPlayer({ userId: wallet })
  return sanitizeName(connectedPlayer?.name ?? fallback, wallet)
}

function isPointActivity(value: string): value is PointActivity {
  return Object.prototype.hasOwnProperty.call(POINTS_CONFIG, value)
}

function defaultPlayerState(wallet: string, name: string, now: number): LeaderboardPlayerState {
  const { periodId } = periodInfo(now)
  return {
    version: 1,
    wallet,
    name,
    lifetimePoints: 0,
    lifetimeCounts: {},
    periodId,
    periodPoints: 0,
    periodCounts: {},
    dayId: Math.floor(now / DAY_MS),
    dayCounts: {},
    lastActivityAt: {},
    recentEventIds: [],
    uniqueClaims: []
  }
}

function repairPlayerState(
  stored: LeaderboardPlayerState | null,
  wallet: string,
  name: string,
  now: number
): LeaderboardPlayerState {
  const fallback = defaultPlayerState(wallet, name, now)
  if (!stored || stored.version !== 1 || stored.wallet !== wallet) return fallback

  return {
    ...fallback,
    ...stored,
    wallet,
    name,
    lifetimePoints: Math.max(0, Number(stored.lifetimePoints) || 0),
    lifetimeCounts: stored.lifetimeCounts ?? {},
    periodCounts: stored.periodCounts ?? {},
    dayCounts: stored.dayCounts ?? {},
    lastActivityAt: stored.lastActivityAt ?? {},
    recentEventIds: Array.isArray(stored.recentEventIds)
      ? stored.recentEventIds.slice(-RECENT_EVENT_LIMIT)
      : [],
    uniqueClaims: Array.isArray(stored.uniqueClaims) ? stored.uniqueClaims : []
  }
}

function resetRollingCounters(player: LeaderboardPlayerState, now: number): void {
  const { periodId } = periodInfo(now)
  if (player.periodId !== periodId) {
    player.periodId = periodId
    player.periodPoints = 0
    player.periodCounts = {}
  }

  const dayId = Math.floor(now / DAY_MS)
  if (player.dayId !== dayId) {
    player.dayId = dayId
    player.dayCounts = {}
  }
}

function validPeriodState(value: LeaderboardPeriodState | null, expectedId: number): value is LeaderboardPeriodState {
  return Boolean(
    value &&
    value.version === 1 &&
    value.periodId === expectedId &&
    Array.isArray(value.entries)
  )
}

async function ensureCurrentPeriod(now: number): Promise<LeaderboardPeriodState> {
  const info = periodInfo(now)
  if (currentPeriod?.periodId === info.periodId) return currentPeriod

  const stored = await Storage.get<LeaderboardPeriodState>(periodStorageKey(info.periodId))
  currentPeriod = validPeriodState(stored, info.periodId)
    ? {
        ...stored,
        startsAt: info.startsAt,
        endsAt: info.endsAt,
        entries: stored.entries.filter(entry => normalizeWallet(entry.wallet) !== undefined)
      }
    : { version: 1, ...info, entries: [] }
  return currentPeriod
}

function sortedEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) =>
    b.periodPoints - a.periodPoints ||
    a.updatedAt - b.updatedAt ||
    a.wallet.localeCompare(b.wallet)
  )
}

function upsertPeriodEntry(period: LeaderboardPeriodState, player: LeaderboardPlayerState, now: number): void {
  const entry: LeaderboardEntry = {
    wallet: player.wallet,
    name: player.name,
    periodPoints: player.periodPoints,
    lifetimePoints: player.lifetimePoints,
    updatedAt: now
  }
  const withoutPlayer = period.entries.filter(item => item.wallet !== player.wallet)
  withoutPlayer.push(entry)
  period.entries = sortedEntries(withoutPlayer).slice(0, LEADERBOARD_CONFIG.storedCandidateCount)
}

function makeSnapshot(
  period: LeaderboardPeriodState,
  player?: LeaderboardPlayerState
): LeaderboardSnapshot {
  return {
    periodId: period.periodId,
    startsAt: period.startsAt,
    endsAt: period.endsAt,
    entries: sortedEntries(period.entries).slice(0, LEADERBOARD_CONFIG.topSize),
    ownLifetimePoints: player?.lifetimePoints ?? 0,
    ownPeriodPoints: player?.periodPoints ?? 0
  }
}

function sendSnapshot(to: string | undefined, period: LeaderboardPeriodState, player?: LeaderboardPlayerState): void {
  const options = to ? { to: [to] } : undefined
  void leaderboardRoom.send(
    'leaderboardSnapshot',
    { stateJson: JSON.stringify(makeSnapshot(period, player)) },
    options
  )
}

function sendResult(
  to: string,
  activity: string,
  eventId: string,
  player: LeaderboardPlayerState,
  accepted: boolean,
  reason: string,
  awardedPoints = 0
): void {
  void leaderboardRoom.send(
    'leaderboardEventResult',
    {
      accepted,
      reason,
      activity,
      eventId,
      awardedPoints,
      lifetimePoints: player.lifetimePoints,
      periodPoints: player.periodPoints
    },
    { to: [to] }
  )
}

function rejectionReason(
  player: LeaderboardPlayerState,
  activity: PointActivity,
  eventId: string,
  eventReference: string,
  now: number
): string | undefined {
  if (!/^[a-zA-Z0-9:_-]{8,120}$/.test(eventId)) return 'invalid-event-id'
  if (player.recentEventIds.includes(eventId)) return 'duplicate-event'

  const policy = LEADERBOARD_ACTIVITY_POLICIES[activity]
  const lastAt = player.lastActivityAt[activity] ?? 0
  if (now - lastAt < policy.minIntervalMs) return 'action-too-fast'
  if ((player.dayCounts[activity] ?? 0) >= policy.maxPerDay) return 'daily-limit'
  if ((player.periodCounts[activity] ?? 0) >= policy.maxPerPeriod) return 'period-limit'
  if (
    policy.maxLifetime !== undefined &&
    (player.lifetimeCounts[activity] ?? 0) >= policy.maxLifetime
  ) {
    return 'lifetime-limit'
  }

  if (policy.requiresUniqueReference) {
    if (!eventReference || eventReference.length > 100) return 'unique-reference-required'
    if (!uniqueReferenceIsAllowed(activity, eventReference, now)) return 'invalid-reference'
    if (player.uniqueClaims.includes(`${activity}:${eventReference}`)) return 'already-claimed'
  }
  if (
    activity === 'chiriMechaUnlocked' &&
    (player.lifetimeCounts.chiriMechaPartCollected ?? 0) < CHIRI_MECHA_PART_IDS.length
  ) {
    return 'missing-mecha-parts'
  }
  return undefined
}

function uniqueReferenceIsAllowed(
  activity: PointActivity,
  reference: string,
  now: number
): boolean {
  if (activity === 'seedCollected') return VALID_SEED_REFERENCES.has(reference)
  if (activity === 'flowerCollected') return VALID_FLOWER_REFERENCES.has(reference)
  if (activity === 'mateCollected') return VALID_MATE_REFERENCES.has(reference)
  if (activity === 'chiriMechaPartCollected') return VALID_MECHA_REFERENCES.has(reference)
  if (activity === 'memoryCollected') return /^memory-(?:[1-9]|1[0-2])$/.test(reference)
  if (activity === 'waterMachinePartCollected') return /^machine-part-[1-5]$/.test(reference)
  if (activity === 'kitchenCheeseCollected') return reference === 'kitchen-cheese'
  if (activity === 'magicMapCollected') return reference === 'magic-map'
  if (activity === 'chiriMechaUnlocked') return reference === 'chiri-mecha'
  if (activity === 'storyMissionCompleted') {
    return /^chapter-\d+-mission-\d+-[a-z0-9-]+$/.test(reference)
  }
  if (activity === 'cookingSupplyCollected') {
    const currentDay = new Date(now).toISOString().slice(0, 10)
    return new RegExp(`^${currentDay}:(pizza_dough|yerba):(10|[1-9])$`).test(reference)
  }
  return true
}

async function loadPlayer(wallet: string, name: string, now: number): Promise<LeaderboardPlayerState> {
  const stored = await Storage.player.get<LeaderboardPlayerState>(
    wallet,
    LEADERBOARD_CONFIG.playerStorageKey
  )
  const player = repairPlayerState(stored, wallet, name, now)
  resetRollingCounters(player, now)
  return player
}

async function handleSnapshotRequest(wallet: string, suppliedName: string): Promise<void> {
  const now = Date.now()
  const name = playerNameFromConnection(wallet, suppliedName)
  const [period, player] = await Promise.all([
    ensureCurrentPeriod(now),
    loadPlayer(wallet, name, now)
  ])

  if (player.name !== name) player.name = name
  // Joining the scene registers the authenticated player at zero points. The
  // board is therefore never visually empty, while only validated gameplay
  // events are still allowed to increase the score.
  upsertPeriodEntry(period, player, now)
  await Promise.all([
    Storage.player.set(wallet, LEADERBOARD_CONFIG.playerStorageKey, player),
    Storage.set(periodStorageKey(period.periodId), period)
  ])
  sendSnapshot(wallet, period, player)
  sendSnapshot(undefined, period)
}

async function handleEvent(
  wallet: string,
  suppliedName: string,
  activityValue: string,
  eventId: string,
  eventReferenceValue: string
): Promise<void> {
  const now = Date.now()
  const name = playerNameFromConnection(wallet, suppliedName)
  const [period, player] = await Promise.all([
    ensureCurrentPeriod(now),
    loadPlayer(wallet, name, now)
  ])
  player.name = name

  if (!isPointActivity(activityValue)) {
    sendResult(wallet, activityValue, eventId, player, false, 'unknown-activity')
    return
  }

  const eventReference = eventReferenceValue.trim().slice(0, 100)
  const rejected = rejectionReason(player, activityValue, eventId, eventReference, now)
  if (rejected) {
    sendResult(wallet, activityValue, eventId, player, false, rejected)
    return
  }

  const points = POINTS_CONFIG[activityValue]
  player.lifetimePoints += points
  player.periodPoints += points
  player.lifetimeCounts[activityValue] = (player.lifetimeCounts[activityValue] ?? 0) + 1
  player.periodCounts[activityValue] = (player.periodCounts[activityValue] ?? 0) + 1
  player.dayCounts[activityValue] = (player.dayCounts[activityValue] ?? 0) + 1
  player.lastActivityAt[activityValue] = now
  player.recentEventIds.push(eventId)
  player.recentEventIds = player.recentEventIds.slice(-RECENT_EVENT_LIMIT)
  if (LEADERBOARD_ACTIVITY_POLICIES[activityValue].requiresUniqueReference) {
    player.uniqueClaims.push(`${activityValue}:${eventReference}`)
  }

  upsertPeriodEntry(period, player, now)
  const [playerSaved, periodSaved] = await Promise.all([
    Storage.player.set(wallet, LEADERBOARD_CONFIG.playerStorageKey, player),
    Storage.set(periodStorageKey(period.periodId), period)
  ])

  if (!playerSaved || !periodSaved) {
    // Do not claim success if durable authoritative storage did not confirm it.
    sendResult(wallet, activityValue, eventId, player, false, 'storage-error')
    return
  }

  sendResult(wallet, activityValue, eventId, player, true, '', points)
  sendSnapshot(wallet, period, player)
  sendSnapshot(undefined, period)
}

export function initializeLeaderboardServer(): void {
  if (initialized) return
  initialized = true

  leaderboardRoom.onMessage('leaderboardSnapshotRequest', (data, context) => {
    const wallet = normalizeWallet(context?.from)
    if (!wallet) return
    queueOperation(() => handleSnapshotRequest(wallet, data.playerName))
  })

  leaderboardRoom.onMessage('leaderboardEvent', (data, context) => {
    const wallet = normalizeWallet(context?.from)
    if (!wallet) return
    queueOperation(() => handleEvent(
      wallet,
      data.playerName,
      data.activity,
      data.eventId,
      data.eventReference
    ))
  })

  queueOperation(async () => {
    await ensureCurrentPeriod(Date.now())
    console.log('LEADERBOARD SERVER: authoritative biweekly ranking ready')
  })
}
