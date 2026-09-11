import { MateDefinition } from './mateConfig'

export interface MateSpawn {
  id: number
  mateId: string
  x: number
  y: number
  z: number
  rotationY?: number
  scale?: number
  groundProbeStartHeight?: number
}

// This file will contain the 20 positions for each mate type. We will build
// them from the real mate list so a spawn never points to a missing GLB.
// It supports lines, arcs and isolated discoveries with the same stable ids
// used for player-specific persistence.
// Positions reuse the explored seed regions so they sit on known traversable
// terrain. Every id is stable: collecting one only hides that exact mate for
// the current player, never for everybody else.
const BASE_MATE_SPAWNS: MateSpawn[] = [
  // Infinito — former Matexito route in the tomato area. IDs 21-40 keep
  // these discoveries independent from the original Infinito route below.
  // Coordinates compensate for Infinito's own area offset, preserving the
  // exact world positions previously occupied by Matexito.
  { id: 21, mateId: 'matexito_infinito', x: 193, y: 28.5, z: 305, rotationY: 10 },
  { id: 22, mateId: 'matexito_infinito', x: 199, y: 28.4, z: 301, rotationY: 35 },
  { id: 23, mateId: 'matexito_infinito', x: 205, y: 28.3, z: 297, rotationY: 55 },
  { id: 24, mateId: 'matexito_infinito', x: 211, y: 28.3, z: 293, rotationY: 75 },
  { id: 25, mateId: 'matexito_infinito', x: 217, y: 28.2, z: 289, rotationY: 95 },
  { id: 26, mateId: 'matexito_infinito', x: 230, y: 28.2, z: 273, rotationY: 130 },
  { id: 27, mateId: 'matexito_infinito', x: 240, y: 28.2, z: 272, rotationY: 150 },
  { id: 28, mateId: 'matexito_infinito', x: 250, y: 28.2, z: 272, rotationY: 170 },
  { id: 29, mateId: 'matexito_infinito', x: 264, y: 27.7, z: 271, rotationY: 190 },
  { id: 30, mateId: 'matexito_infinito', x: 277, y: 27.7, z: 271, rotationY: 210 },
  { id: 31, mateId: 'matexito_infinito', x: 291, y: 27.7, z: 274, rotationY: 230 },
  { id: 32, mateId: 'matexito_infinito', x: 303, y: 27.8, z: 280, rotationY: 250 },
  { id: 33, mateId: 'matexito_infinito', x: 313, y: 27.8, z: 282, rotationY: 270 },
  { id: 34, mateId: 'matexito_infinito', x: 323, y: 27.8, z: 281, rotationY: 290 },
  { id: 35, mateId: 'matexito_infinito', x: 333, y: 27.8, z: 280, rotationY: 310 },
  { id: 36, mateId: 'matexito_infinito', x: 344, y: 27.8, z: 280, rotationY: 330 },
  { id: 37, mateId: 'matexito_infinito', x: 188, y: 28.6, z: 313, rotationY: 0 },
  { id: 38, mateId: 'matexito_infinito', x: 215, y: 28.3, z: 281, rotationY: 45 },
  { id: 39, mateId: 'matexito_infinito', x: 255, y: 27.7, z: 279, rotationY: 90 },
  { id: 40, mateId: 'matexito_infinito', x: 355, y: 27.8, z: 288, rotationY: 135 },

  // Infinito — carrot islands: a wide path, then isolated discoveries.
  { id: 1, mateId: 'matexito_infinito', x: 311, y: 23.7, z: 51, rotationY: 20 },
  { id: 2, mateId: 'matexito_infinito', x: 323, y: 22, z: 58, rotationY: 40 },
  { id: 3, mateId: 'matexito_infinito', x: 335, y: 20, z: 66, rotationY: 60 },
  { id: 4, mateId: 'matexito_infinito', x: 347, y: 19, z: 75, rotationY: 80 },
  { id: 5, mateId: 'matexito_infinito', x: 357, y: 18.4, z: 54, rotationY: 100 },
  { id: 6, mateId: 'matexito_infinito', x: 360, y: 17, z: 65, rotationY: 120 },
  { id: 7, mateId: 'matexito_infinito', x: 366, y: 16, z: 78, rotationY: 140 },
  { id: 8, mateId: 'matexito_infinito', x: 372, y: 15.9, z: 96, rotationY: 160 },
  { id: 9, mateId: 'matexito_infinito', x: 380, y: 15, z: 110, rotationY: 180 },
  { id: 10, mateId: 'matexito_infinito', x: 390, y: 14, z: 123, rotationY: 200 },
  { id: 11, mateId: 'matexito_infinito', x: 400, y: 12, z: 137, rotationY: 220 },
  { id: 12, mateId: 'matexito_infinito', x: 405, y: 4.3, z: 161, rotationY: 240 },
  { id: 13, mateId: 'matexito_infinito', x: 417, y: 13, z: 146, rotationY: 260 },
  { id: 14, mateId: 'matexito_infinito', x: 428, y: 24, z: 130, rotationY: 280 },
  { id: 15, mateId: 'matexito_infinito', x: 443, y: 43.5, z: 104, rotationY: 300 },
  { id: 16, mateId: 'matexito_infinito', x: 393, y: 13.7, z: 28, rotationY: 320 },
  { id: 17, mateId: 'matexito_infinito', x: 366, y: 18, z: 46, rotationY: 340 },
  { id: 18, mateId: 'matexito_infinito', x: 330, y: 22, z: 45, rotationY: 65 },
  { id: 19, mateId: 'matexito_infinito', x: 219, y: 9.3, z: 95, rotationY: 110 },
  { id: 20, mateId: 'matexito_infinito', x: 235, y: 10, z: 101, rotationY: 155 },

  // Supersónico — onion highlands: a gentle arc around the island.
  { id: 1, mateId: 'matexito_supersonico', x: 101, y: 27.5, z: 75, rotationY: 0 },
  { id: 2, mateId: 'matexito_supersonico', x: 108, y: 30, z: 70, rotationY: 20 },
  { id: 3, mateId: 'matexito_supersonico', x: 116, y: 33, z: 65, rotationY: 40 },
  { id: 4, mateId: 'matexito_supersonico', x: 124, y: 36.4, z: 62, rotationY: 60 },
  { id: 5, mateId: 'matexito_supersonico', x: 133, y: 42, z: 57, rotationY: 80 },
  { id: 6, mateId: 'matexito_supersonico', x: 142, y: 50, z: 51, rotationY: 100 },
  { id: 7, mateId: 'matexito_supersonico', x: 151, y: 61, z: 44, rotationY: 120 },
  { id: 8, mateId: 'matexito_supersonico', x: 159, y: 69.9, z: 39, rotationY: 140 },
  { id: 9, mateId: 'matexito_supersonico', x: 157, y: 65, z: 56, rotationY: 160 },
  { id: 10, mateId: 'matexito_supersonico', x: 155, y: 60, z: 74, rotationY: 180 },
  { id: 11, mateId: 'matexito_supersonico', x: 153, y: 56, z: 92, rotationY: 200 },
  { id: 12, mateId: 'matexito_supersonico', x: 157, y: 52.4, z: 112, rotationY: 220 },
  { id: 13, mateId: 'matexito_supersonico', x: 159, y: 52.4, z: 143, rotationY: 240 },
  { id: 14, mateId: 'matexito_supersonico', x: 145, y: 58, z: 144, rotationY: 260 },
  { id: 15, mateId: 'matexito_supersonico', x: 128, y: 70, z: 145, rotationY: 280 },
  { id: 16, mateId: 'matexito_supersonico', x: 112, y: 82, z: 145, rotationY: 300 },
  { id: 17, mateId: 'matexito_supersonico', x: 101, y: 92.4, z: 145, rotationY: 320 },
  { id: 18, mateId: 'matexito_supersonico', x: 96, y: 84.9, z: 112, rotationY: 340 },
  { id: 19, mateId: 'matexito_supersonico', x: 97, y: 85, z: 90, rotationY: 45 },
  { id: 20, mateId: 'matexito_supersonico', x: 102, y: 78, z: 80, rotationY: 90 },

  // Reliquia — discoveries spread across the whole world. Only one anchor is
  // near the wider house region; the rest guide exploration toward distant
  // islands and paths instead of forming a dense row around the garden.
  { id: 1, mateId: 'matexito_reliquia', x: 314.5, y: 38, z: 401.75, rotationY: 10 },
  { id: 2, mateId: 'matexito_reliquia', x: 257.38, y: 2.75, z: 408.56, rotationY: 30 },
  { id: 3, mateId: 'matexito_reliquia', x: 177.75, y: 1.94, z: 362.7, rotationY: 50 },
  { id: 4, mateId: 'matexito_reliquia', x: 142.23, y: 51, z: 385.32, rotationY: 70 },
  { id: 5, mateId: 'matexito_reliquia', x: 202.11, y: 27.8, z: 384.02, rotationY: 90 },
  { id: 6, mateId: 'matexito_reliquia', x: 228.79, y: 29.57, z: 342.03, rotationY: 110 },
  { id: 7, mateId: 'matexito_reliquia', x: 162.38, y: 28.56, z: 329.37, rotationY: 130 },
  { id: 8, mateId: 'matexito_reliquia', x: 185.62, y: 28.27, z: 298.1, rotationY: 150 },
  { id: 9, mateId: 'matexito_reliquia', x: 232.31, y: 27.99, z: 280.61, rotationY: 170 },
  { id: 10, mateId: 'matexito_reliquia', x: 303.34, y: 27.74, z: 253.89, rotationY: 190 },
  { id: 11, mateId: 'matexito_reliquia', x: 339.83, y: 27.34, z: 220.36, rotationY: 210 },
  { id: 12, mateId: 'matexito_reliquia', x: 410.24, y: 48.97, z: 268.94, rotationY: 230 },
  { id: 13, mateId: 'matexito_reliquia', x: 381.76, y: 2.89, z: 176.99, rotationY: 250 },
  { id: 14, mateId: 'matexito_reliquia', x: 405.44, y: 4.25, z: 160.83, rotationY: 270 },
  { id: 15, mateId: 'matexito_reliquia', x: 443.29, y: 43.54, z: 104.09, rotationY: 290 },
  { id: 16, mateId: 'matexito_reliquia', x: 371.94, y: 15.89, z: 96.08, rotationY: 310 },
  { id: 17, mateId: 'matexito_reliquia', x: 218.99, y: 9.33, z: 95.32, rotationY: 330 },
  { id: 18, mateId: 'matexito_reliquia', x: 101.16, y: 27.51, z: 75.23, rotationY: 45 },
  { id: 19, mateId: 'matexito_reliquia', x: 158.88, y: 52.44, z: 143.47, rotationY: 90 },
  { id: 20, mateId: 'matexito_reliquia', x: 101.14, y: 92.35, z: 144.87, rotationY: 135 }
]

function getStableMateSeed(mateId: string) {
  let seed = 2166136261

  for (let index = 0; index < mateId.length; index++) {
    seed ^= mateId.charCodeAt(index)
    seed = Math.imul(seed, 16777619)
  }

  return seed >>> 0
}

function seededRandom(seed: number) {
  let state = seed >>> 0

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function roundPosition(value: number) {
  return Math.round(value * 10) / 10
}

function expandReliqueSpawns(
  baseSpawns: MateSpawn[],
  targetCount: number,
  random: () => number
) {
  const expanded = [...baseSpawns]
  const highestBaseId = Math.max(...baseSpawns.map(spawn => spawn.id))
  const minimumSeparation = 8
  const houseCenter = { x: 328, z: 338 }
  const houseExclusionRadius = 70
  let attempts = 0

  while (expanded.length < targetCount && attempts < 3000) {
    attempts++
    const anchor = baseSpawns[Math.floor(random() * baseSpawns.length)]
    const angle = random() * Math.PI * 2
    const radius = 7 + random() * 10
    const x = roundPosition(anchor.x + Math.cos(angle) * radius)
    const z = roundPosition(anchor.z + Math.sin(angle) * radius)
    const houseDx = x - houseCenter.x
    const houseDz = z - houseCenter.z

    if (
      houseDx * houseDx + houseDz * houseDz <
      houseExclusionRadius * houseExclusionRadius
    ) {
      continue
    }

    const tooClose = expanded.some(existing => {
      const dx = existing.x - x
      const dz = existing.z - z
      return dx * dx + dz * dz < minimumSeparation * minimumSeparation
    })
    if (tooClose) continue

    expanded.push({
      id: highestBaseId + expanded.length - baseSpawns.length + 1,
      mateId: 'matexito_reliquia',
      x,
      y: anchor.y,
      z,
      rotationY: Math.round(random() * 359)
    })
  }

  return expanded.slice(0, targetCount)
}

// Extra positions are generated once from the hand-placed routes. The random
// distribution is deterministic: the same mate always receives the same IDs
// and coordinates, which is required for per-player persistence.
function expandMateSpawns(
  mateId: string,
  targetCount: number
): MateSpawn[] {
  const baseSpawns = BASE_MATE_SPAWNS.filter(
    spawn => spawn.mateId === mateId
  )

  if (baseSpawns.length === 0 || baseSpawns.length >= targetCount) {
    return baseSpawns.slice(0, targetCount)
  }

  const expandedSpawns = [...baseSpawns]
  const random = seededRandom(getStableMateSeed(mateId))

  if (mateId === 'matexito_reliquia') {
    return expandReliqueSpawns(baseSpawns, targetCount, random)
  }

  const highestBaseId = Math.max(...baseSpawns.map(spawn => spawn.id))
  const additionalCount = targetCount - baseSpawns.length

  for (let index = 0; index < additionalCount; index++) {
    const anchor = baseSpawns[index % baseSpawns.length]
    const ring = Math.floor(index / baseSpawns.length)
    const angle = random() * Math.PI * 2
    // Keep discoveries several metres apart while staying close to terrain
    // whose height was already verified by a hand-placed route point.
    const radius = 3 + random() * 2.5 + ring * 1.75

    expandedSpawns.push({
      id: highestBaseId + index + 1,
      mateId,
      x: roundPosition(anchor.x + Math.cos(angle) * radius),
      y: anchor.y,
      z: roundPosition(anchor.z + Math.sin(angle) * radius),
      rotationY: Math.round(random() * 359)
    })
  }

  return expandedSpawns
}

export function getMateSpawns(mate: MateDefinition): MateSpawn[] {
  const spawns = expandMateSpawns(
    mate.id,
    mate.spawnCount ?? BASE_MATE_SPAWNS.length
  )
  if (mate.id !== 'matexito_infinito') return spawns
  // Reposition existing IDs: keep the total at 100 and never reset collection.
  return spawns.map(spawn => {
    const point = HOUSE_INFINITE_MATES.find(point => point.id === spawn.id)
    return point ? { ...spawn, x: point.x - (mate.areaOffsetX ?? 0), y: point.y,
      z: point.z - (mate.areaOffsetZ ?? 0), groundProbeStartHeight: 2 } : spawn
  })
}

// WORLD coordinates, not route-relative. A short ground probe avoids catching
// another floor/roof above the backyard. Adjust here after an in-world walk-through.
export const HOUSE_INFINITE_MATES = [
  { id: 89, x: 305, y: 31, z: 350 },
  { id: 90, x: 312, y: 31, z: 359 },
  { id: 91, x: 365, y: 31, z: 350 },
  { id: 92, x: 373, y: 31, z: 360 },
  { id: 93, x: 304, y: 29, z: 402 },
  { id: 94, x: 372, y: 29, z: 405 },
  { id: 95, x: 328, y: 31, z: 373 },
  { id: 96, x: 335, y: 31, z: 373 },
  { id: 97, x: 342, y: 31, z: 373 },
  { id: 98, x: 350, y: 31, z: 380 },
  { id: 99, x: 350, y: 28, z: 390 },
  { id: 100, x: 339, y: 28, z: 395 }
]
