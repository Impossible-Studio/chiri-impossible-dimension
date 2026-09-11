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
import {
  addItem,
  discoverItem,
  hasItem,
  removeItem
} from '../farming/inventory'
import { registerWorldInventoryItem } from '../farming/itemData'
import { showNotification } from '../farming/notifications'
import { getProgress, syncInventory, syncProgress } from '../farming/player'
import { completeStoryMission, emitStoryMissionEvent } from '../farming/storyProgression'
import { awardPoints } from '../gameplay/points'
import { canModifyCurrentDimension } from '../house/houseSystem'
import {
  WATER_MACHINE_INTERACTION_DISTANCE,
  WATER_MACHINE_COMPLETE_ITEM_ID,
  WATER_MACHINE_MODELS,
  WATER_MACHINE_ORIGIN,
  WATER_MACHINE_PARTS,
  WATER_MACHINE_INVENTORY_ICON_ROOT,
  type WaterMachinePartDefinition
} from './waterMachineConfig'

const partEntities = new Map<string, Entity>()
let machineEntity: Entity | null = null
let renderedMachine: 'broken' | 'working' | null = null
let refreshElapsed = 0

function partFlag(part: WaterMachinePartDefinition): string {
  return `waterMachinePartCollected:${part.id}`
}

function hasCollectedPart(part: WaterMachinePartDefinition): boolean {
  return getProgress().story.flags[partFlag(part)] === true || hasItem(part.itemId)
}

function removePartEntity(partId: string): void {
  const entity = partEntities.get(partId)
  if (entity === undefined) return
  engine.removeEntity(entity)
  partEntities.delete(partId)
}

function createWorldModel(src: string): Entity {
  const entity = engine.addEntity()
  Transform.create(entity, {
    position: Vector3.create(WATER_MACHINE_ORIGIN.x, WATER_MACHINE_ORIGIN.y, WATER_MACHINE_ORIGIN.z),
    rotation: Quaternion.Identity(),
    scale: Vector3.One()
  })
  GltfContainer.create(entity, {
    src,
    visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
    invisibleMeshesCollisionMask: ColliderLayer.CL_NONE
  })
  return entity
}

function collectPart(part: WaterMachinePartDefinition): void {
  if (!canModifyCurrentDimension() || hasCollectedPart(part)) return
  const progress = getProgress()
  progress.story.flags[partFlag(part)] = true
  addItem(part.itemId, 1)
  removePartEntity(part.id)
  emitStoryMissionEvent('first-irrigation-pipe-found')
  const points = awardPoints('waterMachinePartCollected', false, part.id)
  const count = WATER_MACHINE_PARTS.filter(hasCollectedPart).length
  void syncInventory()
  void syncProgress()
  showNotification(`${part.name} found · +${points} points (${count}/${WATER_MACHINE_PARTS.length})`)
  if (count === WATER_MACHINE_PARTS.length) repairMachine()
}

function spawnPart(part: WaterMachinePartDefinition): void {
  if (partEntities.has(part.id)) return
  const entity = createWorldModel(part.model)
  pointerEventsSystem.onPointerDown({
    entity,
    opts: {
      button: InputAction.IA_POINTER,
      hoverText: `Collect ${part.name}`,
      maxDistance: WATER_MACHINE_INTERACTION_DISTANCE
    }
  }, () => collectPart(part))
  partEntities.set(part.id, entity)
}

function repairMachine(): void {
  if (!canModifyCurrentDimension()) return
  const missingParts = WATER_MACHINE_PARTS.filter(part => !hasCollectedPart(part))
  if (missingParts.length > 0) {
    showNotification('Find all parts and repair the water machine.')
    return
  }

  for (const part of WATER_MACHINE_PARTS) removeItem(part.itemId, 1)
  if (!hasItem(WATER_MACHINE_COMPLETE_ITEM_ID)) {
    addItem(WATER_MACHINE_COMPLETE_ITEM_ID, 1)
  }
  const progress = getProgress()
  progress.story.flags.waterMachineRepaired = true
  completeStoryMission(3, 1, true)
  void syncInventory()
  void syncProgress()
  refreshWorld()
  showNotification('The water machine is working again!')
}

function renderMachine(kind: 'broken' | 'working'): void {
  if (renderedMachine === kind && machineEntity !== null) return
  if (machineEntity !== null) engine.removeEntity(machineEntity)
  machineEntity = createWorldModel(WATER_MACHINE_MODELS[kind])
  renderedMachine = kind
  if (kind === 'broken') {
    pointerEventsSystem.onPointerDown({
      entity: machineEntity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: 'Repair Water Machine',
        maxDistance: WATER_MACHINE_INTERACTION_DISTANCE
      }
    }, repairMachine)
  }
}

function removeAllWorldEntities(): void {
  for (const part of WATER_MACHINE_PARTS) removePartEntity(part.id)
  if (machineEntity !== null) engine.removeEntity(machineEntity)
  machineEntity = null
  renderedMachine = null
}

function refreshWorld(): void {
  const progress = getProgress()
  const repaired = progress.story.flags.waterMachineRepaired === true
  renderMachine(repaired ? 'working' : 'broken')
  for (const part of WATER_MACHINE_PARTS) {
    if (!repaired && !hasCollectedPart(part)) spawnPart(part)
    else removePartEntity(part.id)
  }
}

export function registerWaterMachineItemCatalog(): void {
  for (const part of WATER_MACHINE_PARTS) {
    registerWorldInventoryItem(
      part.itemId,
      part.name,
      'One of five pieces needed to repair the water machine.',
      part.inventoryIcon
    )
  }
  registerWorldInventoryItem(
    WATER_MACHINE_COMPLETE_ITEM_ID,
    'Working Water Machine',
    'The complete water machine you repaired from five lost parts.',
    `${WATER_MACHINE_INVENTORY_ICON_ROOT}/water_machine_complete.png`
  )
}

export function initializeWaterMachineSystem(): void {
  let inventoryChanged = false
  for (const part of WATER_MACHINE_PARTS) {
    if (getProgress().story.flags[partFlag(part)] === true) {
      inventoryChanged = discoverItem(part.itemId) || inventoryChanged
    }
  }
  if (getProgress().story.flags.waterMachineRepaired === true) {
    if (!hasItem(WATER_MACHINE_COMPLETE_ITEM_ID)) {
      addItem(WATER_MACHINE_COMPLETE_ITEM_ID, 1)
      inventoryChanged = true
    }
    inventoryChanged = discoverItem(WATER_MACHINE_COMPLETE_ITEM_ID) || inventoryChanged
  }
  if (inventoryChanged) void syncInventory()
  refreshWorld()
  engine.addSystem(dt => {
    refreshElapsed += dt
    if (refreshElapsed < 1) return
    refreshElapsed = 0
    refreshWorld()
  })
}
