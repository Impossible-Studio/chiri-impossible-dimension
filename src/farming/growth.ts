import {
  engine,
  GltfContainer,
  MeshCollider
} from '@dcl/sdk/ecs'

import {
  getPlots,
  syncPlots
} from './player'

import {
  getCrop
} from './definitions'

import {
  getCropEntity
} from './cropEntities'

import {
  registerHarvestReadyQuest
} from './questState'

export function initializeGrowthSystem() {

  engine.addSystem(() => {

    const plots = getPlots()

    for (const key in plots) {

      const plotId = Number(key)

      const plot = plots[plotId]

      if (!plot) {
        continue
      }

      if (plot.stage !== 1) {
        continue
      }

      const crop = getCrop(plot.cropId)

      const elapsed = Date.now() - plot.plantedAt

      if (elapsed < crop.growTime) {
        continue
      }

      const cropEntity = getCropEntity(plotId)

      if (!cropEntity) {
        continue
      }

      if (!GltfContainer.has(cropEntity)) {
  continue
}

      const gltf = GltfContainer.getMutable(

  cropEntity

)

gltf.src = crop.stage2Model

      if (crop.id === 'carrot') {
        MeshCollider.setBox(cropEntity)
      }

      plot.stage = 2

      registerHarvestReadyQuest(plotId, plot.cropId)

      void syncPlots()

      

        }

  })

}
