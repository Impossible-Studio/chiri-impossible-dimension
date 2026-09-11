import {
  engine,
  Transform,
  GltfContainer,
  VisibilityComponent,
  pointerEventsSystem,
  InputAction
} from '@dcl/sdk/ecs'

import { Vector3, Quaternion } from '@dcl/sdk/math'

import { SeedComponent } from './components'
import { SEEDS } from './seedLocations'
import { getCrop } from './definitions'
import { addItem } from './inventory'

import {
  addCollected,
  wasCollected,
  syncCollected,
  syncInventory
} from './player'

import { showNotification } from './notifications'
import { CONFIG } from './config'
import { registerFirstSeedsQuestSeedFound } from './questState'
import { awardPoints } from '../gameplay/points'
import { canModifyCurrentDimension } from '../house/houseSystem'

function randomAmount(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function initializeSeedSystem() {

  for (const seed of SEEDS) {

    if (wasCollected(seed.cropId, seed.id)) {
      continue
    }

    const crop = getCrop(seed.cropId)

    const entity = engine.addEntity()

    Transform.create(entity, {
      position: Vector3.create(
        seed.x,
        seed.y,
        seed.z
      ),

      rotation: Quaternion.fromEulerDegrees(
        seed.rotation.x,
        seed.rotation.y,
        seed.rotation.z
      ),

      scale: Vector3.create(
        1,
        1,
        1
      )
    })

    GltfContainer.create(entity, {
      src: crop.seedModel
    })

    VisibilityComponent.create(entity, {
      visible: true
    })

    SeedComponent.create(entity, {
      cropId: seed.cropId,
      seedId: seed.id,
      picked: false
    })

    pointerEventsSystem.onPointerDown(
      {
        entity,

        opts: {
          hoverText: 'Collect Seeds',
          button: InputAction.IA_POINTER
        }
      },

      () => {

        if (!canModifyCurrentDimension()) return

        const amount = randomAmount(
          CONFIG.MIN_SEED_PICKUP,
          CONFIG.MAX_SEED_PICKUP
        )

        addItem(
          crop.seedItem,
          amount
        )

        registerFirstSeedsQuestSeedFound()

        const earnedPoints = awardPoints(
          'seedCollected',
          true,
          `${seed.cropId}:${seed.id}`
        )

        addCollected(
          seed.cropId,
          seed.id
        )

        syncCollected()
        syncInventory()

        showNotification(
          `+${amount} ${crop.displayName} Seeds · +${earnedPoints} points`
        )

        engine.removeEntity(entity)
      }
    )
  }
}
