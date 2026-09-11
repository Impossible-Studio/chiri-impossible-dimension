import { Schemas } from '@dcl/sdk/ecs'
import { registerMessages } from '@dcl/sdk/network'

export const SharedZoneMessages = {
  liveChiriSnapshotRequest: Schemas.Map({}),
  liveChiriSnapshot: Schemas.Map({
    stateJson: Schemas.String
  }),
  liveChiriUpsert: Schemas.Map({
    variantId: Schemas.String,
    equippedItemsJson: Schemas.String,
    equippedMateId: Schemas.String,
    position: Schemas.Vector3,
    rotation: Schemas.Quaternion,
    animation: Schemas.String
  }),
  liveChiriRemove: Schemas.Map({}),
  liveChiriChanged: Schemas.Map({
    ownerId: Schemas.String,
    present: Schemas.Boolean,
    variantId: Schemas.String,
    equippedItemsJson: Schemas.String,
    equippedMateId: Schemas.String,
    position: Schemas.Vector3,
    rotation: Schemas.Quaternion,
    animation: Schemas.String,
    revision: Schemas.Int
  }),
  sharedZoneReady: Schemas.Map({
    enabled: Schemas.Boolean,
    protocolVersion: Schemas.Int
  }),
  sharedZoneSnapshotRequest: Schemas.Map({}),
  sharedZoneSnapshot: Schemas.Map({
    stateJson: Schemas.String
  }),
  sharedChiriUpsert: Schemas.Map({
    variantId: Schemas.String,
    position: Schemas.Vector3,
    rotationY: Schemas.Float,
    behavior: Schemas.String
  }),
  sharedChiriRemove: Schemas.Map({}),
  sharedChiriChanged: Schemas.Map({
    ownerId: Schemas.String,
    present: Schemas.Boolean,
    variantId: Schemas.String,
    position: Schemas.Vector3,
    rotationY: Schemas.Float,
    behavior: Schemas.String,
    revision: Schemas.Int
  }),
  sharedObjectLockRequest: Schemas.Map({
    objectId: Schemas.String
  }),
  sharedObjectLockRelease: Schemas.Map({
    objectId: Schemas.String
  }),
  sharedObjectLockChanged: Schemas.Map({
    objectId: Schemas.String,
    ownerId: Schemas.String,
    granted: Schemas.Boolean,
    expiresAt: Schemas.Int64,
    revision: Schemas.Int
  }),
  sharedObjectMove: Schemas.Map({
    objectId: Schemas.String,
    position: Schemas.Vector3,
    rotation: Schemas.Quaternion,
    scale: Schemas.Vector3
  }),
  sharedObjectCreate: Schemas.Map({
    objectId: Schemas.String,
    itemId: Schemas.String,
    position: Schemas.Vector3,
    rotation: Schemas.Quaternion,
    scale: Schemas.Vector3
  }),
  sharedObjectRemove: Schemas.Map({
    objectId: Schemas.String
  }),
  sharedObjectChanged: Schemas.Map({
    objectId: Schemas.String,
    ownerId: Schemas.String,
    itemId: Schemas.String,
    present: Schemas.Boolean,
    position: Schemas.Vector3,
    rotation: Schemas.Quaternion,
    scale: Schemas.Vector3,
    updatedBy: Schemas.String,
    revision: Schemas.Int
  }),
  giftRequest: Schemas.Map({
    giftId: Schemas.String,
    targetId: Schemas.String,
    itemId: Schemas.String
  }),
  giftDelivered: Schemas.Map({
    giftId: Schemas.String,
    senderId: Schemas.String,
    targetId: Schemas.String,
    itemId: Schemas.String
  }),
  giftResult: Schemas.Map({
    giftId: Schemas.String,
    accepted: Schemas.Boolean,
    message: Schemas.String
  }),
  sharedZoneError: Schemas.Map({
    code: Schemas.String,
    message: Schemas.String
  })
} as const

// Message schemas must be registered before main() runs on both the client and
// the authoritative server. Import this shared room from either side.
export const sharedZoneRoom = registerMessages(SharedZoneMessages)
