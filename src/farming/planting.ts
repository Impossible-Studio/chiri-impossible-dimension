import { getCrop } from './definitions'

import {
  getPlots,
  getProgress,
  syncInventory,
  syncPlots
} from './player'

import {
  removeItem
} from './inventory'

import {
  spawnCrop
} from './cropFactory'

import {
  setCropEntity
} from './cropEntities'

import {
  getPlotEntity
} from './plotEntities'

import {
  FarmPlotComponent
} from './components'

import {
  showNotification
} from './notifications'

import {
  registerFirstSeedsQuestPlanting
} from './questState'
import { awardPoints } from '../gameplay/points'
import { canModifyCurrentDimension } from '../house/houseSystem'
import { recordChiriWorldEvent } from '../companion/chiriCare'

export function plantCrop(
  plotId: number,
  cropId: string
) {

  if (!canModifyCurrentDimension()) {
    showNotification("You can't plant while visiting another dimension.")
    return
  }

  const plots = getPlots()

  if (plots[plotId] !== null) {

  showNotification('This plot is already occupied!')

  return

}

  const crop = getCrop(cropId)

  if (!removeItem(crop.seedItem, 1)) {

  showNotification(
    `You don't have any ${crop.displayName} Seeds!`
  )

  return
}

const cropEntity = spawnCrop(
  plotId,
  crop,
  1
)

setCropEntity(
  plotId,
  cropEntity
)

plots[plotId] = {
  cropId: crop.id,
  plantedAt: Date.now(),
  stage: 1
}

const plotEntity = getPlotEntity(
  plotId
)

if (plotEntity) {

  const plotComponent =
    FarmPlotComponent.getMutable(
      plotEntity
    )

  plotComponent.occupied = true
  plotComponent.cropId = crop.id
}

void Promise.all([
  syncInventory(),
  syncPlots()
])

recordChiriWorldEvent(getProgress(), 'plant', crop.id)
const earnedPoints = awardPoints('cropPlanted')

showNotification(
  `Planted ${crop.displayName}! · +${earnedPoints} points`
)

registerFirstSeedsQuestPlanting()

}
