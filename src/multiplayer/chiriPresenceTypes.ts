export type LiveVector3 = {
  x: number
  y: number
  z: number
}

export type LiveQuaternion = {
  x: number
  y: number
  z: number
  w: number
}

export type LiveChiriState = {
  ownerId: string
  variantId: string
  equippedItems: string[]
  equippedMateId: string | null
  position: LiveVector3
  rotation: LiveQuaternion
  animation: string
}

export type LiveChiriSnapshot = {
  revision: number
  chiris: LiveChiriState[]
}
