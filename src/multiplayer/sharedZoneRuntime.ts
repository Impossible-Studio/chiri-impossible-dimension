import {
  Animator,
  ColliderLayer,
  engine,
  GltfContainer,
  InputAction,
  Material,
  MeshRenderer,
  pointerEventsSystem,
  Transform,
  type Entity
} from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { isMobile } from '@dcl/sdk/platform'
import { getPlayer } from '@dcl/sdk/players'
import { HOUSE_FURNITURE } from '../house/houseConfig'
import {
  canModifyCurrentDimension,
  returnSharedFurnitureToInventory,
  takeHouseFurnitureIntoSharedZone
} from '../house/houseSystem'
import { showNotification } from '../farming/notifications'
import { isInsideSharedZone } from './sharedZoneConfig'
import {
  createSharedObject,
  getSharedZoneState,
  moveSharedObject,
  onSharedZoneStateChanged,
  releaseSharedObjectLock,
  removeSharedObject,
  requestSharedObjectLock
} from './sharedZoneClient'
import type { SharedObjectState } from './sharedZoneTypes'
import { CHIRI_VARIANTS, createChiriAnimationStates } from '../companion/chiriCompanion'
import { selectGiftTarget } from './giftState'

const entities = new Map<string, Entity>()
const persistentChiriEntities = new Map<string, Entity>()
const persistentChiriVariants = new Map<string, string>()
const gizmoEntities: Entity[] = []
let selectedObjectId: string | null = null
let revision = 0

function localId(): string {
  return getPlayer()?.userId.trim().toLowerCase() ?? ''
}

function modelForItem(itemId: string): string | null {
  if (!itemId.startsWith('house_furniture:')) return null
  return HOUSE_FURNITURE[itemId.slice('house_furniture:'.length)]?.model ?? null
}

function apply(entity: Entity, object: SharedObjectState): void {
  Transform.createOrReplace(entity, {
    position: Vector3.create(object.position.x, object.position.y, object.position.z),
    rotation: Quaternion.create(object.rotation.x, object.rotation.y, object.rotation.z, object.rotation.w),
    scale: Vector3.create(object.scale.x, object.scale.y, object.scale.z)
  })
}

function removeEntity(objectId: string): void {
  const entity = entities.get(objectId)
  if (entity !== undefined) engine.removeEntity(entity)
  entities.delete(objectId)
  if (selectedObjectId === objectId) selectedObjectId = null
}

function removeGizmo(): void {
  for (const entity of gizmoEntities) engine.removeEntity(entity)
  gizmoEntities.length = 0
}

function renderGizmo(): void {
  removeGizmo()
  const object = getSharedZoneState().objects.find(value => value.objectId === selectedObjectId)
  if (!object) return
  const root = engine.addEntity()
  gizmoEntities.push(root)
  Transform.create(root, { position: Vector3.create(object.position.x, object.position.y, object.position.z) })
  const axes = [
    { position: Vector3.create(.9, 0, 0), scale: Vector3.create(1.8, .045, .045), color: Color4.create(.95, .12, .18, 1) },
    { position: Vector3.create(0, .9, 0), scale: Vector3.create(.045, 1.8, .045), color: Color4.create(.16, .82, .25, 1) },
    { position: Vector3.create(0, 0, .9), scale: Vector3.create(.045, .045, 1.8), color: Color4.create(.12, .38, 1, 1) }
  ]
  for (const axis of axes) {
    const entity = engine.addEntity()
    gizmoEntities.push(entity)
    Transform.create(entity, { parent: root, position: axis.position, scale: axis.scale })
    MeshRenderer.setBox(entity)
    Material.setPbrMaterial(entity, {
      albedoColor: axis.color,
      emissiveColor: axis.color,
      emissiveIntensity: .3
    })
  }
}

function renderObject(object: SharedObjectState): void {
  const model = modelForItem(object.itemId)
  if (!model) return
  let entity = entities.get(object.objectId)
  if (entity === undefined) {
    entity = engine.addEntity()
    entities.set(object.objectId, entity)
    GltfContainer.create(entity, {
      src: model,
      visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
      invisibleMeshesCollisionMask: ColliderLayer.CL_POINTER
    })
    pointerEventsSystem.onPointerDown({
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: 'Edit shared item',
        maxDistance: 10
      }
    }, () => {
      if (!canModifyCurrentDimension()) return
      selectedObjectId = object.objectId
      revision++
      void requestSharedObjectLock(object.objectId)
      renderGizmo()
    })
  }
  apply(entity, object)
}

function syncObjects(): void {
  const state = getSharedZoneState()
  const ids = new Set(state.objects.map(object => object.objectId))
  for (const objectId of [...entities.keys()]) {
    if (!ids.has(objectId)) removeEntity(objectId)
  }
  for (const object of state.objects) renderObject(object)
  syncPersistentChiris()
  renderGizmo()
  revision++
}

function syncPersistentChiris(): void {
  const chiris = getSharedZoneState().chiris
  const self = localId()
  const owners = new Set(chiris.filter(chiri => chiri.ownerId !== self).map(chiri => chiri.ownerId))
  for (const [ownerId, entity] of persistentChiriEntities) {
    if (!owners.has(ownerId)) {
      engine.removeEntity(entity)
      persistentChiriEntities.delete(ownerId)
      persistentChiriVariants.delete(ownerId)
    }
  }
  for (const chiri of chiris) {
    if (chiri.ownerId === self) continue
    const variantId = chiri.variantId === 'mecha' ? 'mecha' : 'classic'
    const variant = CHIRI_VARIANTS[variantId]
    let entity = persistentChiriEntities.get(chiri.ownerId)
    if (entity === undefined) {
      entity = engine.addEntity()
      persistentChiriEntities.set(chiri.ownerId, entity)
      GltfContainer.create(entity, {
        src: variant.modelPath,
        visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
        invisibleMeshesCollisionMask: ColliderLayer.CL_POINTER
      })
      Animator.create(entity, { states: createChiriAnimationStates('walk') })
      persistentChiriVariants.set(chiri.ownerId, variantId)
      const ownerId = chiri.ownerId
      pointerEventsSystem.onPointerDown({
        entity,
        opts: { button: InputAction.IA_POINTER, hoverText: 'Interact with Chiri', maxDistance: 9 }
      }, () => {
        const name = getPlayer({ userId: ownerId })?.name
        selectGiftTarget(ownerId, name ? `${name}'s Chiri` : "Player's Chiri")
      })
    }
    if (persistentChiriVariants.get(chiri.ownerId) !== variantId) {
      GltfContainer.createOrReplace(entity, {
        src: variant.modelPath,
        visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
        invisibleMeshesCollisionMask: ColliderLayer.CL_POINTER
      })
      Animator.createOrReplace(entity, { states: createChiriAnimationStates('walk') })
      persistentChiriVariants.set(chiri.ownerId, variantId)
    }
    const scale = isMobile() ? variant.mobileScale : variant.desktopScale
    Transform.createOrReplace(entity, {
      position: Vector3.create(chiri.position.x, chiri.position.y, chiri.position.z),
      rotation: Quaternion.fromEulerDegrees(0, chiri.rotationY, 0),
      scale: Vector3.create(scale, scale, scale)
    })
  }
}

export function initializeSharedZoneRuntime(): void {
  onSharedZoneStateChanged(syncObjects)
}

export function isPlayerInsideSharedZone(): boolean {
  const position = getPlayer()?.position
  return Boolean(position && isInsideSharedZone(position))
}

export function dropFurnitureInSharedZone(itemId: string): boolean {
  const player = getPlayer()
  if (!canModifyCurrentDimension() || !getSharedZoneState().enabled || !player?.position || !isInsideSharedZone(player.position)) return false
  const definition = itemId.startsWith('house_furniture:')
    ? HOUSE_FURNITURE[itemId.slice('house_furniture:'.length)]
    : undefined
  if (!definition) return false

  const camera = Transform.get(engine.CameraEntity)
  const forward = Vector3.rotate(Vector3.Forward(), camera.rotation)
  const horizontal = Vector3.normalize(Vector3.create(forward.x, 0, forward.z))
  const position = Vector3.add(player.position, Vector3.scale(horizontal, 2.2))
  position.y = Math.max(2, player.position.y)
  if (!isInsideSharedZone(position)) return false
  const objectId = `${localId()}:${Date.now()}:${Math.floor(Math.random() * 1_000_000)}`
  if (!takeHouseFurnitureIntoSharedZone(itemId, objectId)) return false
  const scale = Vector3.create(
    definition.defaultScale.x,
    definition.defaultScale.y,
    definition.defaultScale.z
  )
  void createSharedObject(objectId, itemId, position, Quaternion.Identity(), scale)
  showNotification('Item dropped in the collaborative Void.')
  return true
}

export type SharedEditorSnapshot = {
  visible: boolean
  canStore: boolean
  locked: boolean
  itemName: string
}

export function getSharedEditorRevision(): number { return revision }

export function getSharedEditorSnapshot(): SharedEditorSnapshot {
  const object = getSharedZoneState().objects.find(value => value.objectId === selectedObjectId)
  const lock = getSharedZoneState().locks.find(value => value.objectId === selectedObjectId)
  const definition = object?.itemId.startsWith('house_furniture:')
    ? HOUSE_FURNITURE[object.itemId.slice('house_furniture:'.length)]
    : undefined
  return {
    visible: Boolean(object),
    canStore: object?.ownerId === localId(),
    locked: lock?.ownerId === localId() && lock.expiresAt > Date.now(),
    itemName: definition?.name ?? 'Shared item'
  }
}

export function clearSharedObjectSelection(): void {
  if (selectedObjectId) void releaseSharedObjectLock(selectedObjectId)
  selectedObjectId = null
  removeGizmo()
  revision++
}

export function moveSelectedSharedObject(axis: 'x' | 'y' | 'z', amount: number): boolean {
  if (!canModifyCurrentDimension()) return false
  const object = getSharedZoneState().objects.find(value => value.objectId === selectedObjectId)
  if (!object) return false
  const lock = getSharedZoneState().locks.find(value => value.objectId === object.objectId)
  if (lock?.ownerId !== localId()) {
    void requestSharedObjectLock(object.objectId)
    showNotification('Object selected. Tap the arrow again to move it.')
    return false
  }
  const position = Vector3.create(object.position.x, object.position.y, object.position.z)
  position[axis] += amount
  if (!isInsideSharedZone(position)) return false
  void moveSharedObject(
    object.objectId,
    position,
    Quaternion.create(object.rotation.x, object.rotation.y, object.rotation.z, object.rotation.w),
    Vector3.create(object.scale.x, object.scale.y, object.scale.z)
  )
  return true
}

export function rotateSelectedSharedObject(direction: -1 | 1): boolean {
  if (!canModifyCurrentDimension()) return false
  const object = getSharedZoneState().objects.find(value => value.objectId === selectedObjectId)
  if (!object) return false
  const lock = getSharedZoneState().locks.find(value => value.objectId === object.objectId)
  if (lock?.ownerId !== localId()) {
    void requestSharedObjectLock(object.objectId)
    return false
  }
  const rotation = Quaternion.multiply(
    Quaternion.fromEulerDegrees(0, 90 * direction, 0),
    Quaternion.create(object.rotation.x, object.rotation.y, object.rotation.z, object.rotation.w)
  )
  void moveSharedObject(
    object.objectId,
    Vector3.create(object.position.x, object.position.y, object.position.z),
    rotation,
    Vector3.create(object.scale.x, object.scale.y, object.scale.z)
  )
  return true
}

export function saveSelectedSharedObjectToInventory(): boolean {
  if (!canModifyCurrentDimension()) return false
  const object = getSharedZoneState().objects.find(value => value.objectId === selectedObjectId)
  if (!object || object.ownerId !== localId()) return false
  if (!returnSharedFurnitureToInventory(object.objectId, object.itemId)) return false
  void removeSharedObject(object.objectId)
  clearSharedObjectSelection()
  showNotification('Your item was saved to Inventory.')
  return true
}
