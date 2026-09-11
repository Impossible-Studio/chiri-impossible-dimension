import { COOKING_SUPPLY_CONFIG } from './cookingSupplyConfig'

export interface CookingSupplyFeedback {
  id: number
  amount: number
  createdAt: number
  visibleAt: number
  duration: number
  revealed: boolean
  message?: string
}

let currentFeedback: CookingSupplyFeedback | null = null
let onChange = () => {}
let nextFeedbackId = 1

export function showCookingSupplyFeedback(amount: number) {
  const now = Date.now()
  const restarting = currentFeedback !== null
  currentFeedback = {
    id: nextFeedbackId++,
    amount,
    createdAt: now,
    // A repeated rapid pickup gets one short blank beat, then a fresh +1.
    // This makes every click legible instead of looking like one stuck label.
    visibleAt: now + (restarting ? 50 : 0),
    duration: COOKING_SUPPLY_CONFIG.feedbackDurationMs,
    revealed: !restarting
  }
  onChange()
}

export function showCookingSupplyLimitFeedback() {
  const now = Date.now()
  currentFeedback = {
    id: nextFeedbackId++,
    amount: 0,
    message: 'Come back tomorrow for more!',
    createdAt: now,
    visibleAt: now,
    duration: COOKING_SUPPLY_CONFIG.limitMessageDurationMs,
    revealed: true
  }
  onChange()
}

export function closeCookingSupplyFeedback() {
  if (!currentFeedback) return
  currentFeedback = null
  onChange()
}

export function getCookingSupplyFeedback() {
  if (!currentFeedback) return null
  const now = Date.now()
  if (now < currentFeedback.visibleAt) return null
  if (now - currentFeedback.visibleAt >= currentFeedback.duration) {
    currentFeedback = null
    return null
  }
  return currentFeedback
}

export function updateCookingSupplyFeedback() {
  if (!currentFeedback) return
  const now = Date.now()
  if (!currentFeedback.revealed && now >= currentFeedback.visibleAt) {
    currentFeedback.revealed = true
    onChange()
    return
  }
  if (now - currentFeedback.visibleAt < currentFeedback.duration) return
  currentFeedback = null
  onChange()
}

export function setCookingSupplyFeedbackListener(listener: () => void) {
  onChange = listener
}
