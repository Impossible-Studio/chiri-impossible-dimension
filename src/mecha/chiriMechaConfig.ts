export type ChiriMechaPartId =
  | 'head'
  | 'arm-left'
  | 'arm-right'
  | 'leg-left'
  | 'leg-right'
  | 'cabine'

export interface ChiriMechaPartDefinition {
  id: ChiriMechaPartId
  displayName: string
  entityName: string
  worldModel: string
  inventoryItemId: string
  inventoryIcon: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: number
}

export const CHIRI_MECHA_VARIANT_ID = 'mecha'
export const CHIRI_MECHA_MISSION_ID =
  'chapter-2-mission-1-find-chiri-mecha-parts'
export const CHIRI_MECHA_CRAFT_ITEM_ID = 'craft_chiri_mecha'
// Legacy quest id: completed during automatic assembly to clean old saves.
export const CHIRI_MECHA_CRAFT_QUEST_ID = 'craft-ready-chiri-mecha'

export const CHIRI_MECHA_COLLECTION_CONFIG = {
  pointerHoverText: 'Collect Chiri Mecha Part',
  pointerMaxDistance: 8,
  modelFolder: 'assets/scene/Models/collectibles/chiri-mecha/parts',
  inventoryIconFolder: 'assets/scene/ui/inventory/items/chiri-mecha',
  craftItemIcon:
    'assets/scene/ui/inventory/items/chiri-mecha/craft_chiri_mecha.png',
  mission: {
    chapter: 2,
    mission: 1,
    title: 'Find the Chiri Mecha parts',
    info: 'Find the six Chiri Mecha parts hidden throughout the forest.'
  }
} as const

// These positions come from the placements supplied for the six forest/world
// pieces. They are deliberately data-only so every location, rotation and
// scale can be adjusted without touching the collection logic.
export const CHIRI_MECHA_PARTS: readonly ChiriMechaPartDefinition[] = [
  {
    id: 'head',
    displayName: 'Chiri Mecha Head',
    entityName: 'head_chirimecha.glb',
    worldModel: `${CHIRI_MECHA_COLLECTION_CONFIG.modelFolder}/head_chirimecha.glb`,
    inventoryItemId: 'chiri_mecha_head',
    inventoryIcon: `${CHIRI_MECHA_COLLECTION_CONFIG.inventoryIconFolder}/head_chirimecha.png`,
    position: { x: 385.75, y: 26.75, z: 200.75 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 4
  },
  {
    id: 'arm-left',
    displayName: 'Chiri Mecha Left Arm',
    entityName: 'arm1_chirimecha.glb',
    worldModel: `${CHIRI_MECHA_COLLECTION_CONFIG.modelFolder}/arm1_chirimecha.glb`,
    inventoryItemId: 'chiri_mecha_arm_1',
    inventoryIcon: `${CHIRI_MECHA_COLLECTION_CONFIG.inventoryIconFolder}/arm1_chirimecha.png`,
    position: { x: 139.05, y: 24.47, z: 196.8 },
    rotation: { x: 14.11, y: 1.06, z: 4.32 },
    scale: 3
  },
  {
    id: 'arm-right',
    displayName: 'Chiri Mecha Right Arm',
    entityName: 'arm2_chirimecha.glb',
    worldModel: `${CHIRI_MECHA_COLLECTION_CONFIG.modelFolder}/arm2_chirimecha.glb`,
    inventoryItemId: 'chiri_mecha_arm_2',
    inventoryIcon: `${CHIRI_MECHA_COLLECTION_CONFIG.inventoryIconFolder}/arm2_chirimecha.png`,
    position: { x: 286.5, y: 27.59, z: 237.25 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 3
  },
  {
    id: 'leg-left',
    displayName: 'Chiri Mecha Left Leg',
    entityName: 'leg1_chirimecha.glb',
    worldModel: `${CHIRI_MECHA_COLLECTION_CONFIG.modelFolder}/leg1_chirimecha.glb`,
    inventoryItemId: 'chiri_mecha_leg_1',
    inventoryIcon: `${CHIRI_MECHA_COLLECTION_CONFIG.inventoryIconFolder}/leg1_chirimecha.png`,
    position: { x: 333.75, y: 51.25, z: 260 },
    rotation: { x: 0, y: 345, z: 345 },
    scale: 3
  },
  {
    id: 'leg-right',
    displayName: 'Chiri Mecha Right Leg',
    entityName: 'leg2_chirimecha.glb',
    worldModel: `${CHIRI_MECHA_COLLECTION_CONFIG.modelFolder}/leg2_chirimecha.glb`,
    inventoryItemId: 'chiri_mecha_leg_2',
    inventoryIcon: `${CHIRI_MECHA_COLLECTION_CONFIG.inventoryIconFolder}/leg2_chirimecha.png`,
    position: { x: 142, y: 50.02, z: 379.5 },
    rotation: { x: 355.03, y: 60.38, z: 336.34 },
    scale: 3
  },
  {
    id: 'cabine',
    displayName: 'Chiri Mecha Cabin',
    entityName: 'cabine_chirimecha.glb',
    worldModel: `${CHIRI_MECHA_COLLECTION_CONFIG.modelFolder}/cabine_chirimecha.glb`,
    inventoryItemId: 'chiri_mecha_cabine',
    inventoryIcon: `${CHIRI_MECHA_COLLECTION_CONFIG.inventoryIconFolder}/cabine_chirimecha.png`,
    position: { x: 412.25, y: 26.69, z: 284 },
    rotation: { x: 343.26, y: 10.65, z: 15.13 },
    scale: 3.5
  }
]

export const CHIRI_MECHA_PART_IDS = CHIRI_MECHA_PARTS.map(part => part.id)
