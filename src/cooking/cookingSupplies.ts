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
import { addItem } from '../farming/inventory'
import { showNotification } from '../farming/notifications'
import {
  getProgress,
  isPlayerReady,
  syncCookingState
} from '../farming/player'
import { canModifyCurrentDimension } from '../house/houseSystem'
import { COOKING_SUPPLY_CONFIG as config } from './cookingSupplyConfig'
import {
  claimDailyCookingSupply,
  type DailyCookingSupplyId
} from './cookingSupplyState'
import {
  showCookingSupplyLimitFeedback,
  showCookingSupplyFeedback,
  updateCookingSupplyFeedback
} from './cookingSupplyFeedback'
import { awardPoints } from '../gameplay/points'
import { getUtcDayKey } from './cookingSupplyState'

type KitchenModel = {
  entity: Entity
  src: string
  pointer: boolean
  physical: boolean
}

let initialized = false
let fridgeOpen = false
let fridgeClosedModel: KitchenModel | null = null
let fridgeOpenModel: KitchenModel | null = null
let magicOvenModel: KitchenModel | null = null
let pizzaDoughModel: KitchenModel | null = null
let cheeseModel: KitchenModel | null = null
let yerbaModel: KitchenModel | null = null
let saveQueue: Promise<void> = Promise.resolve()

function persistSupplyClaim() {
  saveQueue = saveQueue.catch(() => {}).then(() => syncCookingState()).catch(() => {
    showNotification('Could not save the kitchen item. Please reconnect and try again.')
  })
}

function createKitchenModel(src: string, pointer: boolean, physical: boolean): KitchenModel {
  const entity = engine.addEntity()
  Transform.createOrReplace(entity, {
    position: Vector3.create(config.position.x, config.position.y, config.position.z),
    rotation: Quaternion.fromEulerDegrees(config.rotation.x, config.rotation.y, config.rotation.z),
    scale: Vector3.create(config.scale, config.scale, config.scale)
  })
  const model = { entity, src, pointer, physical }
  setKitchenModelActive(model, false)
  return model
}

function setKitchenModelActive(model: KitchenModel | null, active: boolean) {
  if (!model) return
  const mask = active
    ? (model.pointer ? ColliderLayer.CL_POINTER : ColliderLayer.CL_NONE) |
      (model.physical ? ColliderLayer.CL_PHYSICS : ColliderLayer.CL_NONE)
    : ColliderLayer.CL_NONE
  GltfContainer.createOrReplace(model.entity, {
    src: model.src,
    visibleMeshesCollisionMask: mask,
    invisibleMeshesCollisionMask: mask
  })
  VisibilityComponent.createOrReplace(model.entity, { visible: active })
}

function playerCanTakeKitchenItems() {
  return isPlayerReady() && canModifyCurrentDimension()
}

function refreshFridgeVisibility() {
  const cheeseClaimed = isPlayerReady() && getProgress().story.flags.kitchenCheeseClaimed === true
  setKitchenModelActive(fridgeClosedModel, !fridgeOpen)
  setKitchenModelActive(fridgeOpenModel, fridgeOpen)
  setKitchenModelActive(pizzaDoughModel, fridgeOpen)
  setKitchenModelActive(cheeseModel, fridgeOpen && !cheeseClaimed)
}

function toggleFridge() {
  if (!playerCanTakeKitchenItems()) return
  fridgeOpen = !fridgeOpen
  refreshFridgeVisibility()
}

function claimDailyItem(itemId: DailyCookingSupplyId, displayName: string) {
  if (!playerCanTakeKitchenItems()) return
  const claim = claimDailyCookingSupply(
    getProgress(), itemId, config.dailyLimit
  )
  if (!claim.granted) {
    showCookingSupplyLimitFeedback()
    return
  }

  addItem(itemId, 1)
  const earnedPoints = awardPoints(
    'cookingSupplyCollected',
    false,
    `${getUtcDayKey()}:${itemId}:${claim.count}`
  )
  showCookingSupplyFeedback(1)
  showNotification(`${displayName} +1 · ${claim.count}/${config.dailyLimit} today · +${earnedPoints} points`)
  persistSupplyClaim()
}

function claimCheese() {
  if (!playerCanTakeKitchenItems()) return
  const progress = getProgress()
  if (progress.story.flags.kitchenCheeseClaimed) return

  progress.story.flags.kitchenCheeseClaimed = true
  addItem('cheese', config.cheeseAmount)
  const earnedPoints = awardPoints(
    'kitchenCheeseCollected',
    false,
    'kitchen-cheese'
  )
  setKitchenModelActive(cheeseModel, false)
  showCookingSupplyFeedback(config.cheeseAmount)
  showNotification(`Cheese +${config.cheeseAmount} · +${earnedPoints} points · Chiri's last cheese is now in your backpack.`)
  persistSupplyClaim()
}

function registerClick(model: KitchenModel, hoverText: string, callback: () => void) {
  pointerEventsSystem.onPointerDown(
    {
      entity: model.entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText,
        maxDistance: config.pointerMaxDistance
      }
    },
    callback
  )
}

export function initializeCookingSupplies() {
  if (initialized) return
  initialized = true

  fridgeClosedModel = createKitchenModel(config.models.fridgeClosed, true, true)
  fridgeOpenModel = createKitchenModel(config.models.fridgeOpen, true, true)
  magicOvenModel = createKitchenModel(config.models.magicOven, false, true)
  pizzaDoughModel = createKitchenModel(config.models.pizzaDough, true, false)
  cheeseModel = createKitchenModel(config.models.cheese, true, false)
  yerbaModel = createKitchenModel(config.models.yerba, true, false)

  registerClick(fridgeClosedModel, 'Open fridge', toggleFridge)
  registerClick(fridgeOpenModel, 'Close fridge', toggleFridge)
  registerClick(pizzaDoughModel, 'Take pizza dough', () => {
    if (fridgeOpen) claimDailyItem('pizza_dough', 'Pizza Dough')
  })
  registerClick(cheeseModel, 'Take cheese', () => {
    if (fridgeOpen) claimCheese()
  })
  registerClick(yerbaModel, 'Take yerba', () => claimDailyItem('yerba', 'Yerba'))

  fridgeOpen = false
  refreshFridgeVisibility()
  setKitchenModelActive(magicOvenModel, true)
  setKitchenModelActive(yerbaModel, true)
  engine.addSystem(updateCookingSupplyFeedback)
}
