// Independent global cooking scale: changing these values never changes Inventory.
export const COOKING_UI_CONFIG = {
  desktop: { scale: 0.9, offsetX: 0, offsetY: 0 },
  mobile: { scale: 0.70, offsetX: 0, offsetY: 0 },
  screenPadding: 8,
  timerFontSize: 72,
  // Source-canvas controls for the 0/10 label inside the blue oven base.
  heatLabel: { x: 610, y: 934, width: 112, height: 36, fontSize: 26 },
  // Temporary access while the oven GLB is being prepared. Off in production.
  showTestButton: false
}

const MODE_MENU = 'assets/scene/ui/cooking/mode-menu/'
export const COOKING_MODE_MENU_CONFIG = {
  sourceWidth: 820,
  sourceHeight: 853,
  screenPadding: 8,
  desktop: { scale: 0.8, offsetX: 0, offsetY: 0 },
  mobile: { scale: 0.63, offsetX: 0, offsetY: 0 },
  regions: {
    COOK: { x: 151, y: 306, width: 521, height: 187 },
    ARCADE: { x: 150, y: 521, width: 521, height: 189 },
    CLOSE: { x: 684, y: 22, width: 108, height: 111 }
  }
} as const

export const COOKING_MODE_MENU_ART = {
  // Temporary launch state while Arcade is disabled. Switch `background`
  // back to `standardBackground` when the Arcade button is enabled.
  standardBackground: `${MODE_MENU}mode_menu_background.png`,
  soonBackground: `${MODE_MENU}mode_menu_soon_background.png`,
  background: `${MODE_MENU}mode_menu_soon_background.png`,
  glows: {
    COOK: `${MODE_MENU}cook_glow.png`,
    ARCADE: `${MODE_MENU}arcade_glow.png`,
    CLOSE: `${MODE_MENU}close_glow.png`
  }
} as const

export const COOKING_HEAT_CONFIG = {
  min: 0,
  max: 10,
  holdDelaySeconds: 0.35,
  holdRepeatSeconds: 0.12,
  // Each recipe rolls its own ready time. Heat 10 is 3.7x faster than heat 1.
  extraSpeedPerHeatPoint: 0.3
}

export const COOKING_INTERACTION_CONFIG = {
  // Guarantees that a quick desktop click survives at least one rendered
  // frame instead of setting and clearing the active PNG synchronously.
  minimumActiveMilliseconds: 120,
  readyFeedbackSeconds: 1.5
}

export const COOKING_MATE_CONFIG = {
  pourMinSeconds: 2,
  pourMaxSeconds: 3.5,
  overflowGraceSeconds: 1.2,
  types: {
    // Both yerba and water use an independently randomized value in this range.
    mate_matexito_infinito: { minSeconds: 5, maxSeconds: 7 },
    mate_matexito_supersonico: { minSeconds: 0.8, maxSeconds: 1.5 },
    mate_matexito_reliquia: { minSeconds: 1.8, maxSeconds: 5.2 },
    // This item does not exist yet; the rule is ready for its future unlock.
    mate_matexito_alchemist: {
      minSeconds: 2.2, maxSeconds: 3.8, requiredYerbaItemId: 'yerba_alchemist'
    }
  } as Record<string, { minSeconds: number; maxSeconds: number; requiredYerbaItemId?: string }>
}

export const COOKING_PREPARED_MATE_ITEMS: Record<string, string> = {
  mate_matexito_infinito: 'prepared_mate_infinite',
  mate_matexito_supersonico: 'prepared_mate_supersonic',
  mate_matexito_reliquia: 'prepared_mate_relique',
  mate_matexito_alchemist: 'prepared_mate_alchemist'
}

const ART = 'assets/scene/ui/cooking/oven/'
export const COOKING_ART = {
  background: `${ART}cooking_background.png`,
  frame: `${ART}cooking_frame.png`,
  waterActive: `${ART}mate_cooking/water_machine.png`,
  yerbaActive: `${ART}mate_cooking/yerba_machine.png`,
  bars: [1, 2, 3].flatMap(n => ['yellow', 'green', 'red'].map(color => `${ART}${color}${n}.png`)),
  // Set these paths AFTER the files exist. Empty paths render a text cue.
  overcooked: '',
  soon: '',
  waterOk: `${ART}mate_cooking/water1.png`,
  waterSpilled: `${ART}mate_cooking/water2.png`,
  yerbaOk: `${ART}mate_cooking/yerba1.png`,
  yerbaSpilled: `${ART}mate_cooking/yerba2.png`,
  invalidMate: ''
}

export const COOKING_MATE_BASE_ART: Record<string, string> = {
  mate_matexito_infinito: `${ART}mates/mate_infinite_cooking.png`,
  mate_matexito_reliquia: `${ART}mates/mate_relique_cooking.png`,
  mate_matexito_supersonico: `${ART}mates/mate_supersonic_cooking.png`,
  mate_matexito_alchemist: `${ART}mates/mate_alchemist_cooking.png`
}

// Oven layers are complete 1536x1024 transparent canvases. Their artwork is
// already positioned by the artist, so they always share the background.
// Item-only art such as pizza_crust_item stays centered inside its slot.
const FOOD_OVEN = `${ART}food_oven/`
const OVEN_BASES = `${FOOD_OVEN}base/`
const OVEN_INGREDIENTS = `${FOOD_OVEN}ingredients/`
const INVENTORY_FOODS = 'assets/scene/ui/inventory/items/foods/'
const INVENTORY_MATES = 'assets/scene/ui/inventory/items/mates/'
export const COOKING_OVEN_BASE_ART: Record<string, string> = {
  pizza_dough: `${OVEN_BASES}pizza_crust_oven.png`,
  humita: `${OVEN_BASES}humita_oven.png`
}

// Each array is the click-count sequence. It currently contains one layer, so
// the second click removes it. Later tomato1/2/3 can be added as three entries:
// click 1 -> 1, click 2 -> 2, click 3 -> 3, click 4 -> removed.
export const COOKING_OVEN_INGREDIENT_ART: Record<string, Record<string, string[]>> = {
  pizza_dough: {
    eggplant: [`${OVEN_INGREDIENTS}pizza_eggplant.png`],
    cheese: [`${OVEN_INGREDIENTS}pizza_cheese.png`],
    carrot: [`${OVEN_INGREDIENTS}pizza_carrot.png`],
    onion: [`${OVEN_INGREDIENTS}pizza_onion.png`],
    potato: [`${OVEN_INGREDIENTS}pizza_potato.png`],
    tomato: [`${OVEN_INGREDIENTS}pizza_tomate.png`]
  },
  // Humita is cooked by itself and accepts no toppings.
  humita: {}
}

export type CookingMaskRegionKey =
  | 'CLOSE' | 'BASE_PREVIOUS' | 'BASE_NEXT' | 'INGREDIENT_PREVIOUS' | 'INGREDIENT_NEXT'
  | 'FLAME' | 'HEAT_MINUS' | 'HEAT_PLUS' | 'MATE_WATER' | 'BASE_1' | 'BASE_2' | 'BASE_3' | 'BASE_4'
  | 'INGREDIENT_1' | 'INGREDIENT_2' | 'INGREDIENT_3' | 'INGREDIENT_4'
  | 'OVEN' | 'MATE' | 'ORDER_1' | 'ORDER_2' | 'ORDER_3' | 'READY'

const GLOW = `${ART}glow/`
export const COOKING_GLOW_ART: Partial<Record<CookingMaskRegionKey, string>> = {
  CLOSE: `${GLOW}close_X_glow.png`,
  BASE_PREVIOUS: `${GLOW}Flecha_izquierda_bases_glow.png`, BASE_NEXT: `${GLOW}Flecha_derecha_bases_glow.png`,
  INGREDIENT_PREVIOUS: `${GLOW}Flecha_arriba_ingredientes_glow.png`, INGREDIENT_NEXT: `${GLOW}Flecha_abajo_ingredientes_glow.png`,
  FLAME: `${GLOW}flame_glow.png`,
  HEAT_MINUS: `${GLOW}Menos_calor_glow.png`, HEAT_PLUS: `${GLOW}Mas_calor_glow.png`,
  MATE_WATER: `${GLOW}Boton_agua_mate_glow.png`,
  BASE_1: `${GLOW}Base_1_arriba_izquierda_glow.png`, BASE_2: `${GLOW}Base_2_arriba_derecha_glow.png`,
  BASE_3: `${GLOW}Base_3_abajo_izquierda_glow.png`, BASE_4: `${GLOW}Base_4_abajo_derecha_glow.png`,
  INGREDIENT_1: `${GLOW}Ingrediente1_glow.png`, INGREDIENT_2: `${GLOW}Ingrediente2_glow.png`,
  INGREDIENT_3: `${GLOW}Ingrediente3_glow.png`, INGREDIENT_4: `${GLOW}Ingrediente4_glow.png`,
  OVEN: `${GLOW}oven_area_glow.png`, MATE: `${GLOW}mate_area_glow.png`,
  ORDER_1: `${GLOW}Pedido1_glow.png`, ORDER_2: `${GLOW}Pedido2_glow.png`, ORDER_3: `${GLOW}Pedido3_glow.png`,
  READY: `${GLOW}READY_glow.png`
}

const ACTIVE = `${ART}active/`
export const COOKING_ACTIVE_ART: Partial<Record<CookingMaskRegionKey, string>> = {
  BASE_PREVIOUS: `${ACTIVE}Flecha_izquierda_bases_active.png`, BASE_NEXT: `${ACTIVE}Flecha_derecha_bases_active.png`,
  INGREDIENT_PREVIOUS: `${ACTIVE}Flecha_arriba_ingredientes_active.png`, INGREDIENT_NEXT: `${ACTIVE}Flecha_abajo_ingredientes_active.png`,
  FLAME: `${ACTIVE}flame_active.png`,
  HEAT_MINUS: `${ACTIVE}menos_calor_active.png`, HEAT_PLUS: `${ACTIVE}Mas_calor_active.png`,
  MATE_WATER: `${ACTIVE}Boton_agua_mate_active.png`, READY: `${ACTIVE}READY_active.png`
}

export const COOKING_OVEN_WORLD_CONFIG = {
  entityName: 'oven.glb',
  model: 'assets/scene/Models/cooking/oven.glb',
  position: { x: 341.25, y: 31, z: 346 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: 1,
  hoverText: 'Cook',
  pointerMaxDistance: 8
}

export const COOKING_ITEM_ART = {
  pizzaDough: `${OVEN_BASES}pizza_crust_item.png`,
  yerba: `${OVEN_INGREDIENTS}yerba.png`,
  eggplantPizza: `${INVENTORY_FOODS}pizza_eggplant.png`,
  eggplantPizzaMateInfinite: `${INVENTORY_FOODS}pizza_eggplant_mate_infinite.png`,
  plainNoodles: `${INVENTORY_FOODS}fideos_solos.png`,
  // Prepared mates are transparent object-only PNGs. Inventory supplies the
  // shared Cooking slot background behind each one.
  preparedMate: `${INVENTORY_MATES}mate_infinite_only.png`,
  preparedMateInfinite: `${INVENTORY_MATES}mate_infinite_only.png`,
  preparedMateSupersonic: `${INVENTORY_MATES}mate_supersonic_only.png`,
  preparedMateRelique: `${INVENTORY_MATES}mate_relique_only.png`,
  preparedMateAlchemist: `${INVENTORY_MATES}mate_alchemist_only.png`
}

export interface CookingRecipe {
  id: string
  outputId: string
  baseId: string
  // Toppings only. The selected base is always spent separately.
  ingredients: Record<string, number>
  optionalIngredients?: string[]
  readyTimeSeconds: { min: number; max: number }
}

// Initial recipe balance; no ingredients are granted for free.
export const COOKING_RECIPES: CookingRecipe[] = [
  {
    id: 'eggplant-pizza', outputId: 'eggplant_pizza', baseId: 'pizza_dough',
    ingredients: { eggplant: 1, cheese: 1 },
    optionalIngredients: ['carrot', 'onion', 'potato', 'tomato'],
    readyTimeSeconds: { min: 10, max: 15 }
  },
  {
    id: 'cooked-humita', outputId: 'cooked_humita', baseId: 'humita',
    ingredients: {}, readyTimeSeconds: { min: 5, max: 10 }
  }
]

export const CHIRI_COOKING_ORDERS = [
  { id: 'eggplant-pizza', itemId: 'eggplant_pizza', quantity: 1 },
  { id: 'mate', itemId: 'mate_matexito_infinito', quantity: 1 }
]

export function cookingHeatSpeed(heat: number) {
  return heat <= 0 ? 0 : 1 + (Math.min(10, heat) - 1) * COOKING_HEAT_CONFIG.extraSpeedPerHeatPoint
}

// Three physical lines: each changes yellow -> green -> red in turn.
export function cookingBarPaths(stage: number): string[] {
  const sequence = [
    [],
    ['yellow1'],
    ['yellow1', 'yellow2'],
    ['yellow1', 'yellow2', 'yellow3'],
    ['green1', 'yellow2', 'yellow3'],
    ['green1', 'green2', 'yellow3'],
    ['green1', 'green2', 'green3'],
    ['red1', 'green2', 'green3'],
    ['red1', 'red2', 'green3'],
    ['red1', 'red2', 'red3']
  ]
  const clamped = Math.max(0, Math.min(9, Math.floor(stage)))
  return sequence[clamped].map(name => `${ART}${name}.png`)
}

// These are rendered invisibly while the oven is closed so the first hover,
// press and food selection reuse textures that are already in the UI cache.
export const COOKING_TEXTURES_TO_PRELOAD = Array.from(new Set([
  COOKING_ART.background, COOKING_ART.frame,
  ...COOKING_ART.bars,
  ...Object.values(COOKING_GLOW_ART),
  ...Object.values(COOKING_ACTIVE_ART),
  ...Object.values(COOKING_MATE_BASE_ART),
  ...Object.values(COOKING_OVEN_BASE_ART),
  ...Object.values(COOKING_OVEN_INGREDIENT_ART).flatMap(layers => Object.values(layers).flat()),
  ...Object.values(COOKING_ITEM_ART),
  COOKING_MODE_MENU_ART.background,
  COOKING_MODE_MENU_ART.standardBackground,
  ...Object.values(COOKING_MODE_MENU_ART.glows),
  COOKING_ART.waterActive, COOKING_ART.yerbaActive,
  COOKING_ART.waterOk, COOKING_ART.waterSpilled,
  COOKING_ART.yerbaOk, COOKING_ART.yerbaSpilled,
  'assets/scene/ui/inventory/items/item slots background/lavender_oven.png',
  'assets/scene/ui/inventory/items/item slots background/green_oven.png'
].filter((src): src is string => Boolean(src))))

export function cookingModeMenuScale(mobile: boolean, width?: number, height?: number) {
  const target = COOKING_MODE_MENU_CONFIG[mobile ? 'mobile' : 'desktop'].scale
  if (!width || !height || width <= 0 || height <= 0) return target
  return Math.max(0.01, Math.min(target,
    (width - 2 * COOKING_MODE_MENU_CONFIG.screenPadding) / COOKING_MODE_MENU_CONFIG.sourceWidth,
    (height - 2 * COOKING_MODE_MENU_CONFIG.screenPadding) / COOKING_MODE_MENU_CONFIG.sourceHeight))
}

export function cookingPanelScale(mobile: boolean, width?: number, height?: number) {
  const target = COOKING_UI_CONFIG[mobile ? 'mobile' : 'desktop'].scale
  if (!width || !height || width <= 0 || height <= 0) return target
  return Math.max(0.01, Math.min(target,
    (width - 2 * COOKING_UI_CONFIG.screenPadding) / 1536,
    (height - 2 * COOKING_UI_CONFIG.screenPadding) / 1024))
}
