import type { PointActivity } from '../gameplay/pointsConfig'

export const LEADERBOARD_CONFIG = {
  // A new competition starts automatically every 14 days from this UTC date.
  // Changing this date later changes the boundaries of every period, so keep it
  // stable once the leaderboard is published.
  firstPeriodStartsAt: '2026-09-11T00:00:00.000Z',
  periodDays: 14,
  topSize: 20,
  storedCandidateCount: 100,
  playerStorageKey: 'impossible-dimension:leaderboard:player:v1',
  periodStoragePrefix: 'impossible-dimension:leaderboard:period:v1:',
  frameEntityName: 'leaderboard_frame.glb',
  frameModelPath: 'assets/Models/leaderboard_frame/leaderboard_frame.glb',
  framePosition: { x: 316.75, y: 34.75, z: 393.75 },
  frameRotationY: 90,
  // These measurements come from "plano datos leaderboard" in the supplied
  // Blender file. The plane itself was only a guide and is not rendered.
  panel: {
    // Blender's reference plane was exported with its axes exchanged. In the
    // world the narrow value is the width and the long value is the height.
    position: { x: 0.0009, y: -0.0053, z: -0.018 },
    width: 7.8795,
    height: 9.9023,
    backgroundColor: { r: 0.985, g: 0.74, b: 0.86, a: 1 },
    textColor: { r: 0.07, g: 0.12, b: 0.31, a: 1 }
  }
} as const

export type LeaderboardActivityPolicy = {
  minIntervalMs: number
  maxPerDay: number
  maxPerPeriod: number
  maxLifetime?: number
  requiresUniqueReference?: boolean
}

// The client never supplies point values. It can only request one of these
// actions; the authoritative scene server applies these limits and the values
// from POINTS_CONFIG.
export const LEADERBOARD_ACTIVITY_POLICIES: Record<PointActivity, LeaderboardActivityPolicy> = {
  cookingSupplyCollected: {
    minIntervalMs: 350,
    maxPerDay: 20,
    maxPerPeriod: 280,
    requiresUniqueReference: true
  },
  seedCollected: {
    minIntervalMs: 250,
    maxPerDay: 500,
    maxPerPeriod: 7_000,
    requiresUniqueReference: true
  },
  mateCollected: {
    minIntervalMs: 250,
    maxPerDay: 200,
    maxPerPeriod: 2_800,
    requiresUniqueReference: true
  },
  cropPlanted: { minIntervalMs: 750, maxPerDay: 200, maxPerPeriod: 2_800 },
  flowerCollected: {
    minIntervalMs: 250,
    maxPerDay: 300,
    maxPerPeriod: 4_200,
    requiresUniqueReference: true
  },
  kitchenCheeseCollected: {
    minIntervalMs: 1_000,
    maxPerDay: 1,
    maxPerPeriod: 1,
    maxLifetime: 1,
    requiresUniqueReference: true
  },
  cropHarvested: { minIntervalMs: 750, maxPerDay: 200, maxPerPeriod: 2_800 },
  foodPrepared: { minIntervalMs: 2_000, maxPerDay: 100, maxPerPeriod: 1_400 },
  chiriMechaPartCollected: {
    minIntervalMs: 1_000,
    maxPerDay: 6,
    maxPerPeriod: 6,
    maxLifetime: 6,
    requiresUniqueReference: true
  },
  memoryCollected: {
    minIntervalMs: 1_000,
    maxPerDay: 12,
    maxPerPeriod: 12,
    maxLifetime: 12,
    requiresUniqueReference: true
  },
  waterMachinePartCollected: {
    minIntervalMs: 1_000,
    maxPerDay: 5,
    maxPerPeriod: 5,
    maxLifetime: 5,
    requiresUniqueReference: true
  },
  storyMissionCompleted: {
    minIntervalMs: 1_000,
    maxPerDay: 10,
    maxPerPeriod: 30,
    maxLifetime: 30,
    requiresUniqueReference: true
  },
  magicMapCollected: {
    minIntervalMs: 1_000,
    maxPerDay: 1,
    maxPerPeriod: 1,
    maxLifetime: 1,
    requiresUniqueReference: true
  },
  chiriMechaUnlocked: {
    minIntervalMs: 1_000,
    maxPerDay: 1,
    maxPerPeriod: 1,
    maxLifetime: 1,
    requiresUniqueReference: true
  }
}
