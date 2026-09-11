import {
  ColliderLayer,
  engine,
  type Entity,
  GltfContainer,
  InputAction,
  pointerEventsSystem,
  Transform,
  VisibilityComponent
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'

import { canModifyCurrentDimension } from '../house/houseSystem'
import { addItem, getItemAmount } from './inventory'
import { showItemUnlockPresentation } from './itemUnlockPresentation'
import { showNotification } from './notifications'
import {
  addCollected,
  getProgress,
  syncCollected,
  syncInventory,
  syncProgress,
  wasCollected
} from './player'
import { emitStoryMissionEvent } from './storyProgression'
import { awardPoints } from '../gameplay/points'
import {
  FOREST_FLOWERS,
  FOREST_FLOWER_CONFIG,
  FOREST_FLOWER_SPAWNS,
  getForestFlowerDefinition,
  type ForestFlowerDefinition,
  type ForestFlowerSpawn
} from './flowerConfig'

const FLOWER_COLLECTION_PREFIX = 'forest-flower'

function collectionKey(flowerId: string) {
  return `${FLOWER_COLLECTION_PREFIX}:${flowerId}`
}

function discoveryFlag(flowerId: string) {
  return `forestFlowerDiscovered:${flowerId}`
}

function hasDiscoveredEveryFlowerType() {
  const flags = getProgress().story.flags
  return FOREST_FLOWERS.every(flower => flags[discoveryFlag(flower.id)] === true)
}

function collectFlower(
  entity: Entity,
  flower: ForestFlowerDefinition,
  spawn: ForestFlowerSpawn
) {
  if (!canModifyCurrentDimension()) return

  const key = collectionKey(flower.id)
  if (wasCollected(key, spawn.id)) return

  const progress = getProgress()
  const firstOfType = progress.story.flags[discoveryFlag(flower.id)] !== true

  addItem(flower.id, 1)
  addCollected(key, spawn.id)
  progress.story.flags[discoveryFlag(flower.id)] = true
  const earnedPoints = awardPoints(
    'flowerCollected',
    false,
    `${flower.id}:${spawn.id}`
  )

  if (firstOfType) {
    showItemUnlockPresentation({
      itemId: flower.id,
      icon: flower.inventoryIcon,
      artworkAspectRatio: 1
    })
  }

  emitStoryMissionEvent('first-forest-flower-seed-found')
  if (hasDiscoveredEveryFlowerType()) {
    emitStoryMissionEvent('all-forest-flower-seed-types-found')
  }

  void syncCollected()
  void syncInventory()
  void syncProgress()
  showNotification(
    `${flower.displayName} +1 · ${getItemAmount(flower.id)} collected · +${earnedPoints} points`
  )
  engine.removeEntity(entity)
}

function spawnFlower(spawn: ForestFlowerSpawn) {
  const flower = getForestFlowerDefinition(spawn.flowerId)
  if (!flower || wasCollected(collectionKey(flower.id), spawn.id)) return

  const entity = engine.addEntity()
  Transform.create(entity, {
    position: Vector3.create(spawn.x, spawn.y, spawn.z),
    rotation: Quaternion.fromEulerDegrees(0, spawn.rotationY, 0),
    scale: Vector3.create(
      FOREST_FLOWER_CONFIG.scale,
      FOREST_FLOWER_CONFIG.scale,
      FOREST_FLOWER_CONFIG.scale
    )
  })
  GltfContainer.create(entity, {
    src: flower.worldModel,
    // The dedicated *_collider node remains clickable, while flower groups
    // never block the player, Chiri or another collectible's grounding ray.
    visibleMeshesCollisionMask: ColliderLayer.CL_NONE,
    invisibleMeshesCollisionMask: ColliderLayer.CL_POINTER
  })
  VisibilityComponent.create(entity, { visible: true })

  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: `Collect ${flower.displayName}`,
        maxDistance: FOREST_FLOWER_CONFIG.interactionDistance
      }
    },
    () => collectFlower(entity, flower, spawn)
  )
}

export function initializeForestFlowerSystem() {
  for (const spawn of FOREST_FLOWER_SPAWNS) spawnFlower(spawn)
}
