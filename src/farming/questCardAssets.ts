export type QuestCardType =
  | 'harvest-ready'
  | 'chapter-mission'
  | 'chapter-completed'
  | 'ready-for-crafting'
  | 'recipe-found'
  | 'chiri-request'
  | 'bonus'
  | 'comic-unlocked'

const QUEST_CARD_ROOT =
  'assets/scene/ui/inventory/items/quests'

const CHAPTER_MISSIONS_ROOT =
  `${QUEST_CARD_ROOT}/chaptersmissions`

// Each mission is made of a base card plus transparent full-card overlays:
// progress (1of5.png through 5of5.png) and the shared completion stamp.
// mision1.png through mision5.png are Chapter 1 story-description overlays
// only. These values scale every layer together while preserving its native
// transparent canvas.
export const CHAPTER_MISSION_CARD_LAYOUT = {
  // Native PNG canvas sizes. The base/progress art is 196 x 205, while the
  // mission-info and completion overlays intentionally use a larger 368 x 351
  // transparent canvas. Both canvases must share their center; they must never
  // be forced into the same width and height.
  baseCanvasWidth: 196,
  baseCanvasHeight: 205,
  largeOverlayCanvasWidth: 368,
  largeOverlayCanvasHeight: 351,
  questDesktopScale: 1,
  questMobileScale: 1,
  completionBaseSize: 320,
  completionDesktopScale: 1.3,
  completionMobileScale: 1,

  // Automatic presentation when a mission starts for the first time. This
  // group scale changes the base item, progress PNG and (only in Chapter 1)
  // misionN.png together.
  firstPresentationBaseSize: 320,
  firstPresentationGroupDesktopScale: 1.3,
  firstPresentationGroupMobileScale: 1,

  // Large preview opened by tapping a quest inside Inventory. This group scale
  // also changes the base item, progress PNG and the Chapter 1 description.
  previewBaseSize: 320,
  previewGroupDesktopScale: 1.3,
  previewGroupMobileScale: 1.1,

  // Manual controls for Chapter 1's mision1.png, mision2.png, etc. Positive Y
  // moves only this transparent description artwork down; it never moves the
  // chapter mission base item or the 1of5 progress layer.
  missionInfoOverlay: {
    desktop: { scale: 1, offsetX: 0, offsetY: 62 },
    mobile: { scale: 1, offsetX: 0, offsetY: 60 }
  },

  // Manual controls for the shared "mision complete.png" layer.
  missionCompleteOverlay: {
    desktop: { scale: 1, offsetX: 0, offsetY: 0 },
    mobile: { scale: 1, offsetX: 0, offsetY: 0 }
  }
} as const

// Chapter-complete item shown after the fifth mission-complete card closes.
// The final PNGs can be tuned independently for desktop and mobile here.
export const CHAPTER_COMPLETED_CARD_LAYOUT = {
  sourceWidth: 368,
  sourceHeight: 351,
  baseHeight: 360,
  desktop: { scale: 1.3, offsetX: 0, offsetY: 0 },
  mobile: { scale: 1, offsetX: 0, offsetY: 0 }
} as const

// Transparent overlays placed above the quest item icon.
export const QUEST_CARD_OVERLAYS: Record<
  Exclude<QuestCardType, 'chapter-mission' | 'chapter-completed'>,
  string
> = {
  'harvest-ready': `${QUEST_CARD_ROOT}/harvest_ready.png`,
  'ready-for-crafting': `${QUEST_CARD_ROOT}/ready_for_crafting.png`,
  'recipe-found': `${QUEST_CARD_ROOT}/recipe_found.png`,
  'chiri-request': `${QUEST_CARD_ROOT}/chiri_request.png`,
  bonus: `${QUEST_CARD_ROOT}/bonus.png`,
  'comic-unlocked': `${QUEST_CARD_ROOT}/comic_unlocked.png`
}

export function getChapterMissionQuestOverlay(
  chapter: number,
  mission: number
) {
  return `${CHAPTER_MISSIONS_ROOT}/chapter${chapter}_mission${mission}.png`
}

export function getChapterMissionProgressOverlay(progress: number) {
  const safeProgress = Math.max(1, Math.min(5, Math.floor(progress)))
  return `${CHAPTER_MISSIONS_ROOT}/${safeProgress}of5.png`
}

export function getChapterMissionNumberOverlay(mission: number) {
  const safeMission = Math.max(1, Math.floor(mission))
  return `${CHAPTER_MISSIONS_ROOT}/mision${safeMission}.png`
}

export const CHAPTER_MISSION_COMPLETE_OVERLAY =
  `${CHAPTER_MISSIONS_ROOT}/mision complete.png`

export function getChapterCompletedQuestOverlay(chapter: number) {
  return `${CHAPTER_MISSIONS_ROOT}/chapter_completed${chapter}.png`
}
