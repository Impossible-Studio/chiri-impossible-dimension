import {
  Entity,
  InputAction,
  pointerEventsSystem
} from '@dcl/sdk/ecs'

import { plantCrop } from './planting'

const registeredPlots = new Map<number, Entity>()

export function registerPlotInteraction(
  plotId: number,
  entity: Entity
) {
  registeredPlots.set(plotId, entity)

  enablePlotInteraction(plotId)
}

export function enablePlotInteraction(
  plotId: number
) {
  const entity = registeredPlots.get(plotId)

  if (!entity) return

  pointerEventsSystem.onPointerDown(

    {
      entity,

      opts: {

        button: InputAction.IA_POINTER,

        hoverText: 'Plant'

      }

    },

    () => {

      plantCrop(
        plotId,
        'eggplant'
      )

    }

  )

}

export function disablePlotInteraction(
  plotId: number
) {

  // Lo implementaremos en el siguiente paso.

}