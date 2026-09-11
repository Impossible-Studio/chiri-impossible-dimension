import {
  engine,
  GltfContainer,
  InputAction,
  inputSystem,
  Material,
  MeshRenderer,
  PointerEventType,
  pointerEventsSystem,
  Transform,
  type Entity
} from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import {
  getHouse,
  syncInventory,
  syncHouse
} from '../farming/player'
import {
  addItem,
  discoverItem,
  getItemAmount,
  removeItem
} from '../farming/inventory'
import { registerWorldInventoryItem } from '../farming/itemData'
import { emitStoryMissionEvent } from '../farming/storyProgression'
import { showNotification } from '../farming/notifications'
import { loadPublicHouse } from '../farming/storage'
import type {
  HouseFurniturePlacement,
  HouseTransform,
  HouseVector3,
  PlayerHouse
} from '../farming/types'
import {
  HOUSE_BOXES,
  HOUSE_FURNITURE,
  HOUSE_SYSTEM_CONFIG,
  CRAFTPACK_INVENTORY_ITEM_ID,
  FURNITURE_INVENTORY_ICON_FOLDER,
  houseOpenBoxInventoryIcon,
  type HouseBoxDefinition,
  type HouseFurnitureDefinition
} from './houseConfig'
import { hideVisitorFarm, showVisitorFarm } from './visitorFarm'
import { closeInventory } from '../farming/inventoryUI'
import { hidePlantMenu } from '../farming/plantMenu'
import { closeChiriUi } from '../companion/chiriUiState'

export type HouseSessionMode = 'owner' | 'visitor'

export interface HouseSession {
  mode: HouseSessionMode
  ownerWallet: string
  selectedFurnitureInstanceId: string | null
  editorMode: HouseEditorMode
}

export type HouseEditorMode = 'move' | 'rotate'
export type HouseAxis = 'x' | 'y' | 'z'

export interface HouseEditorSnapshot {
  visible: boolean
  mode: HouseEditorMode
  selectedInstanceId: string | null
  selectedName: string
}

const boxEntities = new Map<string, Entity>()
const furnitureEntities = new Map<string, Entity>()
const gizmoEntities: Entity[] = []

let heldMove: { axis: HouseAxis; direction: -1 | 1 } | null = null
let gizmoRoot: Entity | null = null
let editorSystemInstalled = false
let editorRevision = 0

let activeHouse: PlayerHouse | null = null
let ownerHouse: PlayerHouse | null = null
let session: HouseSession | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let dimensionVisitRevision = 0
let onDimensionVisitChanged: () => void = () => {}

const AXIS_COLORS: Record<HouseAxis, Color4> = {
  x: Color4.create(0.95, 0.12, 0.18, 1),
  y: Color4.create(0.16, 0.82, 0.25, 1),
  z: Color4.create(0.12, 0.38, 1, 1)
}

function openBoxFurnitureId(boxId: string): string {
  return `opened-box:${boxId}`
}

function openBoxInstanceId(boxId: string): string {
  return `opened-box-instance:${boxId}`
}

function furnitureInventoryItemId(furnitureId: string): string {
  return `house_furniture:${furnitureId}`
}

function resolveFurnitureDefinition(furnitureId: string): HouseFurnitureDefinition | null {
  const configured = HOUSE_FURNITURE[furnitureId]
  if (configured) return configured

  if (!furnitureId.startsWith('opened-box:')) return null
  const boxId = furnitureId.slice('opened-box:'.length)
  const box = HOUSE_BOXES.find(candidate => candidate.id === boxId)
  if (!box) return null

  return {
    id: furnitureId,
    name: `${box.name} (open)`,
    model: box.openModel,
    kind: 'furniture',
    defaultScale: cloneVector(box.transform.scale)
  }
}

function notifyEditorChanged(): void {
  editorRevision += 1
}

export function getHouseEditorRevision(): number {
  return editorRevision
}

function cloneVector(value: HouseVector3): HouseVector3 {
  return { x: value.x, y: value.y, z: value.z }
}

function cloneTransform(value: HouseTransform): HouseTransform {
  return {
    position: cloneVector(value.position),
    rotation: cloneVector(value.rotation),
    scale: cloneVector(value.scale)
  }
}

function addVectors(a: HouseVector3, b: HouseVector3): HouseVector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function applyTransform(entity: Entity, value: HouseTransform): void {
  Transform.createOrReplace(entity, {
    position: Vector3.create(
      value.position.x,
      value.position.y,
      value.position.z
    ),
    rotation: Quaternion.fromEulerDegrees(
      value.rotation.x,
      value.rotation.y,
      value.rotation.z
    ),
    scale: Vector3.create(value.scale.x, value.scale.y, value.scale.z)
  })
}

function removeEditorGizmo(): void {
  heldMove = null
  for (let index = gizmoEntities.length - 1; index >= 0; index -= 1) {
    engine.removeEntity(gizmoEntities[index])
  }
  gizmoEntities.length = 0
  gizmoRoot = null
}

function axisVector(axis: HouseAxis, amount: number): HouseVector3 {
  return {
    x: axis === 'x' ? amount : 0,
    y: axis === 'y' ? amount : 0,
    z: axis === 'z' ? amount : 0
  }
}

function createGizmoPart(
  parent: Entity,
  position: HouseVector3,
  scale: HouseVector3,
  color: Color4,
  sphere = false
): Entity {
  const entity = engine.addEntity()
  Transform.create(entity, {
    parent,
    position: Vector3.create(position.x, position.y, position.z),
    scale: Vector3.create(scale.x, scale.y, scale.z)
  })
  if (sphere) MeshRenderer.setSphere(entity)
  else MeshRenderer.setBox(entity)
  Material.setPbrMaterial(entity, {
    albedoColor: color,
    roughness: 0.7,
    metallic: 0
  })
  gizmoEntities.push(entity)
  return entity
}

function createMoveAxis(root: Entity, axis: HouseAxis): void {
  const thickness = HOUSE_SYSTEM_CONFIG.gizmoLineThickness
  const lineScale = axisVector(axis, HOUSE_SYSTEM_CONFIG.gizmoLineLength)
  if (axis !== 'x') lineScale.x = thickness
  if (axis !== 'y') lineScale.y = thickness
  if (axis !== 'z') lineScale.z = thickness
  createGizmoPart(root, axisVector(axis, 0), lineScale, AXIS_COLORS[axis])

  for (const direction of [-1, 1] as const) {
    const handle = createGizmoPart(
      root,
      axisVector(axis, HOUSE_SYSTEM_CONFIG.moveHandleDistance * direction),
      {
        x: HOUSE_SYSTEM_CONFIG.gizmoHandleSize,
        y: HOUSE_SYSTEM_CONFIG.gizmoHandleSize,
        z: HOUSE_SYSTEM_CONFIG.gizmoHandleSize
      },
      AXIS_COLORS[axis],
      true
    )
    pointerEventsSystem.onPointerDown({
      entity: handle,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: `Hold to move ${axis.toUpperCase()} ${direction > 0 ? '+' : '-'}`,
        maxDistance: HOUSE_SYSTEM_CONFIG.interactionDistance
      }
    }, () => {
      if (session?.editorMode !== 'move') return
      moveSelectedHouseFurniture(axisVector(axis, HOUSE_SYSTEM_CONFIG.moveTapStepMeters * direction))
      heldMove = { axis, direction }
    })
  }
}

function createRotationAxis(root: Entity, axis: HouseAxis): void {
  const offsets: Record<HouseAxis, [HouseVector3, HouseVector3]> = {
    x: [{ x: 0, y: 0.8, z: 0.8 }, { x: 0, y: 0.8, z: -0.8 }],
    y: [{ x: 0.8, y: 0, z: 0.8 }, { x: -0.8, y: 0, z: 0.8 }],
    z: [{ x: 0.8, y: 0.8, z: 0 }, { x: -0.8, y: 0.8, z: 0 }]
  }
  const pair = offsets[axis]
  for (const [index, direction] of ([-1, 1] as const).entries()) {
    const handle = createGizmoPart(
      root,
      pair[index],
      { x: 0.24, y: 0.24, z: 0.24 },
      AXIS_COLORS[axis],
      true
    )
    pointerEventsSystem.onPointerDown({
      entity: handle,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: `Rotate ${axis.toUpperCase()} ${direction > 0 ? '+' : '-'}90°`,
        maxDistance: HOUSE_SYSTEM_CONFIG.interactionDistance
      }
    }, () => rotateSelectedHouseFurniture(axis, direction * HOUSE_SYSTEM_CONFIG.rotationStepDegrees))
  }
}

function renderEditorGizmo(): void {
  removeEditorGizmo()
  const instanceId = session?.selectedFurnitureInstanceId
  if (!instanceId || !activeHouse || !canEditActiveHouse()) return
  const placement = activeHouse.furniture[instanceId]
  if (!placement || placement.stored) return
  const editorMode = session?.editorMode ?? 'move'

  const root = engine.addEntity()
  gizmoRoot = root
  Transform.create(root, {
    position: Vector3.create(
      placement.transform.position.x,
      placement.transform.position.y,
      placement.transform.position.z
    )
  })
  gizmoEntities.push(root)
  for (const axis of ['x', 'y', 'z'] as const) {
    if (editorMode === 'move') createMoveAxis(root, axis)
    else createRotationAxis(root, axis)
  }
}

function canEditActiveHouse(): boolean {
  return session?.mode === 'owner' && activeHouse === ownerHouse
}

// Farming, cooking, collectibles and gifting can use this single permission
// check. A visitor may walk around and inspect another player's house, but all
// gameplay mutations remain attached to the owner's own dimension.
export function canModifyCurrentDimension(): boolean {
  return session?.mode !== 'visitor'
}

function scheduleSave(): void {
  if (!canEditActiveHouse() || !activeHouse) return

  activeHouse.updatedAt = Date.now()

  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void syncHouse().catch(error => {
      console.log('HOUSE SAVE FAILED')
      console.log(error)
    })
  }, HOUSE_SYSTEM_CONFIG.autoSaveDelayMs)
}

function removeRenderedHouse(): void {
  removeEditorGizmo()
  for (const entity of boxEntities.values()) engine.removeEntity(entity)
  for (const entity of furnitureEntities.values()) engine.removeEntity(entity)
  boxEntities.clear()
  furnitureEntities.clear()
}

function createFurniturePlacement(
  box: HouseBoxDefinition,
  instanceId: string,
  furniture: HouseFurnitureDefinition,
  offset: HouseVector3,
  rotation: HouseVector3,
  scale?: HouseVector3
): HouseFurniturePlacement {
  return {
    instanceId,
    furnitureId: furniture.id,
    sourceBoxId: box.id,
    transform: {
      position: addVectors(box.transform.position, offset),
      rotation: addVectors(box.transform.rotation, rotation),
      scale: cloneVector(scale ?? furniture.defaultScale)
    },
    planter:
      furniture.kind === 'planter'
        ? { cropId: null, plantedAt: null, stage: 0 }
        : null,
    stored: false,
    claimed: false
  }
}

function spawnFurniture(placement: HouseFurniturePlacement): void {
  if (placement.stored || placement.claimed || placement.sharedObjectId || furnitureEntities.has(placement.instanceId)) return

  const definition = resolveFurnitureDefinition(placement.furnitureId)
  if (!definition) {
    console.log(`HOUSE FURNITURE DEFINITION MISSING: ${placement.furnitureId}`)
    return
  }

  const entity = engine.addEntity()
  applyTransform(entity, placement.transform)
  GltfContainer.create(entity, { src: definition.model })

  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: canEditActiveHouse()
          ? `Edit ${definition.name}`
          : definition.name,
        maxDistance: HOUSE_SYSTEM_CONFIG.interactionDistance
      }
    },
    () => {
      if (!canEditActiveHouse() || !session) return
      if (definition.pickupBehavior === 'craftpack') {
        collectCraftpackBackpack(placement)
        return
      }
      if (session.selectedFurnitureInstanceId === placement.instanceId) {
        clearHouseFurnitureSelection()
      } else {
        session.selectedFurnitureInstanceId = placement.instanceId
        session.editorMode = 'move'
        renderEditorGizmo()
        notifyEditorChanged()
      }
    }
  )

  furnitureEntities.set(placement.instanceId, entity)
}

function spawnClosedBox(box: HouseBoxDefinition): void {
  if (boxEntities.has(box.id)) return

  const entity = engine.addEntity()
  applyTransform(entity, box.transform)
  GltfContainer.create(entity, { src: box.closedModel })

  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: canEditActiveHouse() ? `Open ${box.name}` : box.name,
        maxDistance: HOUSE_SYSTEM_CONFIG.interactionDistance
      }
    },
    () => {
      if (canEditActiveHouse()) unpackHouseBox(box.id)
    }
  )

  boxEntities.set(box.id, entity)
}

function renderActiveHouse(): void {
  removeRenderedHouse()
  if (!activeHouse) return

  for (const box of HOUSE_BOXES) {
    if (!activeHouse.openedBoxIds.includes(box.id)) spawnClosedBox(box)
  }

  for (const placement of Object.values(activeHouse.furniture)) {
    spawnFurniture(placement)
  }
}

function reconcileHouseInventory(): void {
  if (!ownerHouse) return
  let changed = false
  const storedCounts = new Map<string, number>()

  for (const placement of Object.values(ownerHouse.furniture)) {
    const definition = resolveFurnitureDefinition(placement.furnitureId)
    if (!definition) continue
    if (definition.pickupBehavior === 'craftpack' && placement.claimed) {
      if (getItemAmount(CRAFTPACK_INVENTORY_ITEM_ID) < 1) {
        addItem(CRAFTPACK_INVENTORY_ITEM_ID, 1)
        changed = true
      }
      changed = discoverItem(CRAFTPACK_INVENTORY_ITEM_ID) || changed
      continue
    }
    if (definition.pickupBehavior !== 'craftpack') {
      const itemId = furnitureInventoryItemId(placement.furnitureId)
      changed = discoverItem(itemId) || changed
      if (placement.stored) storedCounts.set(itemId, (storedCounts.get(itemId) ?? 0) + 1)
    }
  }

  for (const itemId of Object.keys(HOUSE_FURNITURE).map(furnitureInventoryItemId)) {
    const expected = storedCounts.get(itemId) ?? 0
    const actual = getItemAmount(itemId)
    if (actual < expected) {
      addItem(itemId, expected - actual)
      changed = true
    } else if (actual > expected) {
      removeItem(itemId, actual - expected)
      changed = true
    }
  }
  if (changed) void syncInventory()
}

export function initializeHouseSystem(): void {
  if (!HOUSE_SYSTEM_CONFIG.enabled) return

  ownerHouse = getHouse()
  activeHouse = ownerHouse
  session = {
    mode: 'owner',
    ownerWallet: getPlayer()?.userId ?? '',
    selectedFurnitureInstanceId: null,
    editorMode: 'move'
  }
  reconcileHouseInventory()
  renderActiveHouse()

  if (!editorSystemInstalled) {
    editorSystemInstalled = true
    engine.addSystem(dt => {
      if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_UP)) {
        heldMove = null
      }
      if (!heldMove || !inputSystem.isPressed(InputAction.IA_POINTER)) return
      const distance = HOUSE_SYSTEM_CONFIG.moveSpeedMetersPerSecond * dt * heldMove.direction
      moveSelectedHouseFurniture(axisVector(heldMove.axis, distance))
    })
  }
}

export function registerHouseFurnitureItemCatalog(): void {
  for (const definition of Object.values(HOUSE_FURNITURE)) {
    registerWorldInventoryItem(
      furnitureInventoryItemId(definition.id),
      definition.name,
      `${definition.name}. Drop it to place it in your house.`,
      definition.inventoryIcon
    )
  }
  for (const box of HOUSE_BOXES) {
    registerWorldInventoryItem(
      furnitureInventoryItemId(openBoxFurnitureId(box.id)),
      `${box.name} (Open)`,
      'An opened furniture box. Drop it to place it in your house.',
      houseOpenBoxInventoryIcon(box.id)
    )
  }
  registerWorldInventoryItem(
    CRAFTPACK_INVENTORY_ITEM_ID,
    'Craftpack',
    'Your portable crafting backpack. More crafting functions unlock as the story continues.',
    `${FURNITURE_INVENTORY_ICON_FOLDER}/craftpack_backpack.png`
  )
}

function collectCraftpackBackpack(placement: HouseFurniturePlacement): void {
  if (!activeHouse || !canEditActiveHouse() || placement.claimed) return
  placement.claimed = true
  placement.stored = false
  if (getItemAmount(CRAFTPACK_INVENTORY_ITEM_ID) < 1) {
    addItem(CRAFTPACK_INVENTORY_ITEM_ID, 1)
  } else {
    discoverItem(CRAFTPACK_INVENTORY_ITEM_ID)
  }
  const entity = furnitureEntities.get(placement.instanceId)
  if (entity !== undefined) engine.removeEntity(entity)
  furnitureEntities.delete(placement.instanceId)
  if (session?.selectedFurnitureInstanceId === placement.instanceId) {
    clearHouseFurnitureSelection()
  }
  emitStoryMissionEvent('craftpack-station-discovered')
  emitStoryMissionEvent('base-craftpack-created')
  scheduleSave()
  void syncInventory()
  showNotification('Craftpack created! It is now in your Inventory.')
}

export function unpackHouseBox(boxId: string): boolean {
  if (!canEditActiveHouse() || !activeHouse) return false

  const box = HOUSE_BOXES.find(candidate => candidate.id === boxId)
  if (!box || activeHouse.openedBoxIds.includes(box.id)) return false

  activeHouse.openedBoxIds.push(box.id)
  emitStoryMissionEvent('first-house-box-opened')

  const openedBoxId = openBoxInstanceId(box.id)
  if (!activeHouse.furniture[openedBoxId]) {
    activeHouse.furniture[openedBoxId] = {
      instanceId: openedBoxId,
      furnitureId: openBoxFurnitureId(box.id),
      sourceBoxId: box.id,
      transform: cloneTransform(box.transform),
      planter: null,
      stored: false,
      claimed: false
    }
    spawnFurniture(activeHouse.furniture[openedBoxId])
  }

  for (const content of box.contents) {
    if (activeHouse.furniture[content.instanceId]) continue

    const furniture = HOUSE_FURNITURE[content.furnitureId]
    if (!furniture) {
      console.log(`HOUSE BOX CONTENT MISSING: ${content.furnitureId}`)
      continue
    }

    const placement = createFurniturePlacement(
      box,
      content.instanceId,
      furniture,
      content.offset,
      content.rotation,
      content.scale
    )
    activeHouse.furniture[content.instanceId] = placement
    if (furniture.pickupBehavior !== 'craftpack') {
      discoverItem(furnitureInventoryItemId(furniture.id))
    }
    spawnFurniture(placement)
  }

  const boxEntity = boxEntities.get(box.id)
  if (boxEntity !== undefined) engine.removeEntity(boxEntity)
  boxEntities.delete(box.id)
  if (HOUSE_BOXES.every(candidate => activeHouse?.openedBoxIds.includes(candidate.id))) {
    emitStoryMissionEvent('open-house-boxes')
  }
  scheduleSave()
  void syncInventory()
  return true
}

export function updateHouseFurnitureTransform(
  instanceId: string,
  transform: HouseTransform
): boolean {
  if (!canEditActiveHouse() || !activeHouse) return false

  const placement = activeHouse.furniture[instanceId]
  if (!placement || placement.claimed) return false

  placement.transform = cloneTransform(transform)
  emitStoryMissionEvent('move-house-furniture')
  if (HOUSE_BOXES.every(candidate => activeHouse?.openedBoxIds.includes(candidate.id))) {
    emitStoryMissionEvent('house-furniture-reorganized')
  }
  const entity = furnitureEntities.get(instanceId)
  if (entity !== undefined) applyTransform(entity, placement.transform)
  if (
    session?.selectedFurnitureInstanceId === instanceId &&
    gizmoRoot !== null
  ) {
    const gizmoTransform = Transform.getMutable(gizmoRoot)
    gizmoTransform.position = Vector3.create(
      placement.transform.position.x,
      placement.transform.position.y,
      placement.transform.position.z
    )
  }
  scheduleSave()
  return true
}

export function moveSelectedHouseFurniture(delta: HouseVector3): boolean {
  const instanceId = session?.selectedFurnitureInstanceId
  if (!instanceId || !activeHouse) return false

  const placement = activeHouse.furniture[instanceId]
  if (!placement) return false

  return updateHouseFurnitureTransform(instanceId, {
    ...placement.transform,
    position: addVectors(placement.transform.position, delta)
  })
}

export function rotateSelectedHouseFurniture(
  axis: HouseAxis,
  degrees: number
): boolean {
  const instanceId = session?.selectedFurnitureInstanceId
  if (!instanceId || !activeHouse) return false

  const placement = activeHouse.furniture[instanceId]
  if (!placement) return false

  return updateHouseFurnitureTransform(instanceId, {
    ...placement.transform,
    rotation: {
      ...placement.transform.rotation,
      [axis]: placement.transform.rotation[axis] + degrees
    }
  })
}

export function clearHouseFurnitureSelection(): void {
  if (!session) return
  session.selectedFurnitureInstanceId = null
  heldMove = null
  removeEditorGizmo()
  notifyEditorChanged()
}

export function setHouseEditorMode(mode: HouseEditorMode): void {
  if (!session || session.editorMode === mode) return
  session.editorMode = mode
  renderEditorGizmo()
  notifyEditorChanged()
}

export function toggleHouseEditorMode(): void {
  setHouseEditorMode(session?.editorMode === 'rotate' ? 'move' : 'rotate')
}

export function saveSelectedHouseFurnitureToInventory(): boolean {
  const instanceId = session?.selectedFurnitureInstanceId
  if (!instanceId || !activeHouse || !canEditActiveHouse()) return false
  const placement = activeHouse.furniture[instanceId]
  if (!placement) return false

  placement.stored = true
  addItem(furnitureInventoryItemId(placement.furnitureId), 1)
  const entity = furnitureEntities.get(instanceId)
  if (entity !== undefined) engine.removeEntity(entity)
  furnitureEntities.delete(instanceId)
  clearHouseFurnitureSelection()
  scheduleSave()
  void syncInventory()
  return true
}

export function restoreHouseFurnitureFromInventory(
  instanceId: string,
  transform?: HouseTransform
): boolean {
  if (!activeHouse || !canEditActiveHouse()) return false
  const placement = activeHouse.furniture[instanceId]
  if (!placement || !placement.stored) return false
  if (transform) placement.transform = cloneTransform(transform)
  placement.stored = false
  spawnFurniture(placement)
  scheduleSave()
  return true
}

export function getStoredHouseFurniture(): readonly HouseFurniturePlacement[] {
  if (!activeHouse) return []
  return Object.values(activeHouse.furniture).filter(placement => placement.stored)
}

export function canDropHouseFurnitureItem(itemId: string): boolean {
  if (!activeHouse || getItemAmount(itemId) < 1) return false
  return Object.values(activeHouse.furniture).some(
    placement => placement.stored && furnitureInventoryItemId(placement.furnitureId) === itemId
  )
}

export function dropHouseFurnitureItem(itemId: string): boolean {
  if (!activeHouse || !canEditActiveHouse()) return false
  const placement = Object.values(activeHouse.furniture).find(
    candidate => candidate.stored && furnitureInventoryItemId(candidate.furnitureId) === itemId
  )
  if (!placement) return false

  const camera = Transform.get(engine.CameraEntity)
  const cameraForward = Vector3.rotate(Vector3.Forward(), camera.rotation)
  const horizontalLength = Math.hypot(cameraForward.x, cameraForward.z) || 1
  const player = getPlayer()
  const origin = player?.position ?? camera.position
  const droppedTransform: HouseTransform = {
    ...cloneTransform(placement.transform),
    position: {
      x: origin.x + cameraForward.x / horizontalLength * 2.25,
      y: origin.y,
      z: origin.z + cameraForward.z / horizontalLength * 2.25
    }
  }

  if (!removeItem(itemId, 1)) return false
  if (!restoreHouseFurnitureFromInventory(placement.instanceId, droppedTransform)) {
    addItem(itemId, 1)
    return false
  }
  void syncInventory()
  return true
}

export function takeHouseFurnitureIntoSharedZone(itemId: string, sharedObjectId: string): boolean {
  if (!activeHouse || !canEditActiveHouse()) return false
  const placement = Object.values(activeHouse.furniture).find(
    candidate => candidate.stored && furnitureInventoryItemId(candidate.furnitureId) === itemId
  )
  if (!placement || !removeItem(itemId, 1)) return false
  placement.stored = false
  placement.sharedObjectId = sharedObjectId
  scheduleSave()
  void syncInventory()
  return true
}

export function returnSharedFurnitureToInventory(sharedObjectId: string, itemId: string): boolean {
  if (!ownerHouse) return false
  const placement = Object.values(ownerHouse.furniture).find(
    candidate => candidate.sharedObjectId === sharedObjectId
  )
  if (!placement) return false
  placement.sharedObjectId = null
  placement.stored = true
  addItem(itemId, 1)
  scheduleSave()
  void syncInventory()
  return true
}

export function giveStoredHouseFurniture(itemId: string): HouseFurniturePlacement | null {
  if (!ownerHouse) return null
  const placement = Object.values(ownerHouse.furniture).find(
    candidate => candidate.stored && furnitureInventoryItemId(candidate.furnitureId) === itemId
  )
  if (!placement || !removeItem(itemId, 1)) return null
  delete ownerHouse.furniture[placement.instanceId]
  scheduleSave()
  void syncInventory()
  return placement
}

export function receiveHouseFurnitureGift(itemId: string): boolean {
  if (!ownerHouse || !itemId.startsWith('house_furniture:')) return false
  const furnitureId = itemId.slice('house_furniture:'.length)
  const definition = resolveFurnitureDefinition(furnitureId)
  if (!definition) return false
  const instanceId = `gift:${Date.now()}:${Math.floor(Math.random() * 1_000_000)}`
  ownerHouse.furniture[instanceId] = {
    instanceId,
    furnitureId,
    sourceBoxId: null,
    transform: {
      position: { x: 328, y: 31, z: 338 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: cloneVector(definition.defaultScale)
    },
    planter: null,
    stored: true,
    claimed: false,
    sharedObjectId: null
  }
  addItem(itemId, 1)
  discoverItem(itemId)
  scheduleSave()
  void syncInventory()
  return true
}

export function getHouseEditorSnapshot(): HouseEditorSnapshot {
  const instanceId = session?.selectedFurnitureInstanceId ?? null
  const placement = instanceId && activeHouse ? activeHouse.furniture[instanceId] : null
  const definition = placement ? resolveFurnitureDefinition(placement.furnitureId) : null
  return {
    visible: Boolean(instanceId && placement && !placement.stored && canEditActiveHouse()),
    mode: session?.editorMode ?? 'move',
    selectedInstanceId: instanceId,
    selectedName: definition?.name ?? ''
  }
}

export function setHouseVisibility(visibility: 'private' | 'public'): void {
  if (!ownerHouse) return
  ownerHouse.visibility = visibility
  ownerHouse.updatedAt = Date.now()
  void syncHouse()
}

export async function visitPlayerDimension(wallet: string): Promise<boolean> {
  const snapshot = await loadPublicHouse(wallet)
  if (!snapshot) return false

  closeInventory()
  hidePlantMenu()
  closeChiriUi()

  activeHouse = snapshot.house
  session = {
    mode: 'visitor',
    ownerWallet: snapshot.wallet,
    selectedFurnitureInstanceId: null,
    editorMode: 'move'
  }
  renderActiveHouse()
  showVisitorFarm(snapshot.plots)
  dimensionVisitRevision++
  onDimensionVisitChanged()
  return true
}

export function returnToOwnDimension(): void {
  if (!ownerHouse) return

  activeHouse = ownerHouse
  session = {
    mode: 'owner',
    ownerWallet: getPlayer()?.userId ?? '',
    selectedFurnitureInstanceId: null,
    editorMode: 'move'
  }
  renderActiveHouse()
  hideVisitorFarm()
  dimensionVisitRevision++
  onDimensionVisitChanged()
}

export function isVisitingPlayerDimension(): boolean {
  return session?.mode === 'visitor'
}

export function getDimensionVisitRevision(): number {
  return dimensionVisitRevision
}

export function getVisitedDimensionOwner(): string {
  return session?.mode === 'visitor' ? session.ownerWallet : ''
}

export function setDimensionVisitChangedListener(listener: () => void): void {
  onDimensionVisitChanged = listener
}

export function getHouseSession(): Readonly<HouseSession> | null {
  return session
}

export function getActiveHouse(): Readonly<PlayerHouse> | null {
  return activeHouse
}
