import {
  ColliderLayer,
  engine,
  Entity,
  GltfContainer,
  InputAction,
  pointerEventsSystem,
  Transform,
  VisibilityComponent
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { COOKING_OVEN_WORLD_CONFIG } from './cookingConfig'
import { openCookingOven } from './cookingRuntime'

let initialized = false
let ovenEntity: Entity | null = null

export function initializeCookingOven() {
  if (initialized) return ovenEntity
  initialized = true

  // The oven is owned by code. Reuse a same-name Creator Hub entity only as a
  // migration safeguard, but never wait for the composite to provide it.
  const existing = engine.getEntityOrNullByName(COOKING_OVEN_WORLD_CONFIG.entityName)
  const entity = existing ?? engine.addEntity()
  ovenEntity = entity

  const { position, rotation, scale } = COOKING_OVEN_WORLD_CONFIG
  Transform.createOrReplace(entity, {
    position: Vector3.create(position.x, position.y, position.z),
    rotation: Quaternion.fromEulerDegrees(rotation.x, rotation.y, rotation.z),
    scale: Vector3.create(scale, scale, scale)
  })
  GltfContainer.createOrReplace(entity, {
    src: COOKING_OVEN_WORLD_CONFIG.model,
    visibleMeshesCollisionMask: ColliderLayer.CL_POINTER | ColliderLayer.CL_PHYSICS,
    invisibleMeshesCollisionMask: ColliderLayer.CL_POINTER | ColliderLayer.CL_PHYSICS
  })
  VisibilityComponent.createOrReplace(entity, { visible: true })

  pointerEventsSystem.onPointerDown({
    entity,
    opts: {
      button: InputAction.IA_POINTER,
      hoverText: COOKING_OVEN_WORLD_CONFIG.hoverText,
      maxDistance: COOKING_OVEN_WORLD_CONFIG.pointerMaxDistance
    }
  }, openCookingOven)

  return entity
}
