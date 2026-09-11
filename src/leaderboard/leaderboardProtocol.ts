import { Schemas } from '@dcl/sdk/ecs'
import { registerMessages } from '@dcl/sdk/network'

export const LeaderboardMessages = {
  leaderboardSnapshotRequest: Schemas.Map({
    playerName: Schemas.String
  }),
  leaderboardSnapshot: Schemas.Map({
    stateJson: Schemas.String
  }),
  leaderboardEvent: Schemas.Map({
    activity: Schemas.String,
    eventId: Schemas.String,
    eventReference: Schemas.String,
    playerName: Schemas.String
  }),
  leaderboardEventResult: Schemas.Map({
    accepted: Schemas.Boolean,
    reason: Schemas.String,
    activity: Schemas.String,
    eventId: Schemas.String,
    awardedPoints: Schemas.Int,
    lifetimePoints: Schemas.Int64,
    periodPoints: Schemas.Int64
  })
} as const

// The network transport supplies context.from on the server. The client is not
// allowed to include a wallet address in any leaderboard message.
export const leaderboardRoom = registerMessages(LeaderboardMessages)

