import { Entity } from '@dcl/sdk/ecs'

const plotEntities: Record<number, Entity> = {}

export function setPlotEntity(

  plotId: number,

  entity: Entity

) {

  plotEntities[plotId] = entity

}

export function getPlotEntity(

  plotId: number

) {

  return plotEntities[plotId]

}

export function removePlotEntity(

  plotId: number

) {

  delete plotEntities[plotId]

}