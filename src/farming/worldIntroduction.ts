import { registerFirstSeedsQuest } from './questState'

// Timings start once the player has loaded into the scene.
export const WORLD_INTRODUCTION_DELAY_MS = 4_000
export const WORLD_INTRODUCTION_AUTO_CLOSE_MS = 25_000
// This delay starts only after the introduction has actually closed, whether
// it was dismissed by the player or reached its automatic timeout.
export const FIRST_SEEDS_QUEST_DELAY_MS = 10_000

export const WORLD_INTRODUCTION_IMAGE =
  'assets/scene/ui/introduction/welcome_to_impossible_dimension.png'
export const WORLD_INTRODUCTION_IMAGE_ENABLED = true

export const WORLD_INTRODUCTION_LAYOUT = {
  // The source PNG is 1537 x 860. Keep this ratio when changing its size.
  width: 900,
  height: 504,
  // Change these independently to resize only the welcome PNG.
  desktopScale: 1.5,
  mobileScale: 0.9
} as const

let worldIntroductionVisible = false
let onWorldIntroductionChanged: () => void = () => {}
let firstSeedsQuestScheduled = false

function scheduleFirstSeedsQuestAfterIntroduction() {
  if (firstSeedsQuestScheduled) return

  firstSeedsQuestScheduled = true
  setTimeout(registerFirstSeedsQuest, FIRST_SEEDS_QUEST_DELAY_MS)
}

export function initializeWorldIntroduction() {
  setTimeout(() => {
    if (WORLD_INTRODUCTION_IMAGE_ENABLED) {
      worldIntroductionVisible = true
      onWorldIntroductionChanged()

      setTimeout(closeWorldIntroduction, WORLD_INTRODUCTION_AUTO_CLOSE_MS)
    } else {
      scheduleFirstSeedsQuestAfterIntroduction()
    }
  }, WORLD_INTRODUCTION_DELAY_MS)
}

export function isWorldIntroductionVisible() {
  return worldIntroductionVisible
}

export function closeWorldIntroduction() {
  if (!worldIntroductionVisible) return

  worldIntroductionVisible = false
  onWorldIntroductionChanged()
  scheduleFirstSeedsQuestAfterIntroduction()
}

export function setWorldIntroductionUiListener(listener: () => void) {
  onWorldIntroductionChanged = listener
}
