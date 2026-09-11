export interface ItemUnlockPresentation {
  itemId: string
  icon: string
  artworkAspectRatio: number
}

export const ITEM_UNLOCK_PRESENTATION_LAYOUT = {
  artworkSourceHeight: 205,
  baseHeight: 320,
  desktopScale: 1.3,
  mobileScale: 1,
  durationMs: 10_000,
  backdropOpacity: 0.5,

  unlockedOverlayEnabled: true,
  unlockedOverlay:
    'assets/scene/ui/inventory/items/unlock overlays/unlocked.png',
  // unlocked.png has its own 368 x 351 canvas. These controls preserve that
  // ratio and let the banner be adjusted independently of the item card.
  unlockedOverlayCanvasWidth: 368,
  unlockedOverlayCanvasHeight: 351,
  unlockedOverlayAspectRatio: 368 / 351,
  unlockedOverlayTransform: {
    desktop: { scale: 1, offsetX: 0, offsetY: 0 },
    mobile: { scale: 1, offsetX: 0, offsetY: 0 }
  }
} as const

let activePresentation: ItemUnlockPresentation | null = null
const pendingPresentations: ItemUnlockPresentation[] = []
let closeTimer: ReturnType<typeof setTimeout> | null = null
let onPresentationChanged: () => void = () => {}

function startCloseTimer() {
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
  }

  closeTimer = setTimeout(
    closeItemUnlockPresentation,
    ITEM_UNLOCK_PRESENTATION_LAYOUT.durationMs
  )
}

function showNextPresentation() {
  activePresentation = pendingPresentations.shift() ?? null

  if (activePresentation) {
    startCloseTimer()
  } else {
    closeTimer = null
  }

  onPresentationChanged()
}

export function showItemUnlockPresentation(
  presentation: ItemUnlockPresentation
) {
  if (activePresentation) {
    pendingPresentations.push(presentation)
    return
  }

  activePresentation = presentation
  startCloseTimer()
  onPresentationChanged()
}

export function getItemUnlockPresentation() {
  return activePresentation
}

export function closeItemUnlockPresentation() {
  if (!activePresentation) return

  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }

  activePresentation = null
  showNextPresentation()
}

export function setItemUnlockPresentationListener(
  listener: () => void
) {
  onPresentationChanged = listener
}
