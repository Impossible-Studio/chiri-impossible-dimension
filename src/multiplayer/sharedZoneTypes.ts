export type SharedVector3 = {
  x: number
  y: number
  z: number
}

export type SharedQuaternion = {
  x: number
  y: number
  z: number
  w: number
}

export type SharedChiriState = {
  ownerId: string
  variantId: string
  position: SharedVector3
  rotationY: number
  behavior: string
}

export type SharedObjectState = {
  objectId: string
  ownerId: string
  itemId: string
  position: SharedVector3
  rotation: SharedQuaternion
  scale: SharedVector3
  updatedBy: string
}

export type SharedObjectLock = {
  objectId: string
  ownerId: string
  expiresAt: number
}

export type SharedZoneState = {
  revision: number
  chiris: SharedChiriState[]
  objects: SharedObjectState[]
}

export type SharedGift = {
  giftId: string
  senderId: string
  targetId: string
  itemId: string
}

export type SharedZoneClientState = SharedZoneState & {
  enabled: boolean
  locks: SharedObjectLock[]
}
