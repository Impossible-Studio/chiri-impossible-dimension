export type ItemSlotCategory =
  | 'inventory'
  | 'farming'
  | 'cooking'
  | 'oven-base'
  | 'oven-ingredient'
  | 'oven-order'
  | 'craft'
  | 'special-magic'
  | 'craft-ready'
  | 'quest-mission'
  | 'quest-harvest'

const ITEM_SLOT_BACKGROUND_ROOT =
  'assets/scene/ui/inventory/items/item slots background'

export const ITEM_SLOT_BACKGROUNDS: Record<ItemSlotCategory, string> = {
  inventory: `${ITEM_SLOT_BACKGROUND_ROOT}/inventory.png`,
  farming: `${ITEM_SLOT_BACKGROUND_ROOT}/farming.png`,
  cooking: `${ITEM_SLOT_BACKGROUND_ROOT}/cooking.png`,
  'oven-base': `${ITEM_SLOT_BACKGROUND_ROOT}/lavender_oven.png`,
  // Bases and ingredients currently share the lavender cooking slot.
  // Keep the separate category so blue can be restored later without
  // changing the item-card composition.
  'oven-ingredient': `${ITEM_SLOT_BACKGROUND_ROOT}/lavender_oven.png`,
  'oven-order': `${ITEM_SLOT_BACKGROUND_ROOT}/green_oven.png`,
  craft: `${ITEM_SLOT_BACKGROUND_ROOT}/craft.png`,
  'special-magic': `${ITEM_SLOT_BACKGROUND_ROOT}/special_magic.png`,
  'craft-ready': `${ITEM_SLOT_BACKGROUND_ROOT}/craft_ready.png`,
  'quest-mission': `${ITEM_SLOT_BACKGROUND_ROOT}/farming.png`,
  'quest-harvest': `${ITEM_SLOT_BACKGROUND_ROOT}/farming.png`
}

export const ITEM_SLOT_CATEGORY_LABELS: Record<ItemSlotCategory, string> = {
  inventory: 'Collection',
  farming: 'Farming',
  cooking: 'Cooking',
  'oven-base': 'Cooking Base',
  'oven-ingredient': 'Cooking Ingredient',
  'oven-order': 'Cooking Order',
  craft: 'Craft Material',
  'special-magic': 'Special Magic Item',
  'craft-ready': 'Ready to Craft',
  'quest-mission': 'Chapter Mission',
  'quest-harvest': 'Harvest Quest'
}
