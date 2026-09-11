import {
  Animator,
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
import { getPlayer } from '@dcl/sdk/players'

import { canModifyCurrentDimension } from '../house/houseSystem'
import { addItem } from './inventory'
import { showItemUnlockPresentation } from './itemUnlockPresentation'
import { showNotification } from './notifications'
import {
  getProgress,
  isPlayerReady,
  syncInventory,
  syncProgress
} from './player'
import { emitStoryMissionEvent } from './storyProgression'
import { awardPoints } from '../gameplay/points'
import {
  FOLLOW_ANTS_MISSION_ID,
  getStoryWorldState,
  STORY_WORLD_CONFIG,
  type HoodDoorWorldModel
} from './storyWorldConfig'

let chapterOneColliderEntity: Entity | undefined
let hoodDoorEntity: Entity | undefined
let hoodDoorModel: HoodDoorWorldModel | undefined
let upperVoidDoorEntity: Entity | undefined
let lowerVoidDoorEntity: Entity | undefined
let magicMapEntity: Entity | undefined
let initialized = false

function storyOriginTransform() {
  return {
    position: Vector3.create(
      STORY_WORLD_CONFIG.origin.x,
      STORY_WORLD_CONFIG.origin.y,
      STORY_WORLD_CONFIG.origin.z
    ),
    rotation: Quaternion.Identity(),
    scale: Vector3.create(1, 1, 1)
  }
}

function spawnStoryModel(src: string) {
  const entity = engine.addEntity()
  Transform.create(entity, storyOriginTransform())
  GltfContainer.create(entity, {
    src,
    visibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS,
    invisibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS
  })
  VisibilityComponent.create(entity, { visible: true })
  return entity
}

function removeStoryModel(entity: Entity | undefined) {
  if (entity !== undefined) engine.removeEntity(entity)
}

function syncChapterOneCollider(visible: boolean) {
  if (visible && chapterOneColliderEntity === undefined) {
    chapterOneColliderEntity = spawnStoryModel(
      STORY_WORLD_CONFIG.models.chapterOneCollider
    )
  } else if (!visible && chapterOneColliderEntity !== undefined) {
    removeStoryModel(chapterOneColliderEntity)
    chapterOneColliderEntity = undefined
  }
}

function getHoodDoorSource(model: HoodDoorWorldModel) {
  if (model === 'closed') return STORY_WORLD_CONFIG.models.hoodDoorClosed
  return STORY_WORLD_CONFIG.models.hoodDoorOpen
}

function syncHoodDoor(model: HoodDoorWorldModel) {
  if (hoodDoorEntity === undefined) {
    hoodDoorEntity = spawnStoryModel(getHoodDoorSource(model))
    hoodDoorModel = model
    return
  }
  if (hoodDoorModel === model) return

  GltfContainer.createOrReplace(hoodDoorEntity, {
    src: getHoodDoorSource(model),
    visibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS,
    invisibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS
  })
  hoodDoorModel = model
}

function syncUpperVoidDoor(visible: boolean) {
  if (visible && upperVoidDoorEntity === undefined) {
    upperVoidDoorEntity = spawnStoryModel(
      STORY_WORLD_CONFIG.models.upperVoidClosed
    )
  } else if (!visible && upperVoidDoorEntity !== undefined) {
    removeStoryModel(upperVoidDoorEntity)
    upperVoidDoorEntity = undefined
  }
}

function syncLowerVoidDoor(visible: boolean) {
  if (visible && lowerVoidDoorEntity === undefined) {
    lowerVoidDoorEntity = spawnStoryModel(
      STORY_WORLD_CONFIG.models.lowerVoidClosed
    )
  } else if (!visible && lowerVoidDoorEntity !== undefined) {
    removeStoryModel(lowerVoidDoorEntity)
    lowerVoidDoorEntity = undefined
  }
}

function syncAnts(visible: boolean) {
  const entity = engine.getEntityOrNullByName(
    STORY_WORLD_CONFIG.antsEntityName
  )
  if (entity === null) return

  const currentVisibility = VisibilityComponent.getOrNull(entity)
  if (currentVisibility?.visible !== visible) {
    VisibilityComponent.createOrReplace(entity, { visible })
  }

  if (Animator.getOrNull(entity)) {
    for (const state of Animator.getMutable(entity).states) {
      if (state.playing !== visible) state.playing = visible
    }
  }
}

function collectMagicMap(entity: Entity) {
  if (!canModifyCurrentDimension()) return
  const progress = getProgress()
  if (progress.story.flags.magicMapCollected === true) return

  progress.story.flags.magicMapCollected = true
  addItem(STORY_WORLD_CONFIG.magicMap.itemId, 1)
  const earnedPoints = awardPoints('magicMapCollected', false, 'magic-map')
  showItemUnlockPresentation({
    itemId: STORY_WORLD_CONFIG.magicMap.itemId,
    icon: 'assets/scene/ui/inventory/items/map/world_map.png',
    artworkAspectRatio: 1
  })
  emitStoryMissionEvent('magic-map-collected')
  void syncInventory()
  void syncProgress()
  showNotification(`Magic Map unlocked! · +${earnedPoints} points`)
  engine.removeEntity(entity)
  magicMapEntity = undefined
}

function syncMagicMap(visible: boolean) {
  if (!visible) {
    if (magicMapEntity !== undefined) {
      removeStoryModel(magicMapEntity)
      magicMapEntity = undefined
    }
    return
  }
  if (magicMapEntity !== undefined) return

  const map = STORY_WORLD_CONFIG.magicMap
  const entity = engine.addEntity()
  Transform.create(entity, {
    position: Vector3.create(map.position.x, map.position.y, map.position.z),
    rotation: Quaternion.fromEulerDegrees(
      map.rotation.x,
      map.rotation.y,
      map.rotation.z
    ),
    scale: Vector3.create(map.scale, map.scale, map.scale)
  })
  GltfContainer.create(entity, {
    src: STORY_WORLD_CONFIG.models.magicMap,
    visibleMeshesCollisionMask: ColliderLayer.CL_NONE,
    invisibleMeshesCollisionMask: ColliderLayer.CL_POINTER
  })
  VisibilityComponent.create(entity, { visible: true })
  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: 'Collect Magic Map',
        maxDistance: map.interactionDistance
      }
    },
    () => collectMagicMap(entity)
  )
  magicMapEntity = entity
}

function reachedUpperVoidDoor() {
  const player = getPlayer()
  if (!player?.position) return false
  const trigger = STORY_WORLD_CONFIG.upperVoidDoorTrigger
  const dx = player.position.x - trigger.position.x
  const dz = player.position.z - trigger.position.z
  return (
    dx * dx + dz * dz <= trigger.horizontalRadius ** 2 &&
    Math.abs(player.position.y - trigger.position.y) <= trigger.verticalRadius
  )
}

function updateStoryWorld() {
  // Hide the imported animated path immediately while player progress loads.
  // This prevents one-frame spoilers for a new Chapter 1 player.
  if (!isPlayerReady()) {
    syncAnts(false)
    return
  }

  const progress = getProgress()
  let state = getStoryWorldState(progress)

  if (
    state.antsVisible &&
    !progress.story.completedMissionIds.includes(FOLLOW_ANTS_MISSION_ID) &&
    reachedUpperVoidDoor()
  ) {
    emitStoryMissionEvent('void-dimension-entered')
    state = getStoryWorldState(progress)
  }

  syncChapterOneCollider(state.chapterOneColliderVisible)
  syncHoodDoor(state.hoodDoorModel)
  syncUpperVoidDoor(state.upperVoidDoorVisible)
  syncLowerVoidDoor(state.lowerVoidDoorVisible)
  syncAnts(state.antsVisible)
  syncMagicMap(state.magicMapVisible)
}

export function initializeStoryWorldSystem() {
  if (initialized) return
  initialized = true
  syncAnts(false)
  engine.addSystem(updateStoryWorld)
}
