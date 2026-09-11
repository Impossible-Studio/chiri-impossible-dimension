export const COOKING_SUPPLY_CONFIG = {
  position: { x: 256, y: 0, z: 256 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: 1,
  pointerMaxDistance: 8,
  dailyLimit: 10,
  cheeseAmount: 3,
  feedbackDurationMs: 1_100,
  limitMessageDurationMs: 3_500,
  models: {
    fridgeClosed: 'assets/scene/Models/cooking/heladera_close.glb',
    fridgeOpen: 'assets/scene/Models/cooking/heladera_open.glb',
    magicOven: 'assets/scene/Models/cooking/hornitomagic.glb',
    pizzaDough: 'assets/scene/Models/cooking/pizza_crust.glb',
    cheese: 'assets/scene/Models/cooking/cheese_cocina.glb',
    yerba: 'assets/scene/Models/cooking/yerba_cocina.glb'
  }
} as const

export const COOKING_SUPPLY_FEEDBACK_STYLE = {
  desktop: { size: 76, offsetX: 0, offsetY: -80, fontSize: 30 },
  mobile: { size: 62, offsetX: 0, offsetY: -64, fontSize: 25 }
} as const

export const COOKING_SUPPLY_LIMIT_STYLE = {
  desktop: { width: 430, height: 86, offsetX: 0, offsetY: -90, fontSize: 26 },
  mobile: { width: 340, height: 74, offsetX: 0, offsetY: -72, fontSize: 22 }
} as const
