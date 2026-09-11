export const CHIRI_PRESENCE_CONFIG = {
  // Moving companions publish at most five transforms per second. A quiet
  // heartbeat keeps server presence alive without flooding the room.
  publishIntervalSeconds: 0.2,
  heartbeatSeconds: 3,
  serverTimeoutSeconds: 10,
  serverCleanupIntervalSeconds: 2,
  positionChangeThreshold: 0.04,
  rotationChangeThreshold: 0.012,
  interpolationSpeed: 11,
  maxEquippedItems: 16,
  maxAccessoryIdLength: 80,
  // Whole-world safety bounds. These are intentionally broader than the
  // current terrain while still rejecting invalid or malicious transforms.
  bounds: {
    minX: -32,
    maxX: 544,
    minY: -64,
    maxY: 320,
    minZ: -32,
    maxZ: 544
  },
  allowedVariants: ['classic', 'mecha'] as readonly string[],
  allowedAnimations: [
    'idle',
    'walk',
    'run',
    'jump',
    'fly',
    'wave',
    'bored'
  ] as readonly string[]
} as const
