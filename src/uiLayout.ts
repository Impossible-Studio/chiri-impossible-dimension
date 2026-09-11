// ======================================================
// UI SCALES
// ======================================================

export const INVENTORY_SCALE = 0.8

export const MAP_SCALE = 1

export const MINI_INVENTORY_SCALE = 1

export const MINI_MAP_SCALE = 1

// Global scale for the complete seed-menu canvas and its hitboxes.
export const SEED_MENU_SCALE = 0.8

// Independent mobile values. Edit these without affecting desktop UI.
export const MOBILE_UI_CONFIG = {
  // These apply to the panels only. The backdrop behind them is always full-screen.
  inventoryScale: 0.63,
  seedMenuScale: 0.74,
  mapScale: 0.78,
  miniInventoryScale: 1,
  miniInventoryTop: 20,
  miniInventoryRight: 570,
  miniMapScale: 1,
  miniMapTop: 20,
  miniMapRight: 410,
  inventoryInfoScale: 0.8,
  // Added after scaling, so this represents real readable font-size points.
  inventoryInfoFontSizeOffset: 2,
  // These only affect the text layout inside the Info panel.
  inventoryInfoWidthScale: 1.2,
  inventoryInfoHeightScale: 1.25,
  // Negative values move the Info paragraph upward.
  inventoryInfoOffsetY: -8,

  // Keep every modal centered in the actual UI viewport. Do not compensate
  // for a particular phone's safe area here: that made Xiaomi panels shift.
  modalContentOffsetX: 0,

  // The backdrop uses the complete viewport on every mobile resolution.
  modalBackdropWidth: '100vw',
  modalBackdropLeft: '0vw'
} as const


// ======================================================
// SCALE HELPERS
// ======================================================

export function inventoryUi(value: number) {
  return value * (isMobile() ? MOBILE_UI_CONFIG.inventoryScale : INVENTORY_SCALE)
}

export function mapUi(value: number) {
  return value * (isMobile() ? MOBILE_UI_CONFIG.mapScale : MAP_SCALE)
}

export function miniInventoryUi(value: number) {
  return value * (isMobile() ? MOBILE_UI_CONFIG.miniInventoryScale : MINI_INVENTORY_SCALE)
}

export function miniMapUi(value: number) {
  return value * (isMobile() ? MOBILE_UI_CONFIG.miniMapScale : MINI_MAP_SCALE)
}

export function seedMenuUi(value: number) {
  return value * (isMobile() ? MOBILE_UI_CONFIG.seedMenuScale : SEED_MENU_SCALE)
}
import { isMobile } from '@dcl/sdk/platform'
