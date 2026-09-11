import { engine, inputSystem, InputAction, PointerEventType } from '@dcl/sdk/ecs'
import { addItem, removeItem, getItemAmount, getInventoryOrder } from '../farming/inventory'
import { ITEM_DATA } from '../farming/itemData'
import { isPlayerReady, getProgress, syncCookingState } from '../farming/player'
import { canModifyCurrentDimension } from '../house/houseSystem'
import { CookingSession, type CookingPourSource } from './cookingSession'
import { CookingGame } from './cookingGame'
import { registerCookingCatalog } from './cookingCatalog'
import { CHIRI_COOKING_ORDERS } from './cookingConfig'
import { showNotification } from '../farming/notifications'
import { completeStoryMission } from '../farming/storyProgression'
import { awardPoints } from '../gameplay/points'
import { showChiriDialogue } from '../companion/chiriCompanion'
import { clearCookingControlState, releasePressedCookingControl, updateCookingInteractionState } from './cookingInteractionState'
import { recordChiriWorldEvent } from '../companion/chiriCare'

let onChange = () => {}
let onPourTick = (_source: CookingPourSource, _seconds: number) => {}
let canPreparePour = (_source: CookingPourSource) => false
let initialized = false
let lastScreen = 'closed'
let saveQueue: Promise<void> = Promise.resolve()
let persistenceFailed = false

function saveCookingChanges() {
  // Serialize cooking writes and read the latest local snapshot when sending.
  // This uses existing inventory/progress columns; no new Supabase migration.
  saveQueue = saveQueue.catch(() => {}).then(async () => {
    await syncCookingState()
    persistenceFailed = false
  }).catch(() => {
    persistenceFailed = true
    showNotification('Cooking save failed. Please reconnect before preparing more food.')
  })
}

export const cookingGame = new CookingGame({
  amount: getItemAmount,
  spend: costs => {
    if (persistenceFailed || !isPlayerReady() || !canModifyCurrentDimension()) return false
    if (!Object.entries(costs).every(([id, quantity]) => getItemAmount(id) >= quantity)) return false
    for (const [id, quantity] of Object.entries(costs)) removeItem(id, quantity)
    saveCookingChanges()
    return true
  },
  message: text => showNotification(text),
  serve: (recipeId, outputId, result) => {
    addItem(outputId, 1)
    getProgress().story.flags[`cookingOrder:${recipeId}`] = true
    recordChiriWorldEvent(
      getProgress(),
      outputId.startsWith('prepared_mate_') ? 'cook-mate' : 'cook-food',
      outputId
    )
    awardPoints('foodPrepared', false)
    showNotification(`${ITEM_DATA[outputId]?.name ?? outputId} added to your backpack!`)
    const completesMission = !getProgress().story.completedMissionIds.includes('chapter-1-mission-2-cook-first-meal') &&
      CHIRI_COOKING_ORDERS.every(order => getProgress().story.flags[`cookingOrder:${order.id}`])
    const completeMission = () => {
      cookingSession.close()
      completeStoryMission(1, 2)
    }
    if (result?.quality === 'bad') {
      cookingSession.close()
      const shown = showChiriDialogue(
        "Hmm... this mate is a little messy, sidekick. Next time, stop pouring when it's just right!",
        completesMission ? completeMission : undefined
      )
      if (!shown) {
        showNotification("Chiri says: This mate is a little messy. Next time, don't overfill it!")
        if (completesMission) completeMission()
      }
    } else if (completesMission) {
      completeMission()
    }
    saveCookingChanges()
  }
})

export const cookingSession = new CookingSession({
  canInteract: () => isPlayerReady() && canModifyCurrentDimension() && !persistenceFailed,
  canChooseMode: mode => mode === 'cook',
  canPour: source => {
    // Water and an owned yerba remain pressable as controls even before a cup
    // is selected. The held/active feedback teaches their function; the
    // preparation handler below changes state only when a mate can receive it.
    if (source.kind === 'water') return true
    const item = ITEM_DATA[source.itemId]
    return item?.cooking?.group === 'ingredients' &&
      item.cooking.interaction === 'hold-yerba' &&
      (getItemAmount(source.itemId) > 0 ||
        (cookingGame.yerbaPaid && cookingGame.yerbaItem === source.itemId))
  },
  onPourTick: (source, seconds) => {
    if (canPreparePour(source)) onPourTick(source, seconds)
  },
  onHeatStep: direction => cookingGame.adjustHeat(direction),
  onChange: () => {
    const screen = cookingSession.getState().screen
    if (screen !== lastScreen && (screen === 'closed' || screen === 'choose-mode')) {
      cookingGame.reset()
      basePage = 0
      ingredientStart = 0
      clearCookingControlState()
    }
    lastScreen = screen
    onChange()
  }
})

let basePage = 0
let ingredientStart = 0

// The future oven GLB click handler calls this. No interaction is added to Chiri.
export function openCookingOven() {
  registerCookingCatalog()
  return cookingSession.openOven()
}

export function reconcileCookingMission() {
  const progress = getProgress()
  if (progress.story.completedMissionIds.includes('chapter-1-mission-2-cook-first-meal')) return false
  if (!CHIRI_COOKING_ORDERS.every(order => progress.story.flags[`cookingOrder:${order.id}`])) return false
  return completeStoryMission(1, 2)
}

function cookingItemIds(group: 'bases' | 'ingredients') {
  const ids = getInventoryOrder().filter(id => ITEM_DATA[id]?.cooking?.group === group && getItemAmount(id) > 0)
  // Keep the paid yerba control available even after the last portion was spent.
  if (group === 'ingredients' && cookingGame.yerbaPaid && cookingGame.yerbaItem && !ids.includes(cookingGame.yerbaItem)) ids.push(cookingGame.yerbaItem)
  return ids
}

export function visibleCookingItems(group: 'bases' | 'ingredients') {
  const ids = cookingItemIds(group)
  if (group === 'bases') basePage = Math.min(basePage, Math.max(0, Math.ceil(ids.length / 4) - 1))
  else ingredientStart = Math.min(ingredientStart, Math.max(0, ids.length - 4))
  const start = group === 'bases' ? basePage * 4 : ingredientStart
  return ids.slice(start, start + 4)
}

export function pageCookingItems(group: 'bases' | 'ingredients', direction: -1 | 1) {
  cookingSession.cancelInputs()
  const length = cookingItemIds(group).length
  if (group === 'bases') basePage = Math.max(0, Math.min(Math.ceil(length / 4) - 1, basePage + direction))
  else ingredientStart = Math.max(0, Math.min(length - 4, ingredientStart + direction))
  onChange()
}

export function getCookingOrders() {
  return CHIRI_COOKING_ORDERS.filter(order => !getProgress().story.flags[`cookingOrder:${order.id}`])
}

export function cookingUiAction(action: () => void) {
  if (cookingSession.getState().screen !== 'cooking' || !canModifyCurrentDimension() || persistenceFailed) return
  cookingSession.cancelInputs()
  action()
  onChange()
}

export function setCookingUiListener(listener: () => void) {
  onChange = listener
}

// Injectable for future preparations; initialization connects the current mate.
export function setCookingPreparationHandlers(handlers: {
  canPour: (source: CookingPourSource) => boolean
  onPourTick: (source: CookingPourSource, seconds: number) => void
}) {
  cookingSession.cancelPour()
  canPreparePour = handlers.canPour
  onPourTick = handlers.onPourTick
}

export function initializeCookingControls() {
  if (initialized) return
  initialized = true
  registerCookingCatalog()
  setCookingPreparationHandlers({
    canPour: source => cookingGame.canPour(source),
    onPourTick: (source, dt) => cookingGame.pour(source, dt)
  })
  let previousTick = Date.now()
  engine.addSystem(dt => {
    updateCookingInteractionState()
    const now = Date.now()
    const interrupted = now - previousTick > 1000
    previousTick = now
    if (cookingSession.getState().screen === 'closed') return
    if (interrupted) {
      cookingSession.cancelInputs()
      clearCookingControlState()
      return
    }
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_UP)) {
      cookingSession.cancelInputs()
      releasePressedCookingControl()
    }
    cookingSession.update(dt)
    if (cookingSession.getState().screen === 'cooking') {
      cookingGame.update(dt)
      if (cookingGame.cooking || cookingSession.getState().held || cookingGame.readyFeedbackZone) onChange()
    }
  })
}
