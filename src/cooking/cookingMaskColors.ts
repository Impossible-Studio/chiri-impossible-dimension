// Every mask keeps its own palette. Solid opaque colors, no antialiasing;
// unused pixels are transparent or #000000. These are NOT visual UI colors.
export const COOKING_MODE_MASK_COLORS = {
  COOK: '#00FF00',
  ARCADE: '#0000FF',
  CLOSE: '#FF00FF'
} as const

export const COOKING_MASK_COLORS = {
  CLOSE: '#FF00FF',
  BASE_PREVIOUS: '#FF8000',
  BASE_NEXT: '#00FFFF',
  INGREDIENT_PREVIOUS: '#00FF00',
  INGREDIENT_NEXT: '#0000FF',
  FLAME: '#FF4000',
  HEAT_MINUS: '#FF0000',
  HEAT_PLUS: '#FFFF00',
  MATE_WATER: '#8080FF',
  BASE_1: '#800080',
  BASE_2: '#804000',
  BASE_3: '#408000',
  BASE_4: '#008080',
  INGREDIENT_1: '#004080',
  INGREDIENT_2: '#400080',
  INGREDIENT_3: '#806040',
  INGREDIENT_4: '#408060',
  OVEN: '#604080',
  MATE: '#808040',
  ORDER_1: '#FF80FF',
  ORDER_2: '#80FF80',
  ORDER_3: '#80FFFF',
  READY: '#00FF80'
} as const
