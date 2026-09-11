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

import {
  addItem,
  getItemAmount,
  hasItem,
  removeItem
} from '../farming/inventory'
import {
  registerChiriMechaCraftItem,
  registerChiriMechaInventoryItem
} from '../farming/itemData'
import { showNotification } from '../farming/notifications'
import { showItemUnlockPresentation } from '../farming/itemUnlockPresentation'
import { getProgress, syncInventory, syncProgress } from '../farming/player'
import {
  completeChapterMissionQuest,
  completeCraftReadyQuest,
  registerChapterMissionQuest,
  registerRobotReadyNotice
} from '../farming/questState'
import { awardPoints } from '../gameplay/points'
import { canModifyCurrentDimension } from '../house/houseSystem'
import { selectChiriVariant } from '../companion/chiriCompanion'
import {
  CHIRI_MECHA_COLLECTION_CONFIG,
  CHIRI_MECHA_CRAFT_ITEM_ID,
  CHIRI_MECHA_CRAFT_QUEST_ID,
  CHIRI_MECHA_MISSION_ID,
  CHIRI_MECHA_PARTS,
  CHIRI_MECHA_VARIANT_ID,
  ChiriMechaPartDefinition
} from './chiriMechaConfig'

function hasCollectedPart(part: ChiriMechaPartDefinition) {
  return getProgress().chiri.mechaCollectedPartIds.includes(part.id)
}

function removePlacedPartIfPresent(part: ChiriMechaPartDefinition) {
  const placedEntity = engine.getEntityOrNullByName(part.entityName)
  if (placedEntity !== null) {
    engine.removeEntity(placedEntity)
  }
}

function createOrReusePartEntity(part: ChiriMechaPartDefinition): Entity {
  const placedEntity = engine.getEntityOrNullByName(part.entityName)
  const entity = placedEntity ?? engine.addEntity()

  Transform.createOrReplace(entity, {
    position: Vector3.create(part.position.x, part.position.y, part.position.z),
    rotation: Quaternion.fromEulerDegrees(
      part.rotation.x,
      part.rotation.y,
      part.rotation.z
    ),
    scale: Vector3.create(part.scale, part.scale, part.scale)
  })

  GltfContainer.createOrReplace(entity, {
    src: part.worldModel,
    // The pickup can be pointed at, but it never becomes an invisible wall for
    // the player or Chiri's navigation rays.
    visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
    invisibleMeshesCollisionMask: ColliderLayer.CL_NONE
  })
  VisibilityComponent.createOrReplace(entity, { visible: true })
  return entity
}

function registerForestMechaMission() {
  const mission = CHIRI_MECHA_COLLECTION_CONFIG.mission
  registerChapterMissionQuest({
    id: CHIRI_MECHA_MISSION_ID,
    chapter: mission.chapter,
    mission: mission.mission,
    title: mission.title,
    info: mission.info,
    cardType: 'chapter-mission'
  })
}

function completeMechaPartsMission(showPresentation: boolean) {
  registerForestMechaMission()
  const newlyCompletedMission = completeChapterMissionQuest(
    CHIRI_MECHA_MISSION_ID,
    showPresentation
  )
  if (newlyCompletedMission) {
    registerRobotReadyNotice()
  }
  void syncProgress()
}

function collectPart(part: ChiriMechaPartDefinition, entity: Entity) {
  if (!canModifyCurrentDimension() || hasCollectedPart(part)) return

  // Discovering a piece also activates the forest mission for saves that
  // reached the forest before chapter progression was persisted explicitly.
  registerForestMechaMission()
  const progress = getProgress()
  progress.chiri.mechaCollectedPartIds.push(part.id)
  addItem(part.inventoryItemId, 1)

  const earnedPoints = awardPoints('chiriMechaPartCollected', true, part.id)
  engine.removeEntity(entity)
  void syncInventory()
  void syncProgress()

  const collectedCount = CHIRI_MECHA_PARTS.filter(hasCollectedPart).length
  const allPartsCollected = CHIRI_MECHA_PARTS.every(hasCollectedPart)

  showNotification(
    `${part.displayName} found · +${earnedPoints} points (${collectedCount}/${CHIRI_MECHA_PARTS.length})`
  )

  if (allPartsCollected) {
    completeMechaPartsMission(true)
    craftChiriMecha(true)
  }
}

function initializePart(part: ChiriMechaPartDefinition) {
  registerChiriMechaInventoryItem(
    part.inventoryItemId,
    part.displayName,
    part.inventoryIcon
  )

  if (hasCollectedPart(part)) {
    removePlacedPartIfPresent(part)
    return
  }

  const entity = createOrReusePartEntity(part)
  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: CHIRI_MECHA_COLLECTION_CONFIG.pointerHoverText,
        maxDistance: CHIRI_MECHA_COLLECTION_CONFIG.pointerMaxDistance
      }
    },
    () => collectPart(part, entity)
  )
}

// Register UI metadata before the asynchronous player load. The inventory can
// therefore render and preload the correct collectible cards from its first
// frame, while world pickup entities still wait for player progress below.
export function registerChiriMechaItemCatalog() {
  registerChiriMechaCraftItem(
    CHIRI_MECHA_CRAFT_ITEM_ID,
    CHIRI_MECHA_COLLECTION_CONFIG.craftItemIcon
  )
  for (const part of CHIRI_MECHA_PARTS) {
    registerChiriMechaInventoryItem(
      part.inventoryItemId,
      part.displayName,
      part.inventoryIcon
    )
  }
}

export function initializeChiriMechaSystem() {
  registerChiriMechaItemCatalog()

  const progress = getProgress()
  registerChiriMechaCraftItem(
    CHIRI_MECHA_CRAFT_ITEM_ID,
    CHIRI_MECHA_COLLECTION_CONFIG.craftItemIcon,
    progress.chiri.mechaCrafted
  )
  let inventoryChanged = false
  const legacyCraftProjectAmount = getItemAmount(CHIRI_MECHA_CRAFT_ITEM_ID)
  if (progress.chiri.mechaCrafted) {
    // Repair saves made while the completed suit was not retained as an item.
    if (legacyCraftProjectAmount < 1) {
      addItem(CHIRI_MECHA_CRAFT_ITEM_ID, 1)
      inventoryChanged = true
    } else if (legacyCraftProjectAmount > 1) {
      removeItem(
        CHIRI_MECHA_CRAFT_ITEM_ID,
        legacyCraftProjectAmount - 1
      )
      inventoryChanged = true
    }
  } else if (legacyCraftProjectAmount > 0) {
    // Older builds placed the uncrafted project in Inventory. It now lives
    // exclusively in Quests until all six parts are actually consumed.
    removeItem(CHIRI_MECHA_CRAFT_ITEM_ID, legacyCraftProjectAmount)
    inventoryChanged = true
  }
  if (
    progress.story.activeChapter >= 2 ||
    progress.chiri.mechaCollectedPartIds.length > 0
  ) {
    registerForestMechaMission()
  }

  for (const part of CHIRI_MECHA_PARTS) {
    initializePart(part)
  }

  // Saves created before crafting existed may already contain the skin. Keep
  // the six parts, but return the skin to locked until it is really crafted.
  if (!progress.chiri.mechaCrafted) {
    progress.chiri.unlockedVariants = progress.chiri.unlockedVariants.filter(
      variantId => variantId !== CHIRI_MECHA_VARIANT_ID
    )
    if (progress.chiri.activeVariant === CHIRI_MECHA_VARIANT_ID) {
      progress.chiri.activeVariant = 'classic'
      selectChiriVariant('classic')
    }
  }

  // The sixth discovered part assembles the complete suit automatically. This
  // also upgrades older saves that stopped at the former Craftpack step.
  if (CHIRI_MECHA_PARTS.every(hasCollectedPart) && !progress.chiri.mechaCrafted) {
    completeMechaPartsMission(false)
    craftChiriMecha(false)
  }
  if (inventoryChanged) void syncInventory()
  void syncProgress()
}

export function canCraftChiriMecha() {
  if (getProgress().chiri.mechaCrafted) return false
  // The collected-id path is the current flow. The inventory fallback repairs
  // saves from the older build that stored every part before this flag existed.
  return CHIRI_MECHA_PARTS.every(hasCollectedPart) ||
    CHIRI_MECHA_PARTS.every(part => hasItem(part.inventoryItemId))
}

// Kept exported for save repair and tests; normal gameplay calls it
// automatically as soon as the sixth unique piece is collected.
export function craftChiriMecha(showUnlockPresentation = true) {
  if (!canCraftChiriMecha()) return false

  for (const part of CHIRI_MECHA_PARTS) {
    if (hasItem(part.inventoryItemId)) removeItem(part.inventoryItemId, 1)
  }
  completeCraftReadyQuest(CHIRI_MECHA_CRAFT_QUEST_ID)

  const progress = getProgress()
  progress.chiri.mechaCrafted = true
  registerChiriMechaCraftItem(
    CHIRI_MECHA_CRAFT_ITEM_ID,
    CHIRI_MECHA_COLLECTION_CONFIG.craftItemIcon,
    true
  )
  addItem(CHIRI_MECHA_CRAFT_ITEM_ID, 1)
  if (!progress.chiri.unlockedVariants.includes(CHIRI_MECHA_VARIANT_ID)) {
    progress.chiri.unlockedVariants.push(CHIRI_MECHA_VARIANT_ID)
  }
  if (showUnlockPresentation) {
    showItemUnlockPresentation({
      itemId: CHIRI_MECHA_CRAFT_ITEM_ID,
      icon: CHIRI_MECHA_COLLECTION_CONFIG.craftItemIcon,
      artworkAspectRatio: 196 / 205
    })
  }
  const points = awardPoints('chiriMechaUnlocked', true, 'chiri-mecha')
  void syncInventory()
  void syncProgress()
  showNotification(`Chiri Mecha assembled automatically! · +${points} points`)
  return true
}

export function isChiriMechaCrafted() {
  return getProgress().chiri.mechaCrafted
}
