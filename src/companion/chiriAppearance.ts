import { Quaternion, Vector3 } from '@dcl/sdk/math'

/**
 * Static accessory sockets shared by the local and multiplayer companions.
 * Add an entry when an accessory GLB is ready. The future Chiri moods UI only
 * has to save the matching id in progress.chiri.equippedItems; every client
 * will then render the same attachment.
 *
 * These transforms are local to Chiri's root. Accessories that must deform
 * with the skeleton should instead be exported as a complete Chiri variant.
 */
export interface ChiriAccessoryDefinition {
  id: string
  modelPath: string
  position: Vector3
  rotation: Quaternion
  scale: Vector3
}

export const CHIRI_ACCESSORIES: Record<string, ChiriAccessoryDefinition> = {}

export function getChiriAccessoryDefinition(
  accessoryId: string
): ChiriAccessoryDefinition | undefined {
  return CHIRI_ACCESSORIES[accessoryId]
}
