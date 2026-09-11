import type { ChiriCareState, PlayerProgress } from '../farming/types'

export type ChiriCareStat = keyof ChiriCareState['stats']
export type ChiriWorldEvent =
  | 'plant'
  | 'harvest'
  | 'cook-food'
  | 'cook-mate'
  | 'find-mate'
  | 'feed'
  | 'give-mate'
  | 'play'

export const DEFAULT_CHIRI_CARE_STATS: ChiriCareState['stats'] = {
  friendship: 20,
  happy: 65,
  hungry: 30,
  bored: 25
}

export function createDefaultChiriCareState(): ChiriCareState {
  return {
    stats: { ...DEFAULT_CHIRI_CARE_STATS },
    favoriteFoodId: null,
    favoriteMateId: null,
    foodTasteScores: {},
    mateTasteScores: {},
    worldEventCount: 0,
    lastCareUpdateAt: Date.now()
  }
}

export const CHIRI_WORLD_EVENT_EFFECTS: Record<ChiriWorldEvent, {
  stats: Partial<Record<ChiriCareStat, number>>
  tasteKind?: 'food' | 'mate'
  tasteWeight?: number
}> = {
  plant: {
    stats: { friendship: 1, happy: 2, hungry: 1, bored: -2 },
    tasteKind: 'food',
    tasteWeight: 0.45
  },
  harvest: {
    stats: { friendship: 2, happy: 3, hungry: 2, bored: -3 },
    tasteKind: 'food',
    tasteWeight: 1
  },
  'cook-food': {
    stats: { friendship: 2, happy: 4, hungry: 4, bored: -2 },
    tasteKind: 'food',
    tasteWeight: 4
  },
  'cook-mate': {
    stats: { friendship: 2, happy: 3, hungry: 2, bored: -2 },
    tasteKind: 'mate',
    tasteWeight: 4
  },
  'find-mate': {
    stats: { friendship: 1, happy: 2, bored: -1 },
    tasteKind: 'mate',
    tasteWeight: 1.25
  },
  feed: {
    stats: { friendship: 4, happy: 6, hungry: -25, bored: -4 },
    tasteKind: 'food',
    tasteWeight: 7
  },
  'give-mate': {
    stats: { friendship: 5, happy: 6, hungry: -12, bored: -3 },
    tasteKind: 'mate',
    tasteWeight: 7
  },
  play: {
    stats: { friendship: 6, happy: 10, hungry: 3, bored: -30 }
  }
}

const PREPARED_MATE_TO_COLLECTION_ID: Record<string, string> = {
  prepared_mate_infinite: 'mate_matexito_infinito',
  prepared_mate_supersonic: 'mate_matexito_supersonico',
  prepared_mate_relique: 'mate_matexito_reliquia',
  prepared_mate_alchemist: 'mate_matexito_alchemist'
}

export function normalizeChiriMatePreferenceId(itemId: string) {
  return PREPARED_MATE_TO_COLLECTION_ID[itemId] ?? itemId
}

function clampStat(value: number) {
  return Math.max(0, Math.min(100, value))
}

function updateTaste(
  care: ChiriCareState,
  kind: 'food' | 'mate',
  itemId: string,
  weight: number,
  random: () => number
) {
  const normalizedId = kind === 'mate'
    ? normalizeChiriMatePreferenceId(itemId)
    : itemId
  const scores = kind === 'food' ? care.foodTasteScores : care.mateTasteScores
  const favoriteKey = kind === 'food' ? 'favoriteFoodId' : 'favoriteMateId'
  const randomFactor = 0.65 + Math.max(0, Math.min(1, random())) * 0.7
  scores[normalizedId] = (scores[normalizedId] ?? 0) + weight * randomFactor

  const currentFavorite = care[favoriteKey]
  const currentScore = currentFavorite ? (scores[currentFavorite] ?? 0) : -1
  if (!currentFavorite || scores[normalizedId] > currentScore) {
    care[favoriteKey] = normalizedId
  }
}

// World actions mutate the already-loaded PlayerProgress object. Their normal
// save path (plant, harvest, cook or mate pickup) persists the same snapshot,
// so favorites never require a second database table or an extra request.
export function recordChiriWorldEvent(
  progress: PlayerProgress,
  event: ChiriWorldEvent,
  itemId?: string,
  random: () => number = Math.random
) {
  const care = progress.chiri.care
  const effect = CHIRI_WORLD_EVENT_EFFECTS[event]
  for (const [stat, delta] of Object.entries(effect.stats) as Array<[ChiriCareStat, number]>) {
    care.stats[stat] = clampStat(care.stats[stat] + delta)
  }
  if (itemId && effect.tasteKind && effect.tasteWeight) {
    updateTaste(care, effect.tasteKind, itemId, effect.tasteWeight, random)
  }
  care.worldEventCount++
  care.lastCareUpdateAt = Date.now()
  return care
}

export type ChiriMood = 'happy' | 'sad' | 'hungry' | 'bored'

// Mood PNGs are independent layers. Hunger and boredom can therefore appear
// together with an emotional mood instead of one condition hiding the others.
export function chiriMoodsForCare(care: ChiriCareState): ChiriMood[] {
  const moods: ChiriMood[] = []
  const sad = care.stats.happy <= 25 || care.stats.friendship <= 10
  if (sad) moods.push('sad')
  else if (care.stats.happy >= 75 || care.stats.friendship >= 75) moods.push('happy')
  if (care.stats.hungry >= 75) moods.push('hungry')
  if (care.stats.bored >= 75) moods.push('bored')
  return moods
}

const CARE_DECAY_STEP_MS = 30 * 60 * 1_000

export function applyChiriCareDecay(care: ChiriCareState, now = Date.now()) {
  const lastUpdate = Number.isFinite(care.lastCareUpdateAt)
    ? care.lastCareUpdateAt
    : now
  const steps = Math.floor(Math.max(0, now - lastUpdate) / CARE_DECAY_STEP_MS)
  if (steps <= 0) {
    if (!Number.isFinite(care.lastCareUpdateAt)) care.lastCareUpdateAt = now
    return false
  }

  // Friendship fades slowest; hunger and boredom need attention sooner.
  care.stats.friendship = clampStat(care.stats.friendship - steps * 0.25)
  care.stats.happy = clampStat(care.stats.happy - steps * 0.5)
  care.stats.hungry = clampStat(care.stats.hungry + steps * 0.75)
  care.stats.bored = clampStat(care.stats.bored + steps)
  care.lastCareUpdateAt = lastUpdate + steps * CARE_DECAY_STEP_MS
  return true
}
