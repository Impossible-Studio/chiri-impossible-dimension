import {
  ColliderLayer,
  engine,
  GltfContainer,
  InputAction,
  pointerEventsSystem,
  Transform,
  type Entity
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { addItem, discoverItem, hasItem } from '../farming/inventory'
import { registerWorldInventoryItem } from '../farming/itemData'
import { showNotification } from '../farming/notifications'
import { getProgress, syncInventory, syncProgress } from '../farming/player'
import { emitStoryMissionEvent } from '../farming/storyProgression'
import { canModifyCurrentDimension } from '../house/houseSystem'
import {
  SEWING_MACHINE_INVENTORY_ICON,
  SEWING_MACHINE_INTERACTION_DISTANCE,
  SEWING_MACHINE_ITEM_ID,
  SEWING_MACHINE_MODEL,
  SEWING_MACHINE_TRANSFORM
} from './sewingMachineConfig'

const COLLECTED_FLAG = 'sewingMachineCollected'
let sewingMachineEntity: Entity | null = null
let initialized = false

function isCollected(): boolean {
  return getProgress().story.flags[COLLECTED_FLAG] === true || hasItem(SEWING_MACHINE_ITEM_ID)
}

function removeWorldMachine(): void {
  if (sewingMachineEntity === null) return
  engine.removeEntity(sewingMachineEntity)
  sewingMachineEntity = null
}

function collectSewingMachine(): void {
  if (!canModifyCurrentDimension() || isCollected()) return

  const progress = getProgress()
  progress.story.flags[COLLECTED_FLAG] = true
  addItem(SEWING_MACHINE_ITEM_ID, 1)
  removeWorldMachine()

  // This completion event deliberately works even before its quest card was
  // announced: the story router registers the mission and shows its normal
  // complete presentation, then enables its crafting outcomes.
  emitStoryMissionEvent('craftpack-upgrade-installed')
  void syncInventory()
  void syncProgress()
  showNotification('Sewing Machine found! Clothing crafting is unlocked.')
}

function spawnWorldMachine(): void {
  if (sewingMachineEntity !== null || isCollected()) return

  const entity = engine.addEntity()
  Transform.create(entity, {
    position: Vector3.create(
      SEWING_MACHINE_TRANSFORM.position.x,
      SEWING_MACHINE_TRANSFORM.position.y,
      SEWING_MACHINE_TRANSFORM.position.z
    ),
    rotation: Quaternion.fromEulerDegrees(0, SEWING_MACHINE_TRANSFORM.rotationY, 0),
    scale: Vector3.create(
      SEWING_MACHINE_TRANSFORM.scale,
      SEWING_MACHINE_TRANSFORM.scale,
      SEWING_MACHINE_TRANSFORM.scale
    )
  })
  GltfContainer.create(entity, {
    src: SEWING_MACHINE_MODEL,
    visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
    invisibleMeshesCollisionMask: ColliderLayer.CL_NONE
  })
  pointerEventsSystem.onPointerDown({
    entity,
    opts: {
      button: InputAction.IA_POINTER,
      hoverText: 'Collect Sewing Machine',
      maxDistance: SEWING_MACHINE_INTERACTION_DISTANCE
    }
  }, collectSewingMachine)
  sewingMachineEntity = entity
}

export function registerSewingMachineItemCatalog(): void {
  registerWorldInventoryItem(
    SEWING_MACHINE_ITEM_ID,
    'Sewing Machine',
    'A lost Craftpack upgrade. It unlocks clothing and Chiri accessory crafting.',
    SEWING_MACHINE_INVENTORY_ICON
  )
}

export function initializeSewingMachineSystem(): void {
  if (initialized) return
  initialized = true

  if (isCollected()) {
    let inventoryChanged = false
    if (!hasItem(SEWING_MACHINE_ITEM_ID)) {
      addItem(SEWING_MACHINE_ITEM_ID, 1)
      inventoryChanged = true
    }
    inventoryChanged = discoverItem(SEWING_MACHINE_ITEM_ID) || inventoryChanged
    if (inventoryChanged) void syncInventory()
    return
  }

  spawnWorldMachine()
}
