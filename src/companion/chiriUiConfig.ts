export type ChiriUiTab = 'cloth' | 'feed-play' | 'memories-collection'
export type ChiriFeedPlayGroup = 'feed' | 'play'
export type ChiriArchiveGroup = 'memories' | 'collection'

export type ChiriUiRect = {
  x: number
  y: number
  width: number
  height: number
}

export type ChiriUiPoint = {
  x: number
  y: number
}

const ROOT = 'assets/scene/ui/chiri/chiri ui'

export const CHIRI_UI_ART = {
  background: `${ROOT}/chiri_background.png`,
  mask: `${ROOT}/chiri_mask.png`,
  tabsClosed: `${ROOT}/botones_tab_closed.png`,
  tabsOpen: `${ROOT}/botones_tab_open.png`,
  tabsOpenMask: `${ROOT}/botones_tab_open_mask.png`,
  followMe: `${ROOT}/follow me.png`,
  showChiri: `${ROOT}/show chiri.png`,
  favorites: `${ROOT}/food y mate favs.png`,
  moodHappy: `${ROOT}/MOOD happy.png`,
  moodSad: `${ROOT}/MOOD sad.png`,
  moodHungry: `${ROOT}/MOOD hungry.png`,
  moodBored: `${ROOT}/MOOD bored.png`,
  clothBase: `${ROOT}/chiri_base_cloth.png`,
  tab1: `${ROOT}/tab1_background.png`,
  tab2: `${ROOT}/tab2_background.png`,
  tab3: `${ROOT}/tab3_background.png`,
  mini: `${ROOT}/mini chiri ui.png`,
  lockedItem: `${ROOT}/locked_item.png`,
  mechaSkinPreview: `${ROOT}/tab1/cloth/skins/skin_chiri_mecha.png`
} as const

export const CHIRI_GLOW_ART = {
  clothPrevious: `${ROOT}/glow/tab1/tab1_flecha_left_glow.png`,
  clothNext: `${ROOT}/glow/tab1/tab1_flecha_right_glow.png`,
  clothItems: [1, 2, 3, 4, 5, 6].map(
    number => `${ROOT}/glow/tab1/tab1_item${number}_glow.png`
  ),
  feedPlayPrevious: `${ROOT}/glow/tab2/tab2_flecha_left_glow.png`,
  feedPlayNext: `${ROOT}/glow/tab2/tab2_flecha_right_glow.png`,
  feedZone: `${ROOT}/glow/tab2/zona_feed_glow.png`,
  playZone: `${ROOT}/glow/tab2/zona_play_glow.png`,
  feedPlayCenter: `${ROOT}/glow/tab2/centro_select_glow.png`,
  archivePrevious: `${ROOT}/glow/tab3/tab3_flecha_left_glow.png`,
  archiveNext: `${ROOT}/glow/tab3/tab3_flecha_right_glow.png`,
  memoriesZone: `${ROOT}/glow/tab3/memories_glow.png`,
  collectionZone: `${ROOT}/glow/tab3/collection_glow.png`,
  archiveItems: Array.from(
    { length: 12 },
    (_, index) => `${ROOT}/glow/tab3/tab3_item${index + 1}_glow.png`
  )
} as const

export const CHIRI_ACTIVE_ART = {
  clothApply: `${ROOT}/active/tab1/tab1_apply_active.png`
} as const

export const CHIRI_UI_SOURCE_SIZE = 1254
export const CHIRI_MINI_SOURCE_SIZE = { width: 1312, height: 1199 } as const

const ITEM_SLOT_ROOT = 'assets/scene/ui/inventory/items/item slots background'

export const CHIRI_ITEM_BACKGROUNDS = {
  lavender: `${ITEM_SLOT_ROOT}/lavender_oven.png`,
  orange: `${ITEM_SLOT_ROOT}/orange.png`,
  blue: `${ITEM_SLOT_ROOT}/blue_oven.png`
} as const

export const CHIRI_FAVORITE_MATE_ICONS: Record<string, string> = {
  mate_matexito_infinito: 'assets/scene/ui/inventory/items/mates/mate_infinite_only.png',
  mate_matexito_supersonico: 'assets/scene/ui/inventory/items/mates/mate_supersonic_only.png',
  mate_matexito_reliquia: 'assets/scene/ui/inventory/items/mates/mate_relique_only.png',
  mate_matexito_alchemist: 'assets/scene/ui/inventory/items/mates/mate_alchemist_only.png'
}

export const CHIRI_MEMORY_ICONS: Record<string, string> = Object.fromEntries(
  Array.from({ length: 12 }, (_, index) => [
    `chiri-memory-${index + 1}`,
    `${ROOT}/memories_items/${index + 1}.png`
  ])
)

// All coordinates stay in the original 1254x1254 art space. The complete UI
// scale below then moves and resizes backgrounds, item art and hitboxes as one.
export const CHIRI_ITEM_CENTERS = {
  favorites: [
    { x: 807.5, y: 947 },
    { x: 959.5, y: 947 }
  ],
  cloth: [
    { x: 237.5, y: 905 }, { x: 372.5, y: 905 }, { x: 507.5, y: 905 },
    { x: 237.5, y: 1041 }, { x: 372.5, y: 1041 }, { x: 507.5, y: 1041 }
  ],
  feed: [
    { x: 232.5, y: 645 }, { x: 371.5, y: 645 }, { x: 510.5, y: 645 }
  ],
  play: [
    { x: 237.5, y: 1045 }, { x: 375.5, y: 1045 }, { x: 513.5, y: 1045 }
  ],
  feedPlayCenter: [{ x: 370.5, y: 840 }],
  archive: [
    { x: 222.5, y: 644 }, { x: 323.5, y: 644 }, { x: 425.5, y: 644 }, { x: 528.5, y: 644 },
    { x: 222.5, y: 745 }, { x: 323.5, y: 745 }, { x: 425.5, y: 745 }, { x: 528.5, y: 745 },
    { x: 222.5, y: 845 }, { x: 323.5, y: 845 }, { x: 425.5, y: 845 }, { x: 528.5, y: 845 }
  ]
} as const satisfies Record<string, readonly ChiriUiPoint[]>

// Independent size controls requested for every item group. backgroundSize is
// the slot height (its 196:205 source ratio is preserved); itemSize is square.
export const CHIRI_ITEM_SIZE_CONTROLS = {
  favorites: { backgroundSize: 120, itemSize: 81 },
  cloth: { backgroundSize: 112, itemSize: 76 },
  feed: { backgroundSize: 114, itemSize: 79 },
  play: { backgroundSize: 114, itemSize: 79 },
  feedPlayCenter: { backgroundSize: 108, itemSize: 74 },
  memories: { backgroundSize: 88, itemSize: 58 },
  collection: { backgroundSize: 88, itemSize: 58 }
} as const

export const CHIRI_STATUS_BAR_LAYOUT = {
  minX: 803.1,
  maxX: 1097,
  y: {
    friendship: 590.3,
    happy: 668,
    hungry: 747.2,
    bored: 824.2
  },
  dotCount: 13,
  dotSize: 7,
  markerSize: 50,
  markerBorderWidth: 4,
  // Levels 0 and 12 use the face drawings printed in the background. Levels
  // 1 and 11 are skipped so the marker jumps directly to/from each end face.
  markerLevelIndexes: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]
} as const

// The scale is the single total-size control for the complete 1254x1254 UI.
// It is capped automatically when a viewport is smaller than the chosen size.
export const CHIRI_UI_LAYOUT = {
  screenPadding: 8,
  backdropOpacity: 0.52,
  desktop: { scale: 0.79, offsetX: 0, offsetY: -4 },
  mobile: { scale: 0.62, offsetX: 0, offsetY: 0 },
  miniDesktop: { size: 140, top: 23, right: 400 },
  miniMobile: { size: 140, top: 23, right: 730 }
} as const

export function chiriUiScale(
  mobile: boolean,
  viewportWidth?: number,
  viewportHeight?: number
) {
  const target = CHIRI_UI_LAYOUT[mobile ? 'mobile' : 'desktop'].scale
  if (
    !viewportWidth || !viewportHeight ||
    viewportWidth <= 0 || viewportHeight <= 0
  ) {
    return target
  }

  return Math.max(0.01, Math.min(
    target,
    (viewportWidth - CHIRI_UI_LAYOUT.screenPadding * 2) / CHIRI_UI_SOURCE_SIZE,
    (viewportHeight - CHIRI_UI_LAYOUT.screenPadding * 2) / CHIRI_UI_SOURCE_SIZE
  ))
}

// Regions extracted mechanically from the solid colors in chiri_mask.png.
export const CHIRI_MAIN_MASK_REGIONS = {
  TAB_CLOTH_CLOSED: { x: 500, y: 528, width: 114, height: 212 },
  TAB_FEED_PLAY_CLOSED: { x: 501, y: 742, width: 107, height: 198 },
  TAB_MEMORIES_CLOSED: { x: 505, y: 944, width: 114, height: 202 },
  FREE_FOLLOW: { x: 650, y: 1034, width: 153, height: 117 },
  TALK: { x: 816, y: 1038, width: 141, height: 118 },
  HIDE_SHOW: { x: 970, y: 1034, width: 160, height: 118 },
  TOGGLE_TABS: { x: 1173, y: 608, width: 69, height: 148 }
} as const satisfies Record<string, ChiriUiRect>

// Regions extracted from botones_tab_open_mask.png.
export const CHIRI_OPEN_TAB_MASK_REGIONS = {
  TAB_CLOTH: { x: 39, y: 535, width: 115, height: 207 },
  TAB_FEED_PLAY: { x: 37, y: 745, width: 105, height: 196 },
  TAB_MEMORIES: { x: 38, y: 943, width: 112, height: 206 }
} as const satisfies Record<string, ChiriUiRect>

export const CHIRI_CLOTH_MASK_REGIONS = {
  APPLY: { x: 444, y: 585, width: 132, height: 69 },
  PREVIOUS: { x: 168, y: 683, width: 95, height: 99 },
  NEXT: { x: 472, y: 683, width: 97, height: 99 },
  ITEM_1: { x: 183, y: 849, width: 109, height: 112 },
  ITEM_2: { x: 318, y: 849, width: 109, height: 112 },
  ITEM_3: { x: 453, y: 849, width: 109, height: 112 },
  ITEM_4: { x: 183, y: 985, width: 109, height: 112 },
  ITEM_5: { x: 318, y: 985, width: 109, height: 112 },
  ITEM_6: { x: 453, y: 985, width: 109, height: 112 }
} as const satisfies Record<string, ChiriUiRect>

export const CHIRI_FEED_PLAY_MASK_REGIONS = {
  FEED: { x: 153, y: 570, width: 438, height: 147 },
  PREVIOUS: { x: 187, y: 795, width: 85, height: 88 },
  CENTER_ITEM: { x: 305, y: 778, width: 131, height: 125 },
  NEXT: { x: 470, y: 795, width: 87, height: 88 },
  PLAY: { x: 156, y: 974, width: 441, height: 143 }
} as const satisfies Record<string, ChiriUiRect>

export const CHIRI_ARCHIVE_MASK_REGIONS = {
  ITEM_1: { x: 178, y: 601, width: 88, height: 86 },
  ITEM_2: { x: 279, y: 600, width: 88, height: 87 },
  ITEM_3: { x: 381, y: 601, width: 90, height: 86 },
  ITEM_4: { x: 484, y: 600, width: 90, height: 87 },
  ITEM_5: { x: 178, y: 701, width: 88, height: 87 },
  ITEM_6: { x: 279, y: 701, width: 88, height: 87 },
  ITEM_7: { x: 381, y: 701, width: 90, height: 87 },
  ITEM_8: { x: 484, y: 701, width: 90, height: 87 },
  ITEM_9: { x: 178, y: 802, width: 88, height: 86 },
  ITEM_10: { x: 279, y: 802, width: 88, height: 86 },
  ITEM_11: { x: 381, y: 802, width: 90, height: 86 },
  ITEM_12: { x: 484, y: 802, width: 90, height: 86 },
  MEMORIES: { x: 169, y: 951, width: 189, height: 50 },
  COLLECTION: { x: 165, y: 1024, width: 202, height: 53 },
  PREVIOUS: { x: 384, y: 970, width: 85, height: 88 },
  NEXT: { x: 485, y: 970, width: 87, height: 88 }
} as const satisfies Record<string, ChiriUiRect>

export const CHIRI_UI_TEXTURES = Array.from(new Set([
  ...Object.values(CHIRI_UI_ART),
  ...Object.values(CHIRI_GLOW_ART).flatMap(value =>
    Array.isArray(value) ? value : [value]
  ),
  ...Object.values(CHIRI_ACTIVE_ART),
  ...Object.values(CHIRI_ITEM_BACKGROUNDS),
  ...Object.values(CHIRI_FAVORITE_MATE_ICONS),
  ...Object.values(CHIRI_MEMORY_ICONS)
]))
