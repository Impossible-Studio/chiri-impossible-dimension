export type ForestFlowerId =
  | 'butterfly_bloom'
  | 'spiral_bloom'
  | 'star_bloom'

export interface ForestFlowerDefinition {
  id: ForestFlowerId
  displayName: string
  worldModel: string
  inventoryIcon: string
}

export interface ForestFlowerGroup {
  flowerId: ForestFlowerId
  x: number
  y: number
  z: number
  rotationY: number
}

export interface ForestFlowerSpawn extends ForestFlowerGroup {
  id: number
  groupIndex: number
}

export const FOREST_FLOWERS: readonly ForestFlowerDefinition[] = [
  {
    id: 'butterfly_bloom',
    displayName: 'Butterfly Bloom',
    worldModel:
      'assets/scene/Models/farming/flowers/butterfly_bloom.glb',
    inventoryIcon:
      'assets/scene/ui/inventory/items/flowers/butterfly_bloom.png'
  },
  {
    id: 'spiral_bloom',
    displayName: 'Spiral Bloom',
    worldModel:
      'assets/scene/Models/farming/flowers/spiral_bloom.glb',
    inventoryIcon:
      'assets/scene/ui/inventory/items/flowers/spiral_bloom.png'
  },
  {
    id: 'star_bloom',
    displayName: 'Star Bloom',
    worldModel:
      'assets/scene/Models/farming/flowers/star_bloom.glb',
    inventoryIcon:
      'assets/scene/ui/inventory/items/flowers/star_bloom.png'
  }
] as const

// Flower 1/2/3 map to Butterfly, Spiral and Star respectively. The first
// flower in every group keeps the exact transform supplied in Creator Hub;
// the remaining flowers are distributed around it by a stable seeded layout.
export const FOREST_FLOWER_GROUPS: readonly ForestFlowerGroup[] = [
  { flowerId: 'butterfly_bloom', x: 194.5, y: 28, z: 240, rotationY: 315 },
  { flowerId: 'spiral_bloom', x: 134.25, y: 28, z: 235.25, rotationY: 0 },
  { flowerId: 'star_bloom', x: 391, y: 28, z: 280.75, rotationY: 255 },
  { flowerId: 'butterfly_bloom', x: 400.5, y: 28, z: 243.5, rotationY: 180 },
  { flowerId: 'spiral_bloom', x: 339, y: 28, z: 240, rotationY: 180 },
  { flowerId: 'star_bloom', x: 292.5, y: 28, z: 230, rotationY: 210 }
] as const

export const FOREST_FLOWER_CONFIG = {
  minimumPerGroup: 4,
  maximumPerGroup: 7,
  clusterRadius: 3.4,
  // The widest supplied flower is about 1.73 m across. A 1.9 m center gap
  // prevents petals/colliders from intersecting even after yaw variation.
  minimumSeparation: 1.9,
  scale: 1,
  interactionDistance: 5
} as const

function hashText(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function roundPosition(value: number) {
  return Math.round(value * 100) / 100
}

export function createForestFlowerSpawns(
  groups: readonly ForestFlowerGroup[] = FOREST_FLOWER_GROUPS
): ForestFlowerSpawn[] {
  const spawns: ForestFlowerSpawn[] = []

  groups.forEach((group, groupIndex) => {
    const random = seededRandom(
      hashText(`${group.flowerId}:${group.x}:${group.y}:${group.z}`)
    )
    const count =
      FOREST_FLOWER_CONFIG.minimumPerGroup +
      Math.floor(
        random() *
          (FOREST_FLOWER_CONFIG.maximumPerGroup -
            FOREST_FLOWER_CONFIG.minimumPerGroup +
            1)
      )
    const groupSpawns: ForestFlowerSpawn[] = [
      { ...group, id: groupIndex * 100 + 1, groupIndex }
    ]
    let attempts = 0

    while (groupSpawns.length < count && attempts < 500) {
      attempts++
      const angle = random() * Math.PI * 2
      const radius = 1.35 + random() * (FOREST_FLOWER_CONFIG.clusterRadius - 1.35)
      const x = roundPosition(group.x + Math.cos(angle) * radius)
      const z = roundPosition(group.z + Math.sin(angle) * radius)
      const separated = groupSpawns.every(existing => {
        const dx = existing.x - x
        const dz = existing.z - z
        return (
          dx * dx + dz * dz >=
          FOREST_FLOWER_CONFIG.minimumSeparation ** 2
        )
      })
      if (!separated) continue

      groupSpawns.push({
        ...group,
        id: groupIndex * 100 + groupSpawns.length + 1,
        groupIndex,
        x,
        z,
        rotationY: Math.round(
          (group.rotationY - 28 + random() * 56 + 360) % 360
        )
      })
    }

    spawns.push(...groupSpawns)
  })

  return spawns
}

export const FOREST_FLOWER_SPAWNS = createForestFlowerSpawns()

export function getForestFlowerDefinition(id: ForestFlowerId) {
  return FOREST_FLOWERS.find(flower => flower.id === id)
}
