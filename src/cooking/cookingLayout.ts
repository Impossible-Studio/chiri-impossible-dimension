export type CookingDevice = 'desktop' | 'mobile'
export type CookingItemGroup = 'bases' | 'ingredients' | 'orders'

// Coordinates from COOKING UI 1.png. Do not scale the individual centers when
// changing item size: only the complete panel's responsive scale moves them.
export const COOKING_CANVAS = { width: 1536, height: 1024 }

// MANUAL ITEM SIZE CONTROLS. 1 = original, 0.9 = 10% smaller, 1.1 = 10% larger.
// Each multiplier applies to EACH card, including its background, art, name,
// dimension icon, quantity circle/number and hover. It does not scale the row.
export const COOKING_ITEM_SCALES: Record<
  CookingDevice,
  Record<CookingItemGroup, number>
> = {
  desktop: { bases: 1, ingredients: 1, orders: 1 },
  mobile: { bases: 1, ingredients: 1, orders: 1 }
}

// Initial card heights in source-image pixels, before the multipliers above.
export const COOKING_ITEM_HEIGHTS: Record<CookingItemGroup, number> = {
  bases: 140,
  ingredients: 140,
  orders: 170
}

// Source-pixel font controls for Cooking cards only. Inventory keeps its own
// typography. Bases/ingredients are slightly larger; quantities are kept
// smaller so long values remain centered inside the red circle.
export const COOKING_ITEM_TEXT_STYLE: Record<
  CookingItemGroup,
  {
    nameFontSize: number
    quantityFontSize: number
    itemScale: number
    quantityOffsetX: number
    quantityOffsetY: number
    nameOffsetY: number
  }
> = {
  bases: {
    nameFontSize: 23, quantityFontSize: 18, itemScale: 1.09,
    quantityOffsetX: 1, quantityOffsetY: -1, nameOffsetY: -7
  },
  ingredients: {
    nameFontSize: 23, quantityFontSize: 18, itemScale: 1.09,
    quantityOffsetX: 1, quantityOffsetY: -1, nameOffsetY: -7
  },
  orders: {
    nameFontSize: 21, quantityFontSize: 18, itemScale: 1.09,
    quantityOffsetX: 1, quantityOffsetY: -1, nameOffsetY: -7
  }
}

export const COOKING_ITEM_CENTERS: Record<
  CookingItemGroup,
  ReadonlyArray<{ x: number; y: number }>
> = {
  bases: [
    { x: 155.5, y: 527.5 },
    { x: 304.5, y: 527.5 },
    { x: 155.5, y: 682.5 },
    { x: 304.5, y: 682.5 }
  ],
  ingredients: [
    { x: 1251.5, y: 301 },
    { x: 1251.5, y: 452.5 },
    { x: 1251.5, y: 603.5 },
    { x: 1251.5, y: 753.5 }
  ],
  orders: [
    { x: 241.5, y: 291 },
    { x: 433, y: 291 },
    { x: 623, y: 291 }
  ]
}

export const COOKING_TIMER_CENTER = { x: 668.3, y: 71.2 }

function positiveScale(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 1
}

export function setCookingItemScale(
  group: CookingItemGroup,
  device: CookingDevice,
  scale: number
) {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error('Cooking item scale must be a positive, finite number')
  }
  COOKING_ITEM_SCALES[device][group] = scale
}

export function getCookingItemLayout(
  group: CookingItemGroup,
  slotIndex: number,
  device: CookingDevice,
  canvasScale: number
) {
  const center = COOKING_ITEM_CENTERS[group][slotIndex]
  if (!center) throw new Error(`Invalid cooking slot: ${group}[${slotIndex}]`)

  const panelScale = positiveScale(canvasScale)
  const height = COOKING_ITEM_HEIGHTS[group] * panelScale *
    positiveScale(COOKING_ITEM_SCALES[device][group])
  const x = center.x * panelScale
  const y = center.y * panelScale

  return { center: { x, y }, height, left: x - height / 2, top: y - height / 2 }
}
