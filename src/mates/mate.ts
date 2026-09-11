import {
  ColliderLayer,
  engine,
  Entity,
  GltfContainer,
  RaycastQueryType,
  raycastSystem,
  Transform,
  VisibilityComponent
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { isMobile } from '@dcl/sdk/platform'

import { addItem, getItemAmount } from '../farming/inventory'
import { getProgress, syncInventory, syncProgress } from '../farming/player'
import { showNotification } from '../farming/notifications'
import { registerMateInventoryItem } from '../farming/itemData'
import { showItemUnlockPresentation } from '../farming/itemUnlockPresentation'
import { awardPoints } from '../gameplay/points'
import { MATE_COLLECTION_CONFIG, MATE_TYPES, MateDefinition } from './mateConfig'
import { getMateSpawns, MateSpawn } from './mateLocations'
import { canModifyCurrentDimension } from '../house/houseSystem'
import { recordChiriWorldEvent } from '../companion/chiriCare'

interface ActiveMatePickup {
  entity: Entity
  mate: MateDefinition
  spawn: MateSpawn
  position: Vector3
}

const activeMatePickups: ActiveMatePickup[] = []

function getMateScale(mate: MateDefinition, spawn: MateSpawn): number {
  const deviceScale = isMobile()
    ? (mate.mobileScale ?? 1)
    : (mate.desktopScale ?? 1)

  return (
    MATE_COLLECTION_CONFIG.globalScale *
    (mate.globalScale ?? 1) *
    (spawn.scale ?? 1) *
    deviceScale
  )
}

function getMateWorldPosition(mate: MateDefinition, spawn: MateSpawn): Vector3 {
  return Vector3.create(
    spawn.x + (mate.areaOffsetX ?? 0),
    spawn.y,
    spawn.z + (mate.areaOffsetZ ?? 0)
  )
}

function hasCollectedMateSpawn(mateId: string, spawnId: number): boolean {
  return (
    getProgress().collection.collectedMateSpawnIds[mateId]?.includes(spawnId)
    ?? false
  )
}

function collectMate(mate: MateDefinition, spawn: MateSpawn, entity: Entity) {
  const progress = getProgress()
  const collected = progress.collection.collectedMateSpawnIds[mate.id] ?? []

  if (collected.includes(spawn.id)) return

  collected.push(spawn.id)
  progress.collection.collectedMateSpawnIds[mate.id] = collected
  recordChiriWorldEvent(progress, 'find-mate', `mate_${mate.id}`)

  const collectionPoints = awardPoints(
    'mateCollected',
    true,
    `${mate.id}:${spawn.id}`
  )
  const requiredFinds = mate.requiredFinds ?? MATE_COLLECTION_CONFIG.requiredFindsToUnlock
  const inventoryItemId = `mate_${mate.id}`
  const firstUnlock = !progress.collection.ownedMateIds.includes(mate.id)
  addItem(inventoryItemId, 1)
  let message = `${mate.displayName} +1 · ${getItemAmount(inventoryItemId)} available · +${collectionPoints} points`

  if (
    collected.length >= requiredFinds &&
    firstUnlock
  ) {
    progress.collection.ownedMateIds.push(mate.id)

    if (mate.inventoryIcon) {
      showItemUnlockPresentation({
        itemId: inventoryItemId,
        icon: mate.inventoryIcon,
        artworkAspectRatio: 196 / 205
      })
    }

    message = `${mate.displayName} unlocked! · +${collectionPoints} points`
  }

  void syncInventory()
  void syncProgress()
  showNotification(message)
  engine.removeEntity(entity)
}

function createGroundedMate(
  mate: MateDefinition,
  spawn: MateSpawn,
  position: Vector3
) {
  const entity = engine.addEntity()
  const scale = getMateScale(mate, spawn)

  Transform.create(entity, {
    position,
    rotation: Quaternion.fromEulerDegrees(0, spawn.rotationY ?? 0, 0),
    scale: Vector3.create(scale, scale, scale)
  })

  GltfContainer.create(entity, {
    src: mate.worldModel,
    // Mates use proximity collection. They should never become walls, clip
    // Chiri's navigation rays or affect the grounding probes of later mates.
    visibleMeshesCollisionMask: ColliderLayer.CL_NONE,
    invisibleMeshesCollisionMask: ColliderLayer.CL_NONE
  })
  VisibilityComponent.create(entity, { visible: true })
  activeMatePickups.push({ entity, mate, spawn, position })
}

function spawnMate(mate: MateDefinition, spawn: MateSpawn) {
  const configuredPosition = getMateWorldPosition(mate, spawn)
  const probe = engine.addEntity()
  const probePosition = Vector3.create(
    configuredPosition.x,
    configuredPosition.y + (spawn.groundProbeStartHeight ?? MATE_COLLECTION_CONFIG.groundProbeStartHeight),
    configuredPosition.z
  )

  Transform.create(probe, {
    position: probePosition,
    rotation: Quaternion.Identity(),
    scale: Vector3.create(1, 1, 1)
  })

  raycastSystem.registerGlobalDirectionRaycast(
    {
      entity: probe,
      opts: {
        direction: Vector3.create(0, -1, 0),
        maxDistance: MATE_COLLECTION_CONFIG.groundProbeDistance,
        queryType: RaycastQueryType.RQT_HIT_FIRST,
        collisionMask: ColliderLayer.CL_PHYSICS,
        continuous: false
      }
    },
    result => {
      const hitPosition = result.hits[0]?.position
      const groundedPosition = hitPosition
        ? Vector3.create(
            configuredPosition.x,
            hitPosition.y + MATE_COLLECTION_CONFIG.groundClearance,
            configuredPosition.z
          )
        : configuredPosition

      raycastSystem.removeRaycasterEntity(probe)
      engine.removeEntity(probe)

      if (!hasCollectedMateSpawn(mate.id, spawn.id)) {
        createGroundedMate(mate, spawn, groundedPosition)
      }
    }
  )
}

function updateMatePickups() {
  if (!canModifyCurrentDimension()) return

  const player = getPlayer()
  if (!player?.position) return

  for (let index = activeMatePickups.length - 1; index >= 0; index--) {
    const pickup = activeMatePickups[index]
    const dx = player.position.x - pickup.position.x
    const dz = player.position.z - pickup.position.z
    const radius = MATE_COLLECTION_CONFIG.pickupRadius

    if (dx * dx + dz * dz > radius * radius) continue

    collectMate(pickup.mate, pickup.spawn, pickup.entity)
    activeMatePickups.splice(index, 1)
  }
}

export function initializeMateSystem() {
  for (const mate of MATE_TYPES) {
    registerMateInventoryItem(
      mate.id,
      mate.displayName,
      mate.inventoryIcon ?? ''
    )

    for (const spawn of getMateSpawns(mate)) {
      if (!hasCollectedMateSpawn(mate.id, spawn.id)) {
        spawnMate(mate, spawn)
      }
    }
  }

  engine.addSystem(updateMatePickups)
}

export function getOwnedMateIds(): string[] {
  return getProgress().collection.ownedMateIds
}

// The selected mate is already persisted. Showing it in Chiri's hand needs a
// Chiri GLB variant with that mate attached to the hand bone and animated with
// the same clips, because SDK7 cannot parent a separate GLB to an inner bone.
export function equipMateForChiri(mateId: string | null): boolean {
  const progress = getProgress()

  if (mateId !== null && !progress.collection.ownedMateIds.includes(mateId)) {
    return false
  }

  progress.collection.equippedMateId = mateId
  void syncProgress()
  return true
}

export function getEquippedMateId(): string | null {
  return getProgress().collection.equippedMateId
}
