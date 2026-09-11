export interface WaterMachinePartDefinition {
  id: string
  itemId: string
  name: string
  model: string
  inventoryIcon: string
}

const ROOT = 'assets/scene/Models/water_machine'
export const WATER_MACHINE_INVENTORY_ICON_ROOT = 'assets/scene/ui/inventory/items/water_machine'

export const WATER_MACHINE_ORIGIN = { x: 256, y: 0, z: 256 } as const
export const WATER_MACHINE_INTERACTION_DISTANCE = 8
export const WATER_MACHINE_MISSION_ID = 'chapter-3-mission-1-repair-irrigation'
export const WATER_MACHINE_COMPLETE_ITEM_ID = 'water_machine_complete'

export const WATER_MACHINE_MODELS = {
  broken: `${ROOT}/broken_machine.glb`,
  working: `${ROOT}/working_machine.glb`
} as const

export const WATER_MACHINE_PARTS: readonly WaterMachinePartDefinition[] = Array.from(
  { length: 5 },
  (_, index) => {
    const number = index + 1
    return {
      id: `machine-part-${number}`,
      itemId: `water_machine_part_${number}`,
      name: `Water Machine Part ${number}`,
      model: `${ROOT}/machine_part${number}.glb`,
      inventoryIcon: `${WATER_MACHINE_INVENTORY_ICON_ROOT}/water_machine_part_${number}.png`
    }
  }
)
