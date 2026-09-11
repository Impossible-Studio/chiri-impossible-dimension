import { INVENTORY_TEXT_STYLE } from './inventoryLayout'

// Change these values to resize the seed-menu contents.
export const SEED_MENU_STYLE = {
  itemSize: 179,
  // Negative moves only the seed image upward; the slot background stays fixed.
  itemOffsetY: -6,
  itemBackgroundSize: 230,
  itemBackgroundOffsetY: 0,
  itemHoverSize: 267,
  itemHoverOffsetY: 0,
  itemNameWidth: 210,
  itemNameHeight: 46,
  itemNameFontSize: INVENTORY_TEXT_STYLE.itemName.fontSize,
  itemNameOffsetY: -5,
  quantityWidth: 60,
  quantityHeight: 48,
  // Full-slot transparent layer: its PNG matches the seed item background size.
  quantityCircleOffsetX: 0,
  quantityCircleOffsetY: 0,
  quantityFontSize: INVENTORY_TEXT_STYLE.quantity.fontSize,
  quantityOffsetY: 0
}

export const SEED_MENU_LAYOUT = {
  slots: [
    {
      item: { x: 280.5, y: 323.5 },
      quantity: { x: 360.1, y: 235.2 },
      name: { x: 279.6, y: 406.5 }
    },
    {
      item: { x: 539.5, y: 323.5 },
      quantity: { x: 619.1, y: 235.2 },
      name: { x: 539.6, y: 406.5 }
    },
    {
      item: { x: 280.5, y: 586.5 },
      quantity: { x: 360.1, y: 499.4 },
      name: { x: 279.6, y: 668.5 }
    },
    {
      item: { x: 539.5, y: 586.5 },
      quantity: { x: 619.1, y: 499.4 },
      name: { x: 539.6, y: 668.5 }
    }
  ]
} as const
