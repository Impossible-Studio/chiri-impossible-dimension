import { COOKING_HEAT_CONFIG } from './cookingConfig'

export type CookingMode = 'cook' | 'arcade'
export type CookingScreen = 'closed' | 'choose-mode' | 'cooking'
export type CookingPourSource =
  | { key: string; kind: 'water' }
  | { key: string; kind: 'yerba'; itemId: string }

interface CookingSessionHooks {
  canInteract?: () => boolean
  canChooseMode?: (mode: CookingMode) => boolean
  canPour?: (source: CookingPourSource) => boolean
  onPourTick?: (source: CookingPourSource, seconds: number) => void
  onChange?: () => void
  onHeatStep?: (direction: -1 | 1) => void
}

// Input/session foundation only: recipes, cooking costs and timers are wired
// separately. Opening/closing this controller never changes player inventory.
export class CookingSession {
  private screen: CookingScreen = 'closed'
  private mode: CookingMode | null = null
  private held: { source: CookingPourSource; seconds: number } | null = null
  private heldHeat: { direction: -1 | 1; remaining: number } | null = null

  constructor(private readonly hooks: CookingSessionHooks = {}) {}

  getState() {
    return {
      screen: this.screen,
      mode: this.mode,
      held: this.held
        ? { source: { ...this.held.source }, seconds: this.held.seconds }
        : null
    }
  }

  private changed() { this.hooks.onChange?.() }
  private canInteract() { return this.hooks.canInteract?.() ?? true }

  openOven() {
    if (!this.canInteract()) return false
    this.held = null
    this.heldHeat = null
    this.mode = null
    this.screen = 'choose-mode'
    this.changed()
    return true
  }

  chooseMode(mode: CookingMode) {
    if (this.screen !== 'choose-mode' || !this.canInteract()) return false
    if (this.hooks.canChooseMode?.(mode) === false) return false
    this.held = null
    this.heldHeat = null
    this.mode = mode
    this.screen = 'cooking'
    this.changed()
    return true
  }

  // Shared by X and outside-click, in BOTH the chooser and the cooking panel.
  // Closing does not navigate back to the chooser: it exits the oven entirely.
  close() {
    this.held = null
    this.heldHeat = null
    this.mode = null
    this.screen = 'closed'
    this.changed()
  }

  beginPour(source: CookingPourSource) {
    if (this.screen !== 'cooking' || !this.canInteract()) return false
    if (this.hooks.canPour?.(source) === false) return false
    if (this.held?.source.key === source.key) return true
    this.heldHeat = null
    this.held = { source: { ...source }, seconds: 0 }
    this.changed()
    return true
  }

  endPour(sourceKey: string) {
    // A late leave/up from a previous button cannot stop another active button.
    if (this.held?.source.key !== sourceKey) return
    this.cancelPour()
  }

  cancelPour() {
    if (!this.held) return
    this.held = null
    this.changed()
  }

  isPouring(sourceKey: string) {
    return this.held?.source.key === sourceKey
  }

  beginHeat(direction: -1 | 1) {
    if (this.screen !== 'cooking' || !this.canInteract()) return false
    if (this.heldHeat?.direction === direction) return true
    this.cancelPour()
    this.heldHeat = { direction, remaining: COOKING_HEAT_CONFIG.holdDelaySeconds }
    this.hooks.onHeatStep?.(direction) // A quick click is exactly one step.
    this.changed()
    return true
  }

  endHeat(direction: -1 | 1) {
    if (this.heldHeat?.direction === direction) this.heldHeat = null
  }

  cancelInputs() {
    this.heldHeat = null
    this.cancelPour()
  }

  update(seconds: number) {
    if (this.screen === 'closed') return
    if (!this.canInteract()) { this.close(); return }
    // Never fast-forward pouring after a suspended/blocked frame.
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 0.25) {
      this.cancelInputs()
      return
    }
    if (seconds === 0) return
    if (this.heldHeat) {
      this.heldHeat.remaining -= seconds
      while (this.heldHeat && this.heldHeat.remaining <= 0) {
        this.heldHeat.remaining += COOKING_HEAT_CONFIG.holdRepeatSeconds
        this.hooks.onHeatStep?.(this.heldHeat.direction)
      }
      this.changed()
    }
    if (!this.held) return
    if (this.hooks.canPour?.(this.held.source) === false) {
      this.cancelPour()
      return
    }
    this.held.seconds += seconds
    this.hooks.onPourTick?.({ ...this.held.source }, seconds)
    this.changed()
  }
}

export function createCookingHeatHandlers(session: CookingSession, direction: -1 | 1) {
  return {
    onMouseDown: () => { session.beginHeat(direction) },
    onMouseUp: () => { session.endHeat(direction) },
    onMouseLeave: () => { session.endHeat(direction) }
  }
}

// Same callbacks on desktop and mobile. No click/tap toggle, no delayed timer.
// Use a stable source key, not closure-local state: callbacks get reconstructed
// during UI renders while the player may still be holding the same button.
export function createCookingHoldHandlers(
  session: CookingSession,
  source: CookingPourSource
) {
  return {
    onMouseDown: () => { session.beginPour(source) },
    onMouseUp: () => { session.endPour(source.key) },
    onMouseLeave: () => { session.endPour(source.key) }
  }
}
