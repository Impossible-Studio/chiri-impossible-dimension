import {
  engine,
  pointerEventsSystem,
  InputAction,
} from '@dcl/sdk/ecs'

import {
  getPlots,
  getProgress,
  syncPlots,
  syncInventory
} from './player'

import {
  getCrop
} from './definitions'

import {
  getCropEntity,
  removeCropEntity
} from './cropEntities'

import {
  addItem
} from './inventory'

import {
  showNotification
} from './notifications'

import {

  getPlotEntity

} from './plotEntities'

import {

  FarmPlotComponent

} from './components'

import {
  completeHarvestReadyQuest,
  registerHarvestReadyQuest
} from './questState'
import { awardPoints } from '../gameplay/points'
import { canModifyCurrentDimension } from '../house/houseSystem'
import { recordChiriWorldEvent } from '../companion/chiriCare'

const registeredHarvest = new Set<number>()

function randomAmount(

  min: number,

  max: number

) {

  return Math.floor(

    Math.random() *

    (max - min + 1)

  ) + min

}

export function initializeHarvestSystem() {

  engine.addSystem(() => {

    const plots = getPlots()

    for (const key in plots) {

      const plotId = Number(key)

      const plot = plots[plotId]
      
      

      if (!plot) {

        continue

      }

      if (plot.stage !== 2) {

        continue

      }

      registerHarvestReadyQuest(plotId, plot.cropId)

      if (registeredHarvest.has(plotId)) {

        continue

      }

      const cropEntity = getCropEntity(plotId)

      

      if (!cropEntity) {

        continue

      }

      
      
      registeredHarvest.add(plotId)

      pointerEventsSystem.onPointerDown(

        {

          entity: cropEntity,

          opts: {

            hoverText: 'Harvest',

            button: InputAction.IA_POINTER

          }

        },

        () => {

          if (!canModifyCurrentDimension()) return

          const crop = getCrop(

            plot.cropId

          )

          const amount = randomAmount(

  crop.yieldMin,

  crop.yieldMax

)

addItem(

  crop.cropItem,

  amount

)


          engine.removeEntity(

            cropEntity

          )

          const plotEntity = getPlotEntity(

  plotId

)

if (plotEntity) {

  const plotComponent =

    FarmPlotComponent.getMutable(

      plotEntity

    )

  plotComponent.occupied = false

  plotComponent.cropId = ''

}

          

          
          removeCropEntity(

            plotId

          )

          plots[plotId] = null

          completeHarvestReadyQuest(plotId, crop.id)

          void Promise.all([
  syncInventory(),
  syncPlots()
])          

          recordChiriWorldEvent(getProgress(), 'harvest', crop.id)
          const earnedPoints = awardPoints('cropHarvested')

          showNotification(

            `Harvested ${amount} ${crop.displayName}! · +${earnedPoints} points`

          )

          registeredHarvest.delete(

            plotId

          )

        }

      )

    }

  })

}
