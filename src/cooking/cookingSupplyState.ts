import type { PlayerProgress } from '../farming/types'

export type DailyCookingSupplyId = 'pizza_dough' | 'yerba'

export function getUtcDayKey(now = Date.now()) {
  const safeNow = Number.isFinite(now) ? now : Date.now()
  return new Date(safeNow).toISOString().slice(0, 10)
}

function resetExpiredDailyClaims(progress: PlayerProgress, now: number) {
  const dayKey = getUtcDayKey(now)
  if (progress.daily.dayKey !== dayKey) {
    progress.daily.dayKey = dayKey
    progress.daily.itemClaims = {}
  }
}

export function claimDailyCookingSupply(
  progress: PlayerProgress,
  itemId: DailyCookingSupplyId,
  limit: number,
  now = Date.now()
) {
  resetExpiredDailyClaims(progress, now)
  const safeLimit = Math.max(0, Math.floor(limit))
  const current = Math.max(0, Math.floor(progress.daily.itemClaims[itemId] ?? 0))
  if (current >= safeLimit) {
    return { granted: false, count: current, remaining: 0 }
  }

  const count = current + 1
  progress.daily.itemClaims[itemId] = count
  return { granted: true, count, remaining: safeLimit - count }
}

export function getDailyCookingSupplyCount(
  progress: PlayerProgress,
  itemId: DailyCookingSupplyId,
  now = Date.now()
) {
  resetExpiredDailyClaims(progress, now)
  return Math.max(0, Math.floor(progress.daily.itemClaims[itemId] ?? 0))
}
