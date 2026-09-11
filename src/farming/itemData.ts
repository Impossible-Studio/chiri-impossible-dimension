import { ItemSlotCategory } from './itemSlotCategories'

// Each item uses one dimension layer. It communicates both origin and state.
export const ITEM_METADATA_OVERLAYS_ENABLED = true

export type ItemCategory =
  | 'inventory'
  | 'farming'
  | 'cooking'
  | 'quests'


export type ItemRarity =
  | 'normal'
  | 'magic'
  | 'impossible'
  | 'unstable'
  | 'mega-superpowered'


export type ItemDimension =
  // Existing entries still use this legacy value and display as Magic.
  | 'normal'
  | 'magic'
  | 'impossible'
  | 'aquatic'
  | 'diamond'
  | 'cheese'
  | 'gummie'


export type ItemType =
  | 'seed'
  | 'crop'
  | 'ingredient'
  | 'food'
  | 'quest'
  | 'collectible'


export interface ItemRarityLayers {

  normal: string
  magic: string
  impossible: string
  unstable: string
  'mega-superpowered': string

}


export interface InventoryItemData {

  icon: string

  name: string

  info: string

  categories: ItemCategory[]

  rarity: ItemRarity

  dimension: ItemDimension

  type: ItemType

  slotCategory?: ItemSlotCategory

  cropId?: string

  rarityLayers: ItemRarityLayers

  dimensionIcon: string

  // Some special cards already contain all their wording and should not add
  // the generic "From ... Dimension" line in the Info panel.
  showDimensionInInfo?: boolean

  // Complete slot artwork already contains its own background, item art and
  // labels. The Inventory must not compose the regular background, metadata,
  // quantity circle or item name on top of it. This is shared by collectible
  // mates and future special items such as Chiri Mecha parts.
  completeSlotArtwork?: boolean

  // Optional width / height ratio used to preserve non-square card artwork.
  completeSlotArtworkAspectRatio?: number

  // Complete artwork can still opt into the shared red stock counter. Mates
  // use this because each world pickup is one cooking charge.
  showQuantityOnCompleteArtwork?: boolean

  // Explicit cooking classification. Do not infer yerba from a translated
  // name: only the ingredient marked hold-yerba gets press-and-hold controls.
  // Populated when the cooking base/ingredient catalog is supplied.
  cooking?: {
    group: 'bases' | 'ingredients'
    interaction?: 'toggle' | 'hold-yerba'
  }

}


const RARITY_LAYERS = {

  normal:
    'assets/scene/ui/inventory/items/item slots background/state_normal.png',

  magic:
    'assets/scene/ui/inventory/items/item slots background/state_magic.png',

  impossible:
    'assets/scene/ui/inventory/items/item slots background/state_impossible.png',

  unstable:
    'assets/scene/ui/inventory/items/item slots background/state_unstable.png',

  'mega-superpowered':
    'assets/scene/ui/inventory/items/item slots background/state_mega_superpowered.png'

}


const DIMENSION_ICONS = {

  // Existing items formerly marked normal use Magic until explicitly categorized.
  normal:
    'assets/scene/ui/inventory/items/items categories/dimension_magic.png',

  magic:
    'assets/scene/ui/inventory/items/items categories/dimension_magic.png',

  impossible:
    'assets/scene/ui/inventory/items/items categories/dimension_impossible.png',

  aquatic:
    'assets/scene/ui/inventory/items/items categories/dimension_aquatic.png',

  diamond:
    'assets/scene/ui/inventory/items/items categories/dimension_diamond.png',

  cheese:
    'assets/scene/ui/inventory/items/items categories/dimension_cheese.png',

  gummie:
    'assets/scene/ui/inventory/items/items categories/dimension_gummie.png'

}

export function getItemStateLabel(rarity: ItemRarity) {
  const labels: Record<ItemRarity, string> = {
    normal: 'Normal',
    magic: 'Magic',
    impossible: 'Impossible',
    unstable: 'Unstable',
    'mega-superpowered': 'Mega Superpowered'
  }

  return labels[rarity]
}

export function getItemSlotCategory(item: InventoryItemData): ItemSlotCategory {
  if (item.slotCategory) {
    return item.slotCategory
  }

  if (item.categories.includes('farming')) {
    return 'farming'
  }

  if (item.categories.includes('cooking')) {
    return 'cooking'
  }

  return 'inventory'
}

export function getItemDimensionLabel(dimension: ItemDimension) {
  const labels: Record<ItemDimension, string> = {
    normal: 'Magic Dimension',
    magic: 'Magic Dimension',
    impossible: 'Impossible Dimension',
    aquatic: 'Aquatic Dimension',
    diamond: 'Diamond Dimension',
    cheese: 'Cheese Dimension',
    gummie: 'Gummie Dimension'
  }

  return labels[dimension]
}

export function getItemDimensionIcon(dimension: ItemDimension) {
  return DIMENSION_ICONS[dimension]
}

export function getItemDimensionColor(dimension: ItemDimension) {
  const colors: Record<ItemDimension, { r: number; g: number; b: number; a: number }> = {
    normal: { r: 0.73, g: 0.42, b: 0.96, a: 1 },
    magic: { r: 0.73, g: 0.42, b: 0.96, a: 1 },
    impossible: { r: 0.36, g: 0.9, b: 0.42, a: 1 },
    aquatic: { r: 0.15, g: 0.3, b: 0.78, a: 1 },
    diamond: { r: 0.26, g: 0.84, b: 0.95, a: 1 },
    cheese: { r: 1, g: 0.82, b: 0.18, a: 1 },
    gummie: { r: 0.96, g: 0.3, b: 0.67, a: 1 }
  }

  return colors[dimension]
}


export const ITEM_DATA:
  Record<string, InventoryItemData> = {


  // ==================================================
  // EGGPLANT
  // ==================================================

  eggplant: {

    icon:
      'assets/scene/ui/inventory/items/cosechas/eggplant.png',

    name:
      'Eggplant',

    info:
      'Fresh eggplant harvested from Chiri’s garden.',

    categories: [
      'inventory',
      'cooking'
    ],

    rarity:
      'normal',

    dimension:
      'normal',

    type:
      'crop',

    cropId:
      'eggplant',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.normal

  },


  seed_eggplant: {

    icon:
      'assets/scene/ui/inventory/items/seed_eggplant.png',

    name:
      'Eggplant Seeds',

    info:
      'Eggplant seeds ready to plant in an empty plot.',

    categories: [
      'inventory',
      'farming'
    ],

    rarity:
      'normal',

    dimension:
      'impossible',

    type:
      'seed',

    cropId:
      'eggplant',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.normal

  },


  // ==================================================
  // TOMATO
  // ==================================================

  tomato: {

    icon:
      'assets/scene/ui/inventory/items/cosechas/tomato.png',

    name:
      'Tomato',

    info:
      'Fresh tomato harvested from Chiri’s garden.',

    categories: [
      'inventory',
      'cooking'
    ],

    rarity:
      'normal',

    dimension:
      'normal',

    type:
      'crop',

    cropId:
      'tomato',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.normal

  },


  seed_tomato: {

    icon:
      'assets/scene/ui/inventory/items/seed_tomato.png',

    name:
      'Tomato Seeds',

    info:
      'Tomato seeds found while exploring the world.',

    categories: [
      'inventory',
      'farming'
    ],

    rarity:
      'normal',

    dimension:
      'impossible',

    type:
      'seed',

    cropId:
      'tomato',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.normal

  },


  // ==================================================
  // POTATO
  // ==================================================

  potato: {

    icon:
      'assets/scene/ui/inventory/items/cosechas/potato.png',

    name:
      'Potato',

    info:
      'Fresh potato harvested from Chiri’s garden.',

    categories: [
      'inventory',
      'cooking'
    ],

    rarity:
      'normal',

    dimension:
      'normal',

    type:
      'crop',

    cropId:
      'potato',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.normal

  },


  seed_potato: {

    icon:
      'assets/scene/ui/inventory/items/seed_potato.png',

    name:
      'Potato Seeds',

    info:
      'Potato seeds ready to plant in an empty plot.',

    categories: [
      'inventory',
      'farming'
    ],

    rarity:
      'normal',

    dimension:
      'impossible',

    type:
      'seed',

    cropId:
      'potato',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.normal

  },


  // ==================================================
  // CARROT
  // ==================================================

  carrot: {

    icon:
      'assets/scene/ui/inventory/items/cosechas/carrot.png',

    name:
      'Carrot',

    info:
      'Fresh carrot harvested from Chiri’s garden.',

    categories: [
      'inventory',
      'cooking'
    ],

    rarity:
      'normal',

    dimension:
      'normal',

    type:
      'crop',

    cropId:
      'carrot',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.normal

  },


  seed_carrot: {

    icon:
      'assets/scene/ui/inventory/items/seed_carrot.png',

    name:
      'Carrot Seeds',

    info:
      'Carrot seeds ready to plant in an empty plot.',

    categories: [
      'inventory',
      'farming'
    ],

    rarity:
      'normal',

    dimension:
      'impossible',

    type:
      'seed',

    cropId:
      'carrot',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.normal

  },


  // ==================================================
  // ONION
  // ==================================================

  onion: {

    icon:
      'assets/scene/ui/inventory/items/cosechas/onion.png',

    name:
      'Onion',

    info:
      'Fresh onion harvested from Chiri’s garden.',

    categories: [
      'inventory',
      'cooking'
    ],

    rarity:
      'normal',

    dimension:
      'normal',

    type:
      'crop',

    cropId:
      'onion',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.normal

  },


  seed_onion: {

    icon:
      'assets/scene/ui/inventory/items/seed_onion.png',

    name:
      'Onion Seeds',

    info:
      'Onion seeds ready to plant in an empty plot.',

    categories: [
      'inventory',
      'farming'
    ],

    rarity:
      'normal',

    dimension:
      'impossible',

    type:
      'seed',

    cropId:
      'onion',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.normal

  },


  // ==================================================
  // CHEESE
  // ==================================================

  cheese: {

    icon:
      'assets/scene/ui/inventory/items/cosechas/cheese.png',

    name:
      'Cheese',

    info:
      'A strange cheese discovered in the world.',

    categories: [
      'inventory',
      'cooking'
    ],

    rarity:
      'normal',

    dimension:
      'cheese',

    type:
      'ingredient',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.cheese

  },


  seed_cheese: {

    icon:
      'assets/scene/ui/inventory/items/seed_cheese.png',

    name:
      'Cheese Seeds',

    info:
      'Cheese seeds found while exploring the world.',

    categories: [
      'inventory',
      'farming'
    ],

    rarity:
      'normal',

    dimension:
      'cheese',

    type:
      'seed',

    cropId:
      'cheese',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.cheese

  },


  // ==================================================
  // HUMITA
  // ==================================================

  humita: {

    icon:
      // Dedicated filename avoids clients retaining the older transparent
      // cached asset that rendered an empty harvest card.
      'assets/scene/ui/inventory/items/cosechas/humita_food.png',

    name:
      'Humita',

    info:
      'Fresh humita harvested from Chiri’s garden.',

    categories: [
      'inventory',
      'cooking'
    ],

    rarity:
      'normal',

    dimension:
      'normal',

    type:
      'crop',

    cropId:
      'humita',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.normal

  },


  seed_humita: {

    icon:
      'assets/scene/ui/inventory/items/seed_humita.png',

    name:
      'Humita Seeds',

    info:
      'Humita seeds ready to plant in an empty plot.',

    categories: [
      'inventory',
      'farming'
    ],

    rarity:
      'normal',

    dimension:
      'impossible',

    type:
      'seed',

    cropId:
      'humita',

    rarityLayers:
      RARITY_LAYERS,

    dimensionIcon:
      DIMENSION_ICONS.normal

  },


  // ==================================================
  // IMPOSSIBLE FOREST FLOWERS
  // ==================================================

  butterfly_bloom: {
    icon:
      'assets/scene/ui/inventory/items/flowers/butterfly_bloom.png',
    name:
      'Butterfly Bloom',
    info:
      'A fluffy bloom collected in the Impossible Forest.',
    categories: [
      'inventory',
      'farming'
    ],
    rarity:
      'magic',
    dimension:
      'impossible',
    type:
      'collectible',
    rarityLayers:
      RARITY_LAYERS,
    dimensionIcon:
      DIMENSION_ICONS.impossible
  },

  spiral_bloom: {
    icon:
      'assets/scene/ui/inventory/items/flowers/spiral_bloom.png',
    name:
      'Spiral Bloom',
    info:
      'A colorful spiral bloom collected in the Impossible Forest.',
    categories: [
      'inventory',
      'farming'
    ],
    rarity:
      'magic',
    dimension:
      'impossible',
    type:
      'collectible',
    rarityLayers:
      RARITY_LAYERS,
    dimensionIcon:
      DIMENSION_ICONS.impossible
  },

  star_bloom: {
    icon:
      'assets/scene/ui/inventory/items/flowers/star_bloom.png',
    name:
      'Star Bloom',
    info:
      'A many-layered star bloom collected in the Impossible Forest.',
    categories: [
      'inventory',
      'farming'
    ],
    rarity:
      'magic',
    dimension:
      'impossible',
    type:
      'collectible',
    rarityLayers:
      RARITY_LAYERS,
    dimensionIcon:
      DIMENSION_ICONS.impossible
  },


  // ==================================================
  // MAGIC MAP
  // ==================================================

  world_map: {
    icon:
      'assets/scene/ui/inventory/items/map/world_map.png',
    name:
      'Magic Map',
    info:
      'A magic map that reveals routes across the Impossible Dimension.',
    categories: [
      'inventory'
    ],
    rarity:
      'impossible',
    dimension:
      'impossible',
    type:
      'collectible',
    slotCategory:
      'special-magic',
    rarityLayers:
      RARITY_LAYERS,
    dimensionIcon:
      DIMENSION_ICONS.impossible
  }

}

// Mates are configured separately because new designs can be added without
// editing this long catalog. Their inventory icon is supplied by mateConfig.
export function registerMateInventoryItem(
  mateId: string,
  name: string,
  icon: string
) {
  ITEM_DATA[`mate_${mateId}`] = {
    icon,
    name,
    info: `${name}\nCollect them all and use them any time!`,
    categories: ['inventory', 'cooking'],
    cooking: { group: 'bases', interaction: 'toggle' },
    rarity: 'normal',
    dimension: 'impossible',
    type: 'collectible',
    slotCategory: 'inventory',
    rarityLayers: RARITY_LAYERS,
    dimensionIcon: DIMENSION_ICONS.impossible,
    showDimensionInInfo: false,
    completeSlotArtwork: true,
    completeSlotArtworkAspectRatio: 196 / 205,
    showQuantityOnCompleteArtwork: true
  }
}

// Chiri Mecha part PNGs are complete cards, just like the special mate items.
// The paths are kept in chiriMechaConfig so the final art can be dropped in
// without changing Inventory rendering or collection logic.
export function registerChiriMechaInventoryItem(
  itemId: string,
  name: string,
  icon: string
) {
  ITEM_DATA[itemId] = {
    icon,
    name,
    info: `${name}\nA unique piece needed to rebuild Chiri Mecha.`,
    categories: ['inventory'],
    rarity: 'impossible',
    dimension: 'impossible',
    type: 'collectible',
    slotCategory: 'inventory',
    rarityLayers: RARITY_LAYERS,
    dimensionIcon: DIMENSION_ICONS.impossible,
    showDimensionInInfo: false,
    completeSlotArtwork: true,
    completeSlotArtworkAspectRatio: 196 / 205
  }
}

export function registerChiriMechaCraftItem(
  itemId: string,
  icon: string,
  crafted = false
) {
  ITEM_DATA[itemId] = {
    icon,
    name: crafted ? 'Chiri Mecha' : 'Chiri Mecha Parts',
    info: crafted
      ? 'Your completed Chiri Mecha suit. Equip it from the Chiri menu.'
      : 'Collect all six parts. Chiri Mecha assembles automatically when the set is complete.',
    categories: crafted ? ['inventory'] : ['quests'],
    rarity: 'impossible',
    dimension: 'impossible',
    type: crafted ? 'collectible' : 'quest',
    slotCategory: crafted ? 'inventory' : 'craft-ready',
    rarityLayers: RARITY_LAYERS,
    dimensionIcon: DIMENSION_ICONS.impossible,
    showDimensionInInfo: false,
    completeSlotArtwork: true,
    completeSlotArtworkAspectRatio: 196 / 205
  }
}

// Furniture and world-machine parts can be registered before the player save
// loads. An empty icon intentionally renders the normal stitched card with its
// name until final per-item PNG artwork is supplied.
export function registerWorldInventoryItem(
  itemId: string,
  name: string,
  info: string,
  icon = ''
) {
  ITEM_DATA[itemId] = {
    icon,
    name,
    info,
    categories: ['inventory'],
    rarity: 'normal',
    dimension: 'impossible',
    type: 'collectible',
    slotCategory: 'inventory',
    rarityLayers: RARITY_LAYERS,
    dimensionIcon: DIMENSION_ICONS.impossible,
    showDimensionInInfo: false
  }
}
