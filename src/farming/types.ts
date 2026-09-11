
export interface Inventory {

  items: Record<string, number>

  itemOrder: string[]

}

export interface PlotData {

  cropId: string

  stage: 1 | 2

  plantedAt: number

}

export interface HouseVector3 {
  x: number
  y: number
  z: number
}

export interface HouseTransform {
  position: HouseVector3
  rotation: HouseVector3
  scale: HouseVector3
}

export interface HousePlanterState {
  cropId: string | null
  plantedAt: number | null
  stage: 0 | 1 | 2
}

export interface HouseFurniturePlacement {
  instanceId: string
  furnitureId: string
  sourceBoxId: string | null
  transform: HouseTransform
  // Movable pots keep their crop together with the furniture transform. The
  // planting interaction will be connected when the pot GLBs are available.
  planter: HousePlanterState | null
  // Stored furniture remains owned by the player, but is not rendered in the
  // house until a future inventory action places it again.
  stored: boolean
  // One-use world objects such as the Craftpack backpack remain in the saved
  // house history after being picked up, but must never render again.
  claimed: boolean
  // Shared furniture is rendered by the collaborative Void room, not by the
  // owner's private house, while still retaining its original ownership.
  sharedObjectId?: string | null
}

export type HouseVisibility = 'private' | 'public'

export interface ChiriCareState {
  stats: {
    friendship: number
    happy: number
    hungry: number
    bored: number
  }
  favoriteFoodId: string | null
  favoriteMateId: string | null
  foodTasteScores: Record<string, number>
  mateTasteScores: Record<string, number>
  worldEventCount: number
  // Server-independent UTC timestamp used to apply gradual care decay even
  // when the player leaves and returns later.
  lastCareUpdateAt: number
}

// This lives in its own Supabase JSONB column because furniture transforms can
// be saved much more often than story or inventory progress.
export interface PlayerHouse {
  version: 1
  visibility: HouseVisibility
  openedBoxIds: string[]
  furniture: Record<string, HouseFurniturePlacement>
  updatedAt: number
}

function createHouseVector3(x: number, y: number, z: number): HouseVector3 {
  return { x, y, z }
}

export function createDefaultPlayerHouse(): PlayerHouse {
  return {
    version: 1,
    visibility: 'private',
    openedBoxIds: [],
    furniture: {},
    updatedAt: Date.now()
  }
}

function normalizeHouseVector3(
  value: Partial<HouseVector3> | null | undefined,
  fallback: HouseVector3
): HouseVector3 {
  return {
    x: Number.isFinite(value?.x) ? Number(value?.x) : fallback.x,
    y: Number.isFinite(value?.y) ? Number(value?.y) : fallback.y,
    z: Number.isFinite(value?.z) ? Number(value?.z) : fallback.z
  }
}

export function normalizePlayerHouse(
  value: Partial<PlayerHouse> | null | undefined
): PlayerHouse {
  const defaults = createDefaultPlayerHouse()
  const furniture: Record<string, HouseFurniturePlacement> = {}

  for (const [instanceId, rawPlacement] of Object.entries(
    value?.furniture ?? {}
  )) {
    if (!rawPlacement?.furnitureId) continue

    furniture[instanceId] = {
      instanceId,
      furnitureId: rawPlacement.furnitureId,
      sourceBoxId: rawPlacement.sourceBoxId ?? null,
      transform: {
        position: normalizeHouseVector3(
          rawPlacement.transform?.position,
          createHouseVector3(0, 0, 0)
        ),
        rotation: normalizeHouseVector3(
          rawPlacement.transform?.rotation,
          createHouseVector3(0, 0, 0)
        ),
        scale: normalizeHouseVector3(
          rawPlacement.transform?.scale,
          createHouseVector3(1, 1, 1)
        )
      },
      planter: rawPlacement.planter
        ? {
            cropId: rawPlacement.planter.cropId ?? null,
            plantedAt: rawPlacement.planter.plantedAt ?? null,
            stage: rawPlacement.planter.stage ?? 0
          }
        : null,
      stored: rawPlacement.stored === true,
      claimed: rawPlacement.claimed === true,
      sharedObjectId: typeof rawPlacement.sharedObjectId === 'string'
        ? rawPlacement.sharedObjectId
        : null
    }
  }

  return {
    version: 1,
    visibility: value?.visibility === 'public' ? 'public' : 'private',
    openedBoxIds: Array.isArray(value?.openedBoxIds)
      ? [...new Set(value.openedBoxIds)]
      : defaults.openedBoxIds,
    furniture,
    updatedAt:
      typeof value?.updatedAt === 'number'
        ? value.updatedAt
        : defaults.updatedAt
  }
}

// Persistent per-player story data. New chapters, Chiri traits and comic
// pages can be added here without changing the existing inventory schema.
export interface PlayerProgress {
  version: 7
  story: {
    activeChapter: number
    completedMissionIds: string[]
    announcedMissionIds: string[]
    flags: Record<string, boolean>
    completedChapterIds: number[]
  }
  chiri: {
    // "Stored" is the future Chiri UI toggle. A stored companion is hidden
    // for its owner and is not published to any other player.
    stored: boolean
    activeVariant: string
    unlockedVariants: string[]
    equippedItems: string[]
    personalityTraits: Record<string, number>
    // Care bars and learned favorites belong to this player's Chiri. Taste
    // scores make preferences react to gameplay instead of using one global
    // hard-coded favorite for every user.
    care: ChiriCareState
    // Every Chiri Mecha piece is unique. The acquisition order feeds the
    // Collection tab until the sixth piece assembles the complete suit.
    mechaCollectedPartIds: string[]
    // Finding all parts completes the forest mission and assembles the skin.
    mechaCrafted: boolean
  }
  comic: {
    unlockedChapterIds: number[]
    pageOrderByChapter: Record<string, string[]>
  }
  collection: {
    // Spawn ids are saved per mate type, so every player can collect their own
    // copy of the same mate placed in the world.
    collectedMateSpawnIds: Record<string, number[]>
    ownedMateIds: string[]
    equippedMateId: string | null
  }
  leaderboard: {
    totalPoints: number
    pointsByActivity: Record<string, number>
  }
  daily: {
    // UTC calendar day. Counters reset independently of the device timezone.
    dayKey: string
    itemClaims: Record<string, number>
  }
}

function currentUtcDayKey() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeCareStat(value: unknown, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(100, Number(value)))
}

function normalizeTasteScores(value: Record<string, number> | null | undefined) {
  return Object.fromEntries(
    Object.entries(value ?? {})
      .filter(([itemId, score]) => itemId.length > 0 && Number.isFinite(score))
      .map(([itemId, score]) => [itemId, Math.max(0, Number(score))])
  )
}

export function createDefaultPlayerProgress(): PlayerProgress {
  return {
    version: 7,
    story: {
      activeChapter: 1,
      completedMissionIds: [],
      announcedMissionIds: [],
      flags: {},
      completedChapterIds: []
    },
    chiri: {
      stored: false,
      activeVariant: 'classic',
      unlockedVariants: ['classic'],
      equippedItems: [],
      personalityTraits: {},
      care: {
        stats: {
          friendship: 20,
          happy: 65,
          hungry: 30,
          bored: 25
        },
        favoriteFoodId: null,
        favoriteMateId: null,
        foodTasteScores: {},
        mateTasteScores: {},
        worldEventCount: 0,
        lastCareUpdateAt: Date.now()
      },
      mechaCollectedPartIds: [],
      mechaCrafted: false
    },
    comic: {
      unlockedChapterIds: [],
      pageOrderByChapter: {}
    },
    collection: {
      collectedMateSpawnIds: {},
      ownedMateIds: [],
      equippedMateId: null
    },
    leaderboard: {
      totalPoints: 0,
      pointsByActivity: {}
    },
    daily: {
      dayKey: currentUtcDayKey(),
      itemClaims: {}
    }
  }
}

// Existing players already have a progress JSON object in Supabase. This keeps
// all their story and Chiri data while supplying fields added in later updates.
export function normalizePlayerProgress(
  value: Partial<PlayerProgress> | null | undefined
): PlayerProgress {
  const defaults = createDefaultPlayerProgress()

  return {
    version: 7,
    story: {
      ...defaults.story,
      ...(value?.story ?? {}),
      flags: {
        ...defaults.story.flags,
        ...(value?.story?.flags ?? {})
      }
    },
    chiri: {
      ...defaults.chiri,
      ...(value?.chiri ?? {}),
      stored: value?.chiri?.stored === true,
      unlockedVariants:
        value?.chiri?.unlockedVariants ?? defaults.chiri.unlockedVariants,
      equippedItems:
        value?.chiri?.equippedItems ?? defaults.chiri.equippedItems,
      mechaCollectedPartIds:
        value?.chiri?.mechaCollectedPartIds ??
        defaults.chiri.mechaCollectedPartIds,
      mechaCrafted: value?.chiri?.mechaCrafted === true,
      personalityTraits: {
        ...defaults.chiri.personalityTraits,
        ...(value?.chiri?.personalityTraits ?? {})
      },
      care: {
        ...defaults.chiri.care,
        ...(value?.chiri?.care ?? {}),
        stats: {
          friendship: normalizeCareStat(
            value?.chiri?.care?.stats?.friendship,
            defaults.chiri.care.stats.friendship
          ),
          happy: normalizeCareStat(
            value?.chiri?.care?.stats?.happy,
            defaults.chiri.care.stats.happy
          ),
          hungry: normalizeCareStat(
            value?.chiri?.care?.stats?.hungry,
            defaults.chiri.care.stats.hungry
          ),
          bored: normalizeCareStat(
            value?.chiri?.care?.stats?.bored,
            defaults.chiri.care.stats.bored
          )
        },
        favoriteFoodId:
          typeof value?.chiri?.care?.favoriteFoodId === 'string'
            ? value.chiri.care.favoriteFoodId
            : null,
        favoriteMateId:
          typeof value?.chiri?.care?.favoriteMateId === 'string'
            ? value.chiri.care.favoriteMateId
            : null,
        foodTasteScores: normalizeTasteScores(
          value?.chiri?.care?.foodTasteScores
        ),
        mateTasteScores: normalizeTasteScores(
          value?.chiri?.care?.mateTasteScores
        ),
        worldEventCount:
          Number.isFinite(value?.chiri?.care?.worldEventCount) &&
          Number(value?.chiri?.care?.worldEventCount) > 0
            ? Math.floor(Number(value?.chiri?.care?.worldEventCount))
            : 0,
        lastCareUpdateAt:
          Number.isFinite(value?.chiri?.care?.lastCareUpdateAt) &&
          Number(value?.chiri?.care?.lastCareUpdateAt) > 0
            ? Number(value?.chiri?.care?.lastCareUpdateAt)
            : Date.now()
      }
    },
    comic: {
      ...defaults.comic,
      ...(value?.comic ?? {}),
      unlockedChapterIds:
        value?.comic?.unlockedChapterIds ?? defaults.comic.unlockedChapterIds,
      pageOrderByChapter: {
        ...defaults.comic.pageOrderByChapter,
        ...(value?.comic?.pageOrderByChapter ?? {})
      }
    },
    collection: {
      ...defaults.collection,
      ...(value?.collection ?? {}),
      collectedMateSpawnIds: {
        ...defaults.collection.collectedMateSpawnIds,
        ...(value?.collection?.collectedMateSpawnIds ?? {})
      },
      ownedMateIds:
        value?.collection?.ownedMateIds ?? defaults.collection.ownedMateIds
    },
    leaderboard: {
      ...defaults.leaderboard,
      ...(value?.leaderboard ?? {}),
      pointsByActivity: {
        ...defaults.leaderboard.pointsByActivity,
        ...(value?.leaderboard?.pointsByActivity ?? {})
      }
    },
    daily: {
      dayKey:
        typeof value?.daily?.dayKey === 'string' && value.daily.dayKey.length > 0
          ? value.daily.dayKey
          : defaults.daily.dayKey,
      itemClaims: Object.fromEntries(
        Object.entries(value?.daily?.itemClaims ?? {}).map(([itemId, count]) => [
          itemId,
          Number.isFinite(count) && Number(count) > 0 ? Math.floor(Number(count)) : 0
        ])
      )
    }
  }
}

export interface PlayerData {

  wallet: string

  inventory: Inventory

  plots: Record<number, PlotData | null>

  collected: Record<string, number[]>

  progress: PlayerProgress

  house: PlayerHouse

}

export interface SeedSpawn {

  id: number

  cropId: string

  x: number

  y: number

  z: number

  rotation: {
    x: number
    y: number
    z: number
  }

}

export interface FarmPlot {

  id: number

  x: number

  y: number

  z: number

}

export interface CropDefinition {

  id: string

  displayName: string

  seedItem: string

  cropItem: string

  growTime: number

  yieldMin: number

  yieldMax: number

  seedModel: string

  stage1Model: string

  stage2Model: string

}
