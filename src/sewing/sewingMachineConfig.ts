// The sewing machine is placed beside the first flower clearing.  Keeping the
// transform here makes its final art placement easy to tune without touching
// the collection behaviour.
export const SEWING_MACHINE_MODEL =
  'assets/scene/Models/sewing_machine/sewing_machine.glb'

export const SEWING_MACHINE_INVENTORY_ICON =
  'assets/scene/ui/inventory/items/sewing_machine/sewing_machine.png'

export const SEWING_MACHINE_ITEM_ID = 'sewing_machine'
export const SEWING_MACHINE_INTERACTION_DISTANCE = 8

export const SEWING_MACHINE_TRANSFORM = {
  position: { x: 211.25, y: 28, z: 252.25 },
  rotationY: 315,
  scale: 1
} as const
