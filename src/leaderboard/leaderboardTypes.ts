import type { PointActivity } from '../gameplay/pointsConfig'

export type LeaderboardEntry = {
  wallet: string
  name: string
  periodPoints: number
  lifetimePoints: number
  updatedAt: number
}

export type LeaderboardSnapshot = {
  periodId: number
  startsAt: number
  endsAt: number
  entries: LeaderboardEntry[]
  ownLifetimePoints: number
  ownPeriodPoints: number
}

export type LeaderboardPlayerState = {
  version: 1
  wallet: string
  name: string
  lifetimePoints: number
  lifetimeCounts: Partial<Record<PointActivity, number>>
  periodId: number
  periodPoints: number
  periodCounts: Partial<Record<PointActivity, number>>
  dayId: number
  dayCounts: Partial<Record<PointActivity, number>>
  lastActivityAt: Partial<Record<PointActivity, number>>
  recentEventIds: string[]
  uniqueClaims: string[]
}

export type LeaderboardPeriodState = {
  version: 1
  periodId: number
  startsAt: number
  endsAt: number
  entries: LeaderboardEntry[]
}

