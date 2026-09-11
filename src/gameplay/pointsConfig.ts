import type { PlayerProgress } from '../farming/types'

// Central balancing table. Frequent repeatable actions stay small, while
// cooking, rare discoveries and complete missions are worth progressively more.
export const POINTS_CONFIG = {
  cookingSupplyCollected: 2,
  seedCollected: 5,
  mateCollected: 5,
  cropPlanted: 10,
  flowerCollected: 10,
  kitchenCheeseCollected: 15,
  cropHarvested: 25,
  foodPrepared: 30,
  chiriMechaPartCollected: 40,
  memoryCollected: 50,
  waterMachinePartCollected: 40,
  storyMissionCompleted: 75,
  magicMapCollected: 100,
  chiriMechaUnlocked: 200
} as const

export type PointActivity = keyof typeof POINTS_CONFIG

let onPointsChanged: () => void = () => {}

export function setPointsChangeListener(listener: () => void) {
  onPointsChanged = listener
}

export function notifyPointsChanged() {
  onPointsChanged()
}

export function addPointsToProgress(
  progress: PlayerProgress,
  activity: PointActivity
): number {
  const points = POINTS_CONFIG[activity]
  progress.leaderboard.totalPoints += points
  progress.leaderboard.pointsByActivity[activity] =
    (progress.leaderboard.pointsByActivity[activity] ?? 0) + points
  notifyPointsChanged()
  return points
}
