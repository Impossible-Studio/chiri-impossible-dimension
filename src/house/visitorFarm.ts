import { ColliderLayer, engine, GltfContainer, Transform, VisibilityComponent, type Entity } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getCrop } from '../farming/definitions'
import { getCropEntity } from '../farming/cropEntities'
import { PLOTS } from '../farming/plotLocations'
import type { PlotData } from '../farming/types'

const visitorCropEntities: Entity[] = []

function setOwnCropsVisible(visible: boolean): void {
  for (const plot of PLOTS) {
    const entity = getCropEntity(plot.id)
    if (entity !== undefined) VisibilityComponent.createOrReplace(entity, { visible })
  }
}

export function showVisitorFarm(plots: Record<number, PlotData | null>): void {
  hideVisitorFarm()
  setOwnCropsVisible(false)
  for (const plotLocation of PLOTS) {
    const plot = plots[plotLocation.id]
    if (!plot) continue
    const crop = getCrop(plot.cropId)
    if (!crop) continue
    const entity = engine.addEntity()
    visitorCropEntities.push(entity)
    Transform.create(entity, {
      position: Vector3.create(plotLocation.x, plotLocation.y, plotLocation.z)
    })
    GltfContainer.create(entity, {
      src: plot.stage === 2 ? crop.stage2Model : crop.stage1Model,
      visibleMeshesCollisionMask: ColliderLayer.CL_NONE,
      invisibleMeshesCollisionMask: ColliderLayer.CL_NONE
    })
  }
}

export function hideVisitorFarm(): void {
  for (const entity of visitorCropEntities) engine.removeEntity(entity)
  visitorCropEntities.length = 0
  setOwnCropsVisible(true)
}
