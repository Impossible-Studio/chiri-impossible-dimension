export type SharedZoneBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

/** Authoritative bounds and safety limits for the interior Void collab zone. */
export const SHARED_ZONE_CONFIG = {
  enabled: true,
  protocolVersion: 1,
  storageKey: 'shared-zone/state-v1',
  lockDurationMs: 15_000,
  maxPlacedChirisPerPlayer: 1,
  allowedChiriVariants: ['classic', 'mecha'] as readonly string[],
  maxSharedObjectsPerPlayer: 40,
  maxObjectIdLength: 120,
  maxItemIdLength: 100,
  bounds: {
    // Derived from the transformed bounds of interior_void.glb, with a small
    // inset so objects cannot be pushed through its outer shell.
    minX: 70,
    maxX: 423,
    minY: 1.5,
    maxY: 24,
    minZ: 183,
    maxZ: 453
  } satisfies SharedZoneBounds
} as const

export function isInsideSharedZone(position: { x: number; y: number; z: number }): boolean {
  const bounds = SHARED_ZONE_CONFIG.bounds
  return Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z) &&
    position.x >= bounds.minX && position.x <= bounds.maxX &&
    position.y >= bounds.minY && position.y <= bounds.maxY &&
    position.z >= bounds.minZ && position.z <= bounds.maxZ
}
