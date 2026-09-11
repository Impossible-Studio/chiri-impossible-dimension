export const SCORE_HUD_IMAGE =
  'assets/scene/ui/hud/points_counter.png'

export const SCORE_HUD_SOURCE = {
  // Kept at or below 2048 so Creator Hub Preview can decode the UI texture.
  width: 2048,
  height: 683,
  // Lavender rectangle inside the original transparent PNG.
  scoreArea: {
    x: 556.3168,
    y: 179.2403,
    width: 1188.0663,
    height: 330.1796
  }
} as const

// EDIT THESE VALUES to tune the HUD independently on each device:
// - totalWidth controls the complete PNG size (height follows automatically).
// - numberFontSize controls only the score digits.
export const SCORE_HUD_LAYOUT = {
  desktop: {
    totalWidth: 360,
    numberFontSize: 34,
    // Leaves the Explorer's top-left global controls unobstructed.
    left: 390,
    top: 16,
    numberOffsetX: 0,
    numberOffsetY: -3
  },
  mobile: {
    totalWidth: 270,
    numberFontSize: 25,
    // Keep the score on the left edge on phones so it never overlaps the
    // Mini Chiri button or the centered modal controls.
    left: 24,
    top: 14,
    numberOffsetX: 0,
    numberOffsetY: -3
  }
} as const

export const SCORE_HUD_NUMBER_COLOR = {
  r: 0.055,
  g: 0.16,
  b: 0.36,
  a: 1
} as const
