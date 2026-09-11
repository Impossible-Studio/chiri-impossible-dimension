import { getProgress, syncProgress } from '../farming/player'
import {
  addPointsToProgress,
  POINTS_CONFIG,
  type PointActivity
} from './pointsConfig'
import { submitLeaderboardEvent } from '../leaderboard/leaderboardClient'

export { POINTS_CONFIG, type PointActivity } from './pointsConfig'

export function awardPoints(
  activity: PointActivity,
  persist = true,
  eventReference = ''
): number {
  const progress = getProgress()
  const points = addPointsToProgress(progress, activity)

  // The local value keeps the HUD responsive. The official leaderboard is a
  // separate authoritative ledger: it receives no wallet and no point amount.
  submitLeaderboardEvent(activity, eventReference)

  if (persist) void syncProgress()
  return points
}

export function getTotalPoints(): number {
  return getProgress().leaderboard.totalPoints
}
