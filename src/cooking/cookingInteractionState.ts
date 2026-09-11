import type { CookingMaskRegionKey } from './cookingConfig'
import { COOKING_INTERACTION_CONFIG } from './cookingConfig'

let hovered: CookingMaskRegionKey | null = null
let pressed: CookingMaskRegionKey | null = null
let pressedAt = 0
let released = false
let onChange = () => {}

export function setCookingInteractionListener(listener: () => void) { onChange = listener }
export function getHoveredCookingControl() { return hovered }
export function getPressedCookingControl() { return pressed }
export function setHoveredCookingControl(value: CookingMaskRegionKey | null) {
  if (hovered === value) return
  hovered = value; onChange()
}
export function leaveCookingControl(value: CookingMaskRegionKey) {
  if (hovered === value) setHoveredCookingControl(null)
  if (pressed === value) setPressedCookingControl(null)
}
export function setPressedCookingControl(value: CookingMaskRegionKey | null) {
  if (pressed === value) {
    if (value && released) {
      pressedAt = Date.now()
      released = false
      onChange()
    }
    return
  }
  pressed = value
  pressedAt = value ? Date.now() : 0
  released = false
  onChange()
}
export function releaseCookingControl(value: CookingMaskRegionKey) {
  if (pressed !== value) return
  released = true
  updateCookingInteractionState()
}
export function releasePressedCookingControl() {
  if (pressed) releaseCookingControl(pressed)
}
export function updateCookingInteractionState() {
  if (!pressed || !released) return
  if (Date.now() - pressedAt < COOKING_INTERACTION_CONFIG.minimumActiveMilliseconds) return
  setPressedCookingControl(null)
}
export function clearCookingControlState() {
  if (hovered === null && pressed === null) return
  hovered = null
  pressed = null
  pressedAt = 0
  released = false
  onChange()
}
