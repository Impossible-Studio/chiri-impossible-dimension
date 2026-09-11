// Add every mate model here once its GLB has been copied into
// assets/scene/Models/collectibles/mates/. A world model and an inventory PNG
// are intentionally separate because the same mate needs both uses.
export interface MateDefinition {
  id: string
  displayName: string
  worldModel: string
  // Add the PNG once the Inventory art is ready. Until then the mate is still
  // owned and persisted, but its final Inventory card art is intentionally off.
  inventoryIcon?: string
  globalScale?: number
  desktopScale?: number
  mobileScale?: number
  requiredFinds?: number
  spawnCount?: number
  // Applied to every route point. Use this to keep a collection route near a
  // seed region without ever placing it on top of the seed jars themselves.
  areaOffsetX?: number
  areaOffsetZ?: number
}

export const MATE_COLLECTION_CONFIG = {
  globalScale: 0.5,
  pickupRadius: 1.25,
  // The first physical mate unlocks its Inventory/Cooking card. Every pickup
  // is then an actual consumable unit shown by the quantity badge.
  requiredFindsToUnlock: 1,
  // Every configured/generated XZ point is projected onto the first physics
  // surface below it before its GLB becomes visible. This keeps random mates
  // from retaining an anchor's Y while the terrain slopes or intersects props.
  groundProbeStartHeight: 12,
  groundProbeDistance: 30,
  groundClearance: 0.03
} as const

export const MATE_TYPES: MateDefinition[] = [
  {
    id: 'matexito_infinito',
    displayName: 'Matexito Infinito',
    worldModel: 'assets/scene/Models/collectibles/mates/matexito_infinito.glb',
    inventoryIcon: 'assets/scene/ui/inventory/items/mates/mate_infinite.png',
    globalScale: 1,
    desktopScale: 1,
    mobileScale: 1,
    spawnCount: 100,
    requiredFinds: 1,
    areaOffsetX: -11,
    areaOffsetZ: 13
  },
  {
    id: 'matexito_supersonico',
    displayName: 'Matexito Supersónico',
    worldModel: 'assets/scene/Models/collectibles/mates/matexito_supersonico.glb',
    inventoryIcon: 'assets/scene/ui/inventory/items/mates/mate_supersonic.png',
    globalScale: 1,
    desktopScale: 1,
    mobileScale: 1,
    spawnCount: 50,
    areaOffsetX: 13,
    areaOffsetZ: 9
  },
  {
    id: 'matexito_reliquia',
    displayName: 'Mate Relique',
    worldModel: 'assets/scene/Models/collectibles/mates/matexito_reliquia.glb',
    inventoryIcon: 'assets/scene/ui/inventory/items/mates/mate_relique.png',
    globalScale: 1,
    desktopScale: 1,
    mobileScale: 1,
    spawnCount: 50,
    areaOffsetX: 0,
    areaOffsetZ: 0
  }
]
