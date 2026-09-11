import { Entity } from '@dcl/sdk/ecs'

const cropEntities: Record<number, Entity> = {}

export function setCropEntity(

  plotId: number,

  entity: Entity

) {

  cropEntities[plotId] = entity

}

export function getCropEntity(

  plotId: number

) {

  return cropEntities[plotId]

}

export function removeCropEntity(

  plotId: number

) {

  delete cropEntities[plotId]

}