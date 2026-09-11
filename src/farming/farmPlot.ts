import {
  engine,
  Transform,
  GltfContainer,
  VisibilityComponent,
  pointerEventsSystem,
  InputAction
} from '@dcl/sdk/ecs'

import { Vector3 } from '@dcl/sdk/math'

import { PLOTS } from './plotLocations'

import { FarmPlotComponent } from './components'

import { getCrop } from './definitions'

import { spawnCrop } from './cropFactory'

import {
  showPlantMenu
} from './plantMenu'

import {
  getPlots
} from './player'

import {

  setPlotEntity

} from './plotEntities'

export function initializeFarmPlots() {

  

  const plots = getPlots()

  for (const plot of PLOTS) {

    const entity = engine.addEntity()

    setPlotEntity(

  plot.id,

  entity

)

    Transform.create(entity, {

      position: Vector3.create(

        plot.x,
        plot.y,
        plot.z

      )

    })

    GltfContainer.create(entity, {

      src:
        'assets/scene/Models/farming/plots/farm_plot.glb'

    })

    VisibilityComponent.create(entity, {

      visible: true

    })

    FarmPlotComponent.create(entity, {

      plotId: plot.id,

      occupied:
        plots[plot.id] !== null,

      cropId:
        plots[plot.id]?.cropId ?? ''

    })

    const savedPlot = plots[plot.id]

if (savedPlot) {

  spawnCrop(

    plot.id,

    getCrop(savedPlot.cropId),

    savedPlot.stage

  )

}

    pointerEventsSystem.onPointerDown(

  {
    entity,

    opts: {

      hoverText: plots[plot.id] ? 'Occupied Plot' : 'Plant',

      button: InputAction.IA_POINTER

    }

  },

  () => {

    if (plots[plot.id]) {
      return
    }

    showPlantMenu(
  plot.id
)

  }

)

  }

}

