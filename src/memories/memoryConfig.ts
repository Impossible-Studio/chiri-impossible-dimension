export interface MemoryDefinition {
  id: string
  chapter: 1 | 2 | 3
  model: string
  itemId: string
  displayName: string
}

const ROOT = 'assets/scene/Models/memories'

export const MEMORY_WORLD_ORIGIN = { x: 256, y: 0, z: 256 } as const

export const MEMORIES: readonly MemoryDefinition[] = Array.from(
  { length: 12 },
  (_, index) => {
    const number = index + 1
    return {
      id: `memory-${number}`,
      chapter: (Math.floor(index / 4) + 1) as 1 | 2 | 3,
      model: `${ROOT}/memory_${number}.glb`,
      itemId: `chiri-memory-${number}`,
      displayName: `Memory ${number}`
    }
  }
)

export const MEMORY_INTERACTION_DISTANCE = 8
