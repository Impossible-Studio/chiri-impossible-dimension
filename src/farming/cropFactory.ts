import {
  engine,
  Entity,
  Transform,
  GltfContainer,
  MeshCollider
} from '@dcl/sdk/ecs'

import { Vector3 } from '@dcl/sdk/math'

import { PLOTS } from './plotLocations'

import { CropDefinition } from './types'

import { setCropEntity } from './cropEntities'

export function spawnCrop(

  plotId: number,

  crop: CropDefinition,

  stage: 1 | 2

): Entity {

  const plot = PLOTS[plotId - 1]

  const entity = engine.addEntity()

  setCropEntity(

    plotId,

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

      stage === 1

        ? crop.stage1Model

        : crop.stage2Model

  })

  // The mature carrot GLB has no embedded pointer collider.
  if (crop.id === 'carrot' && stage === 2) {
    MeshCollider.setBox(entity)
  }

  return entity

}
