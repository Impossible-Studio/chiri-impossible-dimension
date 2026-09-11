import {
  Animator,
  ColliderLayer,
  engine,
  Entity,
  GltfContainer,
  InputAction,
  inputSystem,
  RaycastQueryType,
  raycastSystem,
  Transform,
  VisibilityComponent
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { isMobile } from '@dcl/sdk/platform'
import { getPlayer } from '@dcl/sdk/players'
import { FIRST_SEEDS_QUEST_ID } from '../farming/questState'
import { PlayerProgress } from '../farming/types'
import { getChiriAccessoryDefinition } from './chiriAppearance'
import { applyChiriCareDecay, createDefaultChiriCareState } from './chiriCare'
import { ChiriSpawnReadiness, resolveChiriSpawnFloor } from './chiriSpawnGround'
import { isInsideSharedZone, SHARED_ZONE_CONFIG } from '../multiplayer/sharedZoneConfig'
import { getSharedZoneState } from '../multiplayer/sharedZoneClient'

export type ChiriMode = 'hidden' | 'intro' | 'follow' | 'free-roam'
export type ChiriLocomotion = 'idle' | 'walk' | 'run' | 'jump' | 'fly'
export type ChiriVariantId = 'classic' | 'mecha'
export type ChiriAnimation = keyof typeof CHIRI_ANIMATION_CLIPS

export interface ChiriPresenceSnapshot {
  visible: boolean
  variantId: ChiriVariantId
  equippedItems: string[]
  equippedMateId: string | null
  position?: Vector3
  rotation?: Quaternion
  animation: ChiriAnimation
}

export interface ChiriVariantDefinition {
  id: ChiriVariantId
  displayName: string
  modelPath: string
  desktopScale: number
  mobileScale: number
}

// Both scales start at the GLB's original exported size. Increase only the
// mecha desktop/mobile value after checking it in the matching client.
export const CHIRI_VARIANTS: Record<ChiriVariantId, ChiriVariantDefinition> = {
  classic: {
    id: 'classic',
    displayName: 'Classic Chiri',
    modelPath:
      'assets/scene/Models/companions/chiri/classic/chiri_classic_animated.glb',
    desktopScale: 1,
    mobileScale: 1
  },
  mecha: {
    id: 'mecha',
    displayName: 'Chiri Mecha',
    modelPath:
      'assets/scene/Models/companions/chiri/mecha/chiri_mecha_companion.glb',
    desktopScale: 1,
    mobileScale: 1
  }
}

// Companion tuning. Movement in the world is still controlled by Transform;
// the embedded GLB clips provide the visual character animation.
export const CHIRI_COMPANION_CONFIG = {
  // PlayerEntity/getPlayer reports the avatar around chest height, while
  // Chiri's GLB origin is at its feet. Increase this only if the avatar base
  // changes; lower values raise Chiri, higher values lower it.
  playerChestToGroundOffset: 1.75,
  // In the current mobile client PlayerEntity is already positioned at the
  // avatar base. Keep this separate from desktop so Chiri is not pushed below
  // the terrain on phones.
  mobilePlayerChestToGroundOffset: 0,
  // GLB inspection reports its lowest vertex at Y 0.0016, so its origin is
  // already at the feet. Keep only a tiny clearance against z-fighting.
  modelFootClearance: 0.003,
  // Follow-mode calibration is separate from the introduction so lowering the
  // companion beside the player cannot alter its correctly grounded entrance,
  // jump or wave. Negative values lower Chiri; positive values raise it.
  desktopFollowGroundCorrection: -0.1,
  mobileFollowGroundCorrection: 0,
  // Applied only after Chiri reaches its final follow position and stops.
  // Walking, running, jumping and waving keep their natural direction.
  idleYawOffsetDegrees: 1,
  // Visual compensation applied only while the idle clip is playing.
  // Negative and positive values lean toward opposite sides; set 0 to disable.
  idleRollOffsetDegrees: 6,
  // Crossfade duration between idle, bored, walk, run, jump and wave.
  // Raise it for softer/slower transitions; set 0 for an instant switch.
  animationBlendDurationSeconds: 0.28,
  spawnDistance: 3.5,
  // Returning companion: wait for the avatar to finish its initial placement.
  // This does not change the first mission's jump/wave introduction.
  // The world spawn starts in the air. Explorer can briefly report a stable
  // airborne transform while scene colliders stream in, so returning Chiri
  // waits through that phase instead of treating it as the final floor.
  spawnMinWaitSeconds: 3,
  spawnStableSeconds: 0.75,
  spawnMaxVerticalSpeed: 0.15,
  // Runtime teleports use the same landing gate, but can reappear faster than
  // the initial world spawn once a real floor has been found.
  teleportLandingMinWaitSeconds: 0.35,
  // A one-frame displacement above either limit is treated as a world
  // teleport. Chiri is hidden until the avatar lands at the destination.
  playerTeleportHorizontalDistance: 8,
  playerTeleportVerticalDistance: 2.5,
  // Chiri waits in front of the avatar instead of trailing behind.
  followDistance: 1.05,
  followSideOffset: 1,
  walkSpeed: 2.4,
  runSpeed: 4.5,
  runAtDistance: 5.5,
  // Chiri always starts by walking. It may run only after this much sustained
  // catch-up movement and once it is farther than runAtDistance.
  runStartDelaySeconds: 1.15,
  // Ordinary catch-up recovery. Keep this comfortably beyond the normal run
  // distance so Chiri does not blink beside the player too frequently.
  recoverAtDistance: 24,
  jumpDurationSeconds: 1.8,
  jumpHeight: 1.3,
  introductionDelayAfterMissionCardMs: 3000,
  introductionWaveDurationSeconds: 7,
  introductionBoredAfterIdleSeconds: 10,
  followStartDelaySeconds: 0.28,
  playerMovementThreshold: 0.015,
  playerMovementStopThresholdSeconds: 0.12,
  // While the avatar is jumping, keep Chiri on the last known floor instead
  // of copying the avatar's temporary airborne Y position.
  playerJumpGroundLockSeconds: 1.15,
  obstacleSensorIntervalSeconds: 0.15,
  obstacleSensorDistance: 1.8,
  obstacleLowerSensorHeight: 0.42,
  obstacleUpperSensorHeight: 0.95,
  obstacleBodyHalfWidth: 0.38,
  obstacleAvoidanceStrength: 1.25,
  // A continuous downward ray follows the next movement point. It keeps
  // Chiri on sloped/stacked collider surfaces instead of copying a previous
  // floor height through the visible terrain.
  groundProbeStartHeight: 2.8,
  groundProbeDistance: 7,
  groundProbeMaxAgeSeconds: 0.35,
  groundProbeMaxHorizontalError: 1.15,
  groundMinimumNormalY: 0.38,
  groundMaxStepUp: 0.65,
  groundMaxStepDown: 1.1,
  // Spawn has to tolerate the temporary chest/feet ambiguity reported by
  // different Explorer builds. Runtime movement stays on the stricter limit
  // above, while the first valid downward hit may be farther below the
  // estimated avatar base. Values beyond this are still rejected as a lower
  // floor, basement or stale collider.
  spawnGroundMaxStepDown: 2.25,
  blockedRecoverySeconds: 2.5,
  blockedRecoveryMinDistance: 3,
  // A low obstacle can be jumped, but only once per encounter and according
  // to these probabilities. Otherwise Chiri uses the side sensors to go around.
  obstacleJumpChance: 0.3,
  obstacleJumpWhenSidesBlockedChance: 0.65,
  obstacleJumpDurationSeconds: 0.72,
  obstacleJumpHeight: 0.5,
  obstacleJumpForwardSpeed: 2.2,
  obstacleJumpCooldownSeconds: 2.5,
  // Change this to true only after exporting a `fly` clip in Chiri's GLB.
  // The glider controller can then call setChiriGliderActive(true/false).
  flyAnimationAvailable: false,
  boredMinIdleSeconds: 6,
  boredMaxIdleSeconds: 13,
  boredStartDelaySeconds: 1,
  waveAnimationDurationSeconds: 2.5
} as const

// Keep these equal to the animation names exported from Blender.
export const CHIRI_ANIMATION_CLIPS = {
  idle: 'idle',
  walk: 'walk',
  run: 'run',
  jump: 'jump',
  fly: 'fly',
  wave: 'wave',
  bored: 'bored1'
} as const

// Global panel transform. These values move and scale the bubble PNG and every
// label inside it together. Mobile is anchored to the real bottom of the
// device canvas, so different phone aspect ratios keep the same 8 px margin.
export const CHIRI_DIALOGUE_PANEL_TRANSFORM = {
  desktop: {
    scale: 0.8,
    offsetX: 0,
    offsetY: 395,
    bottomMargin: 0
  },
  mobile: {
    scale: 0.8,
    offsetX: 0,
    offsetY: 0,
    bottomMargin: 8
  }
} as const

// Internal dialogue proportions and individual text sizes.
export const CHIRI_DIALOGUE_LAYOUT = {
  desktop: {
    width: 520,
    height: 176,
    bubbleScale: 1.3,
    bubbleOffsetX: 0,
    bubbleOffsetY: 0,
    titleFontSize: 32,
    titleTop: 12,
    bodyFontSize: 29,
    bodyTop: 49,
    bodyWidthPercent: 88,
    bodyLeftPercent: 6,
    hintFontSize: 22,
    hintTop: 125
  },
  mobile: {
    width: 520,
    height: 176,
    bubbleScale: 1.3,
    bubbleOffsetX: 0,
    bubbleOffsetY: 0,
    titleFontSize: 32,
    titleTop: 12,
    bodyFontSize: 29,
    bodyTop: 49,
    // A slightly wider mobile paragraph prevents a final word from creating
    // an unnecessary extra line on narrower phone layouts.
    bodyWidthPercent: 94,
    bodyLeftPercent: 3,
    hintFontSize: 22,
    hintTop: 125
  }
} as const

// Transparent PNG stretched behind the dialogue labels. Keeping this asset
// separate makes it easy to replace the comic-balloon style without changing UI.
export const CHIRI_DIALOGUE_BUBBLE =
  'assets/scene/ui/chiri/dialogue/chiri_dialogue_bubble.png'

const INTRO_DIALOGUE = [
  "Hello, I'm Chiri.",
  "I can't remember what happened.",
  "I saw a bright, colorful light—colors I'd never seen before.",
  'Then I saw you falling from the rift...',
  'I think that rift was left by the Portal Monster.',
  'Which dimension are you from? What are you doing here?',
  "Have you ever gone outside the house? I haven't.",
  "I'm hungry... what do you have there? What did you plant in the soil?",
  "I have one last piece of cheese in the fridge. Let's use it for an eggplant pizza!",
  'Take some pizza dough from the fridge and grab some yerba too.',
  "Then meet me at the oven and we'll make a pizza and a mate!"
]

let chiriEntity: Entity | undefined
const chiriAccessoryEntities = new Map<string, Entity>()
let chiriMode: ChiriMode = 'hidden'
let chiriLocomotion: ChiriLocomotion = 'idle'
let introductionPending = false
let introductionDelayPending = false
let followSpawnPending = false
let followSpawnMinWaitSeconds: number =
  CHIRI_COMPANION_CONFIG.spawnMinWaitSeconds
const followSpawnReadiness = new ChiriSpawnReadiness()
let introductionJumpElapsed = 0
let introductionGroundY = 0
let dialoguePage = 0
let dialogueVisible = false
let transientDialogue: string[] = []
let onTransientDialogueClosed: (() => void) | null = null
let playerProgress: PlayerProgress | undefined
let careDecayElapsed = 0
let persistPlayerProgress: () => Promise<void> | void = () => {}
let onChiriUiChanged: () => void = () => {}
let onChiriDialogueClosed: () => void = () => {}
let systemInitialized = false
let activeChiriVariantId: ChiriVariantId = 'classic'

type ObstacleSensorName =
  | 'frontLower'
  | 'frontUpper'
  | 'frontLeft'
  | 'frontRight'
  | 'left'
  | 'right'

const sensorEntities: Partial<Record<ObstacleSensorName, Entity>> = {}
const obstacleHits: Record<ObstacleSensorName, boolean> = {
  frontLower: false,
  frontUpper: false,
  frontLeft: false,
  frontRight: false,
  left: false,
  right: false
}
let obstacleSensorElapsed: number =
  CHIRI_COMPANION_CONFIG.obstacleSensorIntervalSeconds
let lastFacingDirection = Vector3.Forward()
let catchUpElapsed = 0
let lastPlayerPosition: Vector3 | undefined
let lastObservedPlayerPosition: Vector3 | undefined
let playerWasMoving = false
let playerStillElapsed = 0
let followDelayRemaining = 0
let idleElapsed = 0
let nextBoredIdleDelay = randomBoredIdleDelay()
let boredMomentQueued = false
let boredStartDelayRemaining = 0
let activeChiriAnimation: ChiriAnimation | undefined
let stationaryYawOffsetDegrees = 0
let animationBlend:
  | {
      from: ChiriAnimation
      to: ChiriAnimation
      elapsed: number
      duration: number
    }
  | undefined
let specialAnimationRemaining = 0
let introductionJumpClipPlaying = false
let introductionWaveElapsed = 0
let introductionWaveFinished = false
let introductionIdleElapsed = 0
let introductionBoredActive = false
let waitForPlayerMovementAfterDialogue = false
let stableFollowGroundY: number | undefined
let playerJumpGroundLockRemaining = 0
let obstacleJumpElapsed = -1
let obstacleJumpGroundY = 0
let obstacleJumpDirection = Vector3.Forward()
let obstacleJumpDecisionLocked = false
let obstacleJumpCooldownRemaining = 0
let obstacleJumpReturnLocomotion: Extract<ChiriLocomotion, 'walk' | 'run'> =
  'walk'
let gliderActive = false
let groundProbeEntity: Entity | undefined
let groundProbeAgeSeconds = Number.POSITIVE_INFINITY
let latestGroundProbe:
  | { x: number; y: number; z: number; normalY: number }
  | undefined
let blockedMovementElapsed = 0
let obstacleAvoidanceTurnSign: -1 | 1 = 1
let freeRoamTarget: Vector3 | undefined
let freeRoamPauseRemaining = 0
let freeRoamRunning = false

function notifyUi() {
  onChiriUiChanged()
}

function normalizeVariantId(value: string | undefined): ChiriVariantId {
  return value === 'mecha' ? 'mecha' : 'classic'
}

function getActiveVariant() {
  return CHIRI_VARIANTS[activeChiriVariantId]
}

function getActiveVariantScale() {
  const variant = getActiveVariant()
  return isMobile() ? variant.mobileScale : variant.desktopScale
}

function isProgressChiriUnlocked() {
  return Boolean(
    playerProgress?.story.completedMissionIds.includes(FIRST_SEEDS_QUEST_ID)
  )
}

function syncLocalChiriAccessories() {
  if (chiriEntity === undefined || !playerProgress) return

  const equippedIds = new Set(playerProgress.chiri.equippedItems)

  for (const [accessoryId, entity] of chiriAccessoryEntities) {
    if (equippedIds.has(accessoryId)) continue
    engine.removeEntity(entity)
    chiriAccessoryEntities.delete(accessoryId)
  }

  for (const accessoryId of equippedIds) {
    if (chiriAccessoryEntities.has(accessoryId)) continue
    const definition = getChiriAccessoryDefinition(accessoryId)
    if (!definition) continue

    const entity = engine.addEntity()
    Transform.create(entity, {
      parent: chiriEntity,
      position: definition.position,
      rotation: definition.rotation,
      scale: definition.scale
    })
    GltfContainer.create(entity, {
      src: definition.modelPath,
      visibleMeshesCollisionMask: ColliderLayer.CL_NONE,
      invisibleMeshesCollisionMask: ColliderLayer.CL_NONE
    })
    VisibilityComponent.create(entity, {
      visible: playerProgress.chiri.stored !== true
    })
    chiriAccessoryEntities.set(accessoryId, entity)
  }
}

function applyStoredVisibility() {
  // A landing wait is intentionally invisible locally and in the multiplayer
  // snapshot. Showing the old entity while the avatar falls was the remaining
  // source of floating Chiris after a runtime teleport.
  const visible =
    playerProgress?.chiri.stored !== true && !followSpawnPending
  if (chiriEntity !== undefined) {
    VisibilityComponent.createOrReplace(chiriEntity, { visible })
  }
  // VisibilityComponent is entity-local, so explicitly hide attachments too.
  for (const entity of chiriAccessoryEntities.values()) {
    VisibilityComponent.createOrReplace(entity, { visible })
  }
}

function getPlayerForward() {
  const playerTransform = Transform.getOrNull(engine.PlayerEntity)
  const rotation = playerTransform?.rotation ?? Quaternion.Identity()
  const forward = Vector3.rotate(Vector3.Forward(), rotation)
  forward.y = 0

  if (Vector3.lengthSquared(forward) < 0.001) {
    return Vector3.create(0, 0, 1)
  }

  return Vector3.normalize(forward)
}

function getPlayerRight(forward: Vector3) {
  return Vector3.create(forward.z, 0, -forward.x)
}

function getChiriGroundY(playerPosition: Vector3) {
  const playerGroundOffset = isMobile()
    ? CHIRI_COMPANION_CONFIG.mobilePlayerChestToGroundOffset
    : CHIRI_COMPANION_CONFIG.playerChestToGroundOffset

  return (
    playerPosition.y - playerGroundOffset +
    CHIRI_COMPANION_CONFIG.modelFootClearance
  )
}

function getFollowGroundCorrection() {
  return isMobile()
    ? CHIRI_COMPANION_CONFIG.mobileFollowGroundCorrection
    : CHIRI_COMPANION_CONFIG.desktopFollowGroundCorrection
}

function getStableFollowGroundY(dt: number, playerPosition: Vector3) {
  const liveGroundY =
    getChiriGroundY(playerPosition) + getFollowGroundCorrection()

  if (stableFollowGroundY === undefined) {
    stableFollowGroundY = liveGroundY
  }

  if (inputSystem.isPressed(InputAction.IA_JUMP)) {
    playerJumpGroundLockRemaining =
      CHIRI_COMPANION_CONFIG.playerJumpGroundLockSeconds
  }

  if (playerJumpGroundLockRemaining > 0) {
    playerJumpGroundLockRemaining = Math.max(
      0,
      playerJumpGroundLockRemaining - dt
    )
    return stableFollowGroundY
  }

  stableFollowGroundY = liveGroundY
  return stableFollowGroundY
}

function ensureGroundProbeEntity(origin: Vector3) {
  if (groundProbeEntity !== undefined) return groundProbeEntity

  groundProbeEntity = engine.addEntity()
  Transform.create(groundProbeEntity, {
    position: origin,
    rotation: Quaternion.Identity(),
    scale: Vector3.create(1, 1, 1)
  })

  raycastSystem.registerGlobalDirectionRaycast(
    {
      entity: groundProbeEntity,
      opts: {
        direction: Vector3.create(0, -1, 0),
        maxDistance: CHIRI_COMPANION_CONFIG.groundProbeDistance,
        queryType: RaycastQueryType.RQT_HIT_FIRST,
        collisionMask: ColliderLayer.CL_PHYSICS,
        continuous: true
      }
    },
    result => {
      const hit = result.hits[0]
      const position = hit?.position
      if (!position) return

      const normalY = hit.normalHit?.y ?? 1
      if (normalY < CHIRI_COMPANION_CONFIG.groundMinimumNormalY) return

      latestGroundProbe = {
        x: position.x,
        y: position.y + CHIRI_COMPANION_CONFIG.modelFootClearance,
        z: position.z,
        normalY
      }
      groundProbeAgeSeconds = 0
    }
  )

  return groundProbeEntity
}

function moveGroundProbe(position: Vector3, referenceGroundY: number, spawning = false) {
  const origin = Vector3.create(
    position.x,
    Math.max(position.y, referenceGroundY) +
      (spawning
        ? CHIRI_COMPANION_CONFIG.groundMaxStepUp
        : CHIRI_COMPANION_CONFIG.groundProbeStartHeight),
    position.z
  )
  const entity = ensureGroundProbeEntity(origin)
  Transform.createOrReplace(entity, {
    position: origin,
    rotation: Quaternion.Identity(),
    scale: Vector3.create(1, 1, 1)
  })
}

function resolveSpawnProbedGround(position: Vector3): number | undefined {
  return resolveChiriSpawnFloor(position, latestGroundProbe, groundProbeAgeSeconds, {
    maxAge: CHIRI_COMPANION_CONFIG.groundProbeMaxAgeSeconds,
    maxHorizontalError: CHIRI_COMPANION_CONFIG.groundProbeMaxHorizontalError,
    maxStepUp: CHIRI_COMPANION_CONFIG.groundMaxStepUp,
    maxStepDown: CHIRI_COMPANION_CONFIG.spawnGroundMaxStepDown
  })
}

function resolveProbedGround(
  position: Vector3,
  currentGroundY: number
): { y?: number; blocked: boolean } {
  const sample = latestGroundProbe
  if (
    !sample ||
    groundProbeAgeSeconds > CHIRI_COMPANION_CONFIG.groundProbeMaxAgeSeconds
  ) {
    return { blocked: false }
  }

  const dx = sample.x - position.x
  const dz = sample.z - position.z
  if (
    dx * dx + dz * dz >
    CHIRI_COMPANION_CONFIG.groundProbeMaxHorizontalError ** 2
  ) {
    return { blocked: false }
  }

  const step = sample.y - currentGroundY
  if (
    step > CHIRI_COMPANION_CONFIG.groundMaxStepUp ||
    step < -CHIRI_COMPANION_CONFIG.groundMaxStepDown
  ) {
    // An asynchronous sample may briefly belong to the previous ledge or to
    // the top of a nearby prop. Ignore it instead of freezing horizontal
    // follow movement; front sensors remain responsible for real walls.
    return { blocked: false }
  }

  return { y: sample.y, blocked: false }
}

function getHorizontalMovementDistance(from: Vector3, to: Vector3) {
  const dx = to.x - from.x
  const dz = to.z - from.z
  return Math.sqrt(dx * dx + dz * dz)
}

function rememberObservedPlayerPosition(position: Vector3) {
  lastObservedPlayerPosition = Vector3.create(
    position.x,
    position.y,
    position.z
  )
}

function playerRelocatedSinceLastFrame(position: Vector3) {
  const previous = lastObservedPlayerPosition
  rememberObservedPlayerPosition(position)
  if (!previous) return false

  return (
    getHorizontalMovementDistance(previous, position) >=
      CHIRI_COMPANION_CONFIG.playerTeleportHorizontalDistance ||
    Math.abs(position.y - previous.y) >=
      CHIRI_COMPANION_CONFIG.playerTeleportVerticalDistance
  )
}

function resetLandingGate(minWaitSeconds: number) {
  followSpawnMinWaitSeconds = minWaitSeconds
  followSpawnReadiness.reset()
  latestGroundProbe = undefined
  groundProbeAgeSeconds = Number.POSITIVE_INFINITY
  stableFollowGroundY = undefined
  playerJumpGroundLockRemaining = 0
  catchUpElapsed = 0
  blockedMovementElapsed = 0
  lastPlayerPosition = undefined
}

function beginFollowLandingWait(initialWorldSpawn = false) {
  followSpawnPending = true
  resetLandingGate(
    initialWorldSpawn
      ? CHIRI_COMPANION_CONFIG.spawnMinWaitSeconds
      : CHIRI_COMPANION_CONFIG.teleportLandingMinWaitSeconds
  )
  applyStoredVisibility()
}

function getLivePlayerPosition() {
  // PlayerEntity is updated every frame. getPlayer() may briefly keep the
  // entry/airborne position while Explorer finishes spawning the avatar;
  // using that cached value was why a returning Chiri could appear floating
  // until the later distance-recovery teleport recalculated its position.
  const playerTransform = Transform.getOrNull(engine.PlayerEntity)
  return playerTransform?.position ?? getPlayer()?.position
}

function playChiriAnimation(animation: ChiriAnimation, resetCursor = false) {
  if (chiriEntity === undefined) return
  if (!resetCursor && activeChiriAnimation === animation) return

  const previousAnimation = activeChiriAnimation
  const duration = CHIRI_COMPANION_CONFIG.animationBlendDurationSeconds
  const targetClipName = CHIRI_ANIMATION_CLIPS[animation]

  // Animator state weights are still experimental in SDK7. Some mobile
  // clients do not apply optional state defaults consistently. Make every
  // relevant field explicit on mobile; desktop keeps the smooth crossfade.
  if (isMobile()) {
    const mobileAnimator = Animator.getMutable(chiriEntity)
    for (const state of mobileAnimator.states) {
      const isTarget = state.clip === targetClipName
      state.playing = isTarget
      state.weight = 1
      state.speed = 1
      state.shouldReset = isTarget ? resetCursor : true
    }
    animationBlend = undefined
    activeChiriAnimation = animation
    return
  }

  const animator = Animator.getMutable(chiriEntity)

  if (!previousAnimation || previousAnimation === animation || duration <= 0) {
    Animator.playSingleAnimation(chiriEntity, targetClipName, resetCursor)
    for (const state of animator.states) {
      state.weight = state.clip === targetClipName ? 1 : 0
    }
    animationBlend = undefined
    activeChiriAnimation = animation
    return
  }

  const previousClipName = CHIRI_ANIMATION_CLIPS[previousAnimation]

  // Start from a normalized previous pose. Only the outgoing and incoming
  // clips remain active while their weights cross in opposite directions.
  for (const state of animator.states) {
    if (state.clip === previousClipName) {
      state.playing = true
      state.weight = 1
      state.shouldReset = false
    } else if (state.clip === targetClipName) {
      state.playing = true
      state.weight = 0
      state.shouldReset = resetCursor
    } else {
      state.playing = false
      state.weight = 0
      state.shouldReset = true
    }
  }

  animationBlend = {
    from: previousAnimation,
    to: animation,
    elapsed: 0,
    duration
  }
  activeChiriAnimation = animation
}

function updateAnimationBlend(dt: number) {
  if (!animationBlend || chiriEntity === undefined) return

  animationBlend.elapsed = Math.min(
    animationBlend.duration,
    animationBlend.elapsed + dt
  )
  const progress = animationBlend.elapsed / animationBlend.duration
  // Smoothstep avoids a visible speed change at the beginning and end.
  const smoothProgress = progress * progress * (3 - 2 * progress)
  const animator = Animator.getMutable(chiriEntity)
  const fromClipName = CHIRI_ANIMATION_CLIPS[animationBlend.from]
  const toClipName = CHIRI_ANIMATION_CLIPS[animationBlend.to]

  for (const state of animator.states) {
    if (state.clip === fromClipName) {
      state.weight = 1 - smoothProgress
    } else if (state.clip === toClipName) {
      state.weight = smoothProgress
    }
  }

  if (progress < 1) return

  for (const state of animator.states) {
    if (state.clip === fromClipName) {
      state.playing = false
      state.weight = 0
      state.shouldReset = true
    } else if (state.clip === toClipName) {
      state.playing = true
      state.weight = 1
    }
  }
  animationBlend = undefined
}

export function createChiriAnimationStates(activeAnimation: ChiriAnimation = 'idle') {
  const animationStates: Array<{
    clip: string
    playing: boolean
    loop: boolean
    weight: number
    speed: number
    shouldReset: boolean
  }> = [
    { clip: CHIRI_ANIMATION_CLIPS.idle, playing: activeAnimation === 'idle', loop: true, weight: activeAnimation === 'idle' ? 1 : 0, speed: 1, shouldReset: false },
    { clip: CHIRI_ANIMATION_CLIPS.walk, playing: activeAnimation === 'walk', loop: true, weight: activeAnimation === 'walk' ? 1 : 0, speed: 1, shouldReset: false },
    { clip: CHIRI_ANIMATION_CLIPS.run, playing: activeAnimation === 'run', loop: true, weight: activeAnimation === 'run' ? 1 : 0, speed: 1, shouldReset: false },
    { clip: CHIRI_ANIMATION_CLIPS.jump, playing: activeAnimation === 'jump', loop: false, weight: activeAnimation === 'jump' ? 1 : 0, speed: 1, shouldReset: false },
    { clip: CHIRI_ANIMATION_CLIPS.bored, playing: activeAnimation === 'bored', loop: true, weight: activeAnimation === 'bored' ? 1 : 0, speed: 1, shouldReset: false },
    { clip: CHIRI_ANIMATION_CLIPS.wave, playing: activeAnimation === 'wave', loop: true, weight: activeAnimation === 'wave' ? 1 : 0, speed: 1, shouldReset: false }
  ]

  if (CHIRI_COMPANION_CONFIG.flyAnimationAvailable) {
    animationStates.push({
      clip: CHIRI_ANIMATION_CLIPS.fly,
      playing: activeAnimation === 'fly',
      loop: true,
      weight: activeAnimation === 'fly' ? 1 : 0,
      speed: 1,
      shouldReset: false
    })
  }

  return animationStates
}

function applyActiveChiriVariant() {
  if (chiriEntity === undefined) return

  const transform = Transform.get(chiriEntity)
  const scale = getActiveVariantScale()
  Transform.createOrReplace(chiriEntity, {
    position: transform.position,
    rotation: transform.rotation,
    scale: Vector3.create(scale, scale, scale)
  })
  GltfContainer.createOrReplace(chiriEntity, {
    src: getActiveVariant().modelPath,
    visibleMeshesCollisionMask: ColliderLayer.CL_NONE,
    invisibleMeshesCollisionMask: ColliderLayer.CL_NONE
  })

  const animation = activeChiriAnimation ?? 'idle'
  Animator.createOrReplace(chiriEntity, {
    states: createChiriAnimationStates(animation)
  })
  syncLocalChiriAccessories()
  applyStoredVisibility()
  animationBlend = undefined
  activeChiriAnimation = animation
}

function ensureChiriEntity(position: Vector3) {
  if (chiriEntity !== undefined) {
    return chiriEntity
  }

  chiriEntity = engine.addEntity()
  const scale = getActiveVariantScale()
  Transform.create(chiriEntity, {
    position,
    rotation: Quaternion.Identity(),
    scale: Vector3.create(
      scale,
      scale,
      scale
    )
  })
  GltfContainer.create(chiriEntity, {
    src: getActiveVariant().modelPath,
    // Chiri is personal: it must never block the player or its own raycasts.
    // Variant selection will live in the future Chiri moods UI, not on-model.
    visibleMeshesCollisionMask: ColliderLayer.CL_NONE,
    invisibleMeshesCollisionMask: ColliderLayer.CL_NONE
  })
  Animator.create(chiriEntity, { states: createChiriAnimationStates('idle') })
  activeChiriAnimation = 'idle'
  syncLocalChiriAccessories()
  applyStoredVisibility()

  return chiriEntity
}

function setTransform(
  position: Vector3,
  forward?: Vector3,
  yawOffsetDegrees = 0,
  rollOffsetDegrees = 0
) {
  if (chiriEntity === undefined) return

  const previous = Transform.get(chiriEntity)

  if (forward) {
    const flattenedForward = Vector3.create(forward.x, 0, forward.z)
    if (Vector3.lengthSquared(flattenedForward) > 0.001) {
      lastFacingDirection = Vector3.normalize(flattenedForward)
    }
  }

  Transform.createOrReplace(chiriEntity, {
    position,
    // Always use world-up. The companion never inherits an inclined rotation
    // from a previous movement step or from a sloped collider.
    rotation: Quaternion.multiply(
      Quaternion.lookRotation(lastFacingDirection, Vector3.Up()),
      Quaternion.fromEulerDegrees(
        0,
        yawOffsetDegrees,
        rollOffsetDegrees
      )
    ),
    scale: previous.scale
  })
}

function placeChiriNearPlayer(forFollowMode = false, dt = 0) {
  const playerPosition = getLivePlayerPosition()
  if (!playerPosition) return false

  const forward = getPlayerForward()
  // Returning Chiri uses exactly the recovery-teleport target, not the
  // introduction's point 3.5m ahead (which can be inside/on a house prop).
  const position = forFollowMode
    ? getFollowTarget(playerPosition, forward)
    : Vector3.add(playerPosition, Vector3.scale(forward, CHIRI_COMPANION_CONFIG.spawnDistance))
  const estimatedGroundY =
    getChiriGroundY(playerPosition) +
    (forFollowMode ? getFollowGroundCorrection() : 0)
  position.y = estimatedGroundY

  if (forFollowMode || introductionPending) {
    const playerSettled = followSpawnReadiness.update(dt, estimatedGroundY,
      inputSystem.isPressed(InputAction.IA_JUMP), {
        minWaitSeconds: followSpawnMinWaitSeconds,
        stableSeconds: CHIRI_COMPANION_CONFIG.spawnStableSeconds,
        maxVerticalSpeed: CHIRI_COMPANION_CONFIG.spawnMaxVerticalSpeed
      })
    moveGroundProbe(position, estimatedGroundY, true)
    if (!playerSettled) return false
    const probedGroundY = resolveSpawnProbedGround(position)

    // Never reveal Chiri from an estimated airborne avatar transform. The
    // destination must provide a fresh, nearby physics floor first.
    if (probedGroundY === undefined) return false
    position.y = probedGroundY
  }

  stableFollowGroundY = position.y
  playerJumpGroundLockRemaining = 0
  ensureChiriEntity(position)
  setTransform(position, forFollowMode ? forward : Vector3.negate(forward),
    forFollowMode ? CHIRI_COMPANION_CONFIG.idleYawOffsetDegrees : 0,
    forFollowMode ? CHIRI_COMPANION_CONFIG.idleRollOffsetDegrees : 0)
  followSpawnReadiness.reset()
  return true
}

function saveIntroductionSeen() {
  if (!playerProgress || playerProgress.story.flags.chiriIntroductionSeen) {
    return
  }

  playerProgress.story.flags.chiriIntroductionSeen = true
  void persistPlayerProgress()
}

function beginIntroduction(dt: number) {
  if (!placeChiriNearPlayer(false, dt)) {
    introductionPending = true
    return
  }

  const transform = Transform.get(chiriEntity!)
  introductionPending = false
  introductionJumpElapsed = 0
  introductionGroundY = transform.position.y
  introductionJumpClipPlaying = true
  introductionWaveElapsed = 0
  introductionWaveFinished = false
  introductionIdleElapsed = 0
  introductionBoredActive = false
  playChiriAnimation('jump', true)
  dialoguePage = 0
  transientDialogue = []
  onTransientDialogueClosed = null
  dialogueVisible = true
  chiriMode = 'intro'
  saveIntroductionSeen()
  notifyUi()
}

function updateIntroduction(dt: number) {
  if (chiriEntity === undefined) return

  introductionJumpElapsed += dt
  const progress = Math.min(
    introductionJumpElapsed / CHIRI_COMPANION_CONFIG.jumpDurationSeconds,
    1
  )
  const transform = Transform.get(chiriEntity)
  const height = 4 * CHIRI_COMPANION_CONFIG.jumpHeight * progress * (1 - progress)

  setTransform(
    Vector3.create(transform.position.x, introductionGroundY + height, transform.position.z)
  )

  if (progress >= 1 && introductionJumpClipPlaying) {
    introductionJumpClipPlaying = false
    // The greeting belongs to Chiri's entrance, not to the dialogue lifetime.
    // Closing the text quickly must not skip the visible wave.
    playChiriAnimation('wave', true)
  }

  if (progress < 1) return

  if (!introductionWaveFinished) {
    introductionWaveElapsed += dt

    if (
      introductionWaveElapsed >=
      CHIRI_COMPANION_CONFIG.introductionWaveDurationSeconds
    ) {
      introductionWaveFinished = true
      introductionIdleElapsed = 0
      stationaryYawOffsetDegrees = 0
      playChiriAnimation('idle', true)
      setTransform(
        Transform.get(chiriEntity).position,
        undefined,
        0,
        CHIRI_COMPANION_CONFIG.idleRollOffsetDegrees
      )
      // The dialogue may still have several pages open. Once the greeting is
      // over, Chiri is free to accompany the player instead of being pinned
      // to the introduction spot until the whole conversation is dismissed.
      waitForPlayerMovementAfterDialogue = false
      chiriMode = 'follow'
    }
    return
  }
}

function getSensorEntity(name: ObstacleSensorName, origin: Vector3) {
  const existing = sensorEntities[name]

  if (existing !== undefined) {
    Transform.createOrReplace(existing, {
      position: origin,
      rotation: Quaternion.Identity(),
      scale: Vector3.create(1, 1, 1)
    })
    return existing
  }

  const entity = engine.addEntity()
  Transform.create(entity, {
    position: origin,
    rotation: Quaternion.Identity(),
    scale: Vector3.create(1, 1, 1)
  })
  sensorEntities[name] = entity
  return entity
}

function requestObstacleRaycast(
  name: ObstacleSensorName,
  origin: Vector3,
  direction: Vector3
) {
  const sensor = getSensorEntity(name, origin)

  raycastSystem.registerGlobalDirectionRaycast(
    {
      entity: sensor,
      opts: {
        direction,
        maxDistance: CHIRI_COMPANION_CONFIG.obstacleSensorDistance,
        queryType: RaycastQueryType.RQT_HIT_FIRST,
        collisionMask: ColliderLayer.CL_PHYSICS
      }
    },
    result => {
      obstacleHits[name] = result.hits.length > 0
    }
  )
}

function updateObstacleSensors(
  dt: number,
  origin: Vector3,
  direction: Vector3
) {
  obstacleSensorElapsed += dt

  if (obstacleSensorElapsed < CHIRI_COMPANION_CONFIG.obstacleSensorIntervalSeconds) {
    return
  }

  obstacleSensorElapsed = 0

  const lowerRayOrigin = Vector3.create(
    origin.x,
    origin.y + CHIRI_COMPANION_CONFIG.obstacleLowerSensorHeight,
    origin.z
  )
  const upperRayOrigin = Vector3.create(
    origin.x,
    origin.y + CHIRI_COMPANION_CONFIG.obstacleUpperSensorHeight,
    origin.z
  )
  const right = getPlayerRight(direction)
  const leftOrigin = Vector3.add(
    lowerRayOrigin,
    Vector3.scale(right, -CHIRI_COMPANION_CONFIG.obstacleBodyHalfWidth)
  )
  const rightOrigin = Vector3.add(
    lowerRayOrigin,
    Vector3.scale(right, CHIRI_COMPANION_CONFIG.obstacleBodyHalfWidth)
  )
  const leftDiagonal = Vector3.normalize(
    Vector3.add(direction, Vector3.scale(right, -0.75))
  )
  const rightDiagonal = Vector3.normalize(
    Vector3.add(direction, Vector3.scale(right, 0.75))
  )

  requestObstacleRaycast('frontLower', lowerRayOrigin, direction)
  requestObstacleRaycast('frontUpper', upperRayOrigin, direction)
  requestObstacleRaycast('frontLeft', leftOrigin, direction)
  requestObstacleRaycast('frontRight', rightOrigin, direction)
  requestObstacleRaycast('left', lowerRayOrigin, leftDiagonal)
  requestObstacleRaycast('right', lowerRayOrigin, rightDiagonal)
}

function getSafeMovementDirection(direction: Vector3) {
  const frontBlocked =
    obstacleHits.frontLower ||
    obstacleHits.frontUpper ||
    obstacleHits.frontLeft ||
    obstacleHits.frontRight

  if (!frontBlocked) return direction

  const right = getPlayerRight(direction)
  const leftBlocked = obstacleHits.left
  const rightBlocked = obstacleHits.right

  if (!leftBlocked) {
    obstacleAvoidanceTurnSign = -1
    return Vector3.normalize(
      Vector3.add(
        direction,
        Vector3.scale(right, -CHIRI_COMPANION_CONFIG.obstacleAvoidanceStrength)
      )
    )
  }

  if (!rightBlocked) {
    obstacleAvoidanceTurnSign = 1
    return Vector3.normalize(
      Vector3.add(
        direction,
        Vector3.scale(right, CHIRI_COMPANION_CONFIG.obstacleAvoidanceStrength)
      )
    )
  }

  // When a broad/concave collider reports both diagonal probes as blocked,
  // continue tangentially along the last chosen side. Returning undefined here
  // used to force idle every frame and Chiri only recovered by teleporting.
  return Vector3.normalize(
    Vector3.add(
      direction,
      Vector3.scale(
        right,
        obstacleAvoidanceTurnSign *
          CHIRI_COMPANION_CONFIG.obstacleAvoidanceStrength * 1.35
      )
    )
  )
}

function tryStartObstacleJump(
  direction: Vector3,
  groundY: number,
  returnLocomotion: Extract<ChiriLocomotion, 'walk' | 'run'>
) {
  const isLowObstacle =
    (obstacleHits.frontLower ||
      obstacleHits.frontLeft ||
      obstacleHits.frontRight) &&
    !obstacleHits.frontUpper

  if (!isLowObstacle) {
    obstacleJumpDecisionLocked = false
    return false
  }

  if (
    obstacleJumpDecisionLocked ||
    obstacleJumpCooldownRemaining > 0 ||
    obstacleJumpElapsed >= 0
  ) {
    return false
  }

  // Make only one random choice while facing this obstacle. Without this
  // latch, a 30% chance evaluated every frame would become an almost certain
  // jump and Chiri would look as if it were hopping constantly.
  obstacleJumpDecisionLocked = true
  const sidesBlocked = obstacleHits.left && obstacleHits.right
  const jumpChance = sidesBlocked
    ? CHIRI_COMPANION_CONFIG.obstacleJumpWhenSidesBlockedChance
    : CHIRI_COMPANION_CONFIG.obstacleJumpChance

  if (Math.random() >= jumpChance) {
    obstacleJumpCooldownRemaining =
      CHIRI_COMPANION_CONFIG.obstacleJumpCooldownSeconds
    return false
  }

  obstacleJumpElapsed = 0
  obstacleJumpGroundY = groundY
  obstacleJumpDirection = Vector3.create(direction.x, 0, direction.z)
  obstacleJumpReturnLocomotion = returnLocomotion
  setChiriLocomotion('jump')
  playChiriAnimation('jump', true)
  return true
}

function updateObstacleJump(dt: number, landingGroundY: number) {
  if (obstacleJumpElapsed < 0 || chiriEntity === undefined) return false

  obstacleJumpElapsed += dt
  const progress = Math.min(
    obstacleJumpElapsed / CHIRI_COMPANION_CONFIG.obstacleJumpDurationSeconds,
    1
  )
  const transform = Transform.get(chiriEntity)
  const horizontalStep =
    CHIRI_COMPANION_CONFIG.obstacleJumpForwardSpeed * dt
  const next = Vector3.add(
    transform.position,
    Vector3.scale(obstacleJumpDirection, horizontalStep)
  )
  const baseY =
    obstacleJumpGroundY + (landingGroundY - obstacleJumpGroundY) * progress
  next.y =
    baseY +
    4 * CHIRI_COMPANION_CONFIG.obstacleJumpHeight * progress * (1 - progress)
  setTransform(next, obstacleJumpDirection)

  if (progress < 1) return true

  next.y = landingGroundY
  setTransform(next, obstacleJumpDirection)
  obstacleJumpElapsed = -1
  obstacleJumpCooldownRemaining =
    CHIRI_COMPANION_CONFIG.obstacleJumpCooldownSeconds
  setChiriLocomotion(obstacleJumpReturnLocomotion)
  return true
}

function randomBoredIdleDelay() {
  const { boredMinIdleSeconds, boredMaxIdleSeconds } = CHIRI_COMPANION_CONFIG
  return (
    boredMinIdleSeconds +
    Math.random() * (boredMaxIdleSeconds - boredMinIdleSeconds)
  )
}

function setChiriLocomotion(next: ChiriLocomotion) {
  if (chiriLocomotion === next && activeChiriAnimation === next) return

  chiriLocomotion = next
  idleElapsed = 0
  boredMomentQueued = false
  boredStartDelayRemaining = 0
  specialAnimationRemaining = 0

  if (next === 'idle') {
    nextBoredIdleDelay = randomBoredIdleDelay()
  }

  playChiriAnimation(next)
}

function updateIdleBehavior(dt: number) {
  if (chiriLocomotion !== 'idle' || activeChiriAnimation === 'bored') return

  idleElapsed += dt

  if (idleElapsed >= nextBoredIdleDelay) {
    boredMomentQueued = true
    boredStartDelayRemaining = CHIRI_COMPANION_CONFIG.boredStartDelaySeconds
    idleElapsed = 0
    nextBoredIdleDelay = randomBoredIdleDelay()
  }
}

function chooseFreeRoamTarget(origin: Vector3): Vector3 {
  const sharedObjects = getSharedZoneState().objects
  if (sharedObjects.length > 0 && Math.random() < 0.45) {
    const object = sharedObjects[Math.floor(Math.random() * sharedObjects.length)]
    return Vector3.create(object.position.x, origin.y, object.position.z)
  }
  const bounds = SHARED_ZONE_CONFIG.bounds
  const range = 5 + Math.random() * 8
  const angle = Math.random() * Math.PI * 2
  return Vector3.create(
    Math.max(bounds.minX + 1, Math.min(bounds.maxX - 1, origin.x + Math.cos(angle) * range)),
    origin.y,
    Math.max(bounds.minZ + 1, Math.min(bounds.maxZ - 1, origin.z + Math.sin(angle) * range))
  )
}

function updateFreeRoam(dt: number): void {
  if (chiriEntity === undefined) return
  const transform = Transform.get(chiriEntity)
  if (!isInsideSharedZone(transform.position)) {
    freeRoamTarget = undefined
    setChiriLocomotion('idle')
    return
  }
  if (freeRoamPauseRemaining > 0) {
    freeRoamPauseRemaining = Math.max(0, freeRoamPauseRemaining - dt)
    setChiriLocomotion('idle')
    return
  }
  if (!freeRoamTarget) {
    freeRoamTarget = chooseFreeRoamTarget(transform.position)
    freeRoamRunning = Math.random() < 0.35
  }
  const delta = Vector3.subtract(freeRoamTarget, transform.position)
  delta.y = 0
  const distance = Vector3.length(delta)
  if (distance < 1.1) {
    freeRoamTarget = undefined
    freeRoamPauseRemaining = 1.5 + Math.random() * 4
    setChiriLocomotion('idle')
    if (Math.random() < 0.35) playChiriWave()
    return
  }
  const direction = Vector3.normalize(delta)
  const safeDirection = getSafeMovementDirection(direction)
  if (!safeDirection) {
    freeRoamTarget = undefined
    freeRoamPauseRemaining = .5
    setChiriLocomotion('idle')
    return
  }
  const locomotion = freeRoamRunning ? 'run' : 'walk'
  const speed = freeRoamRunning ? CHIRI_COMPANION_CONFIG.runSpeed : CHIRI_COMPANION_CONFIG.walkSpeed
  const next = Vector3.add(transform.position, Vector3.scale(safeDirection, Math.min(distance, speed * dt)))
  next.y = transform.position.y
  setChiriLocomotion(locomotion)
  setTransform(next, safeDirection)
}

function updateSpecialAnimation(dt: number) {
  if (specialAnimationRemaining <= 0) return

  specialAnimationRemaining = Math.max(0, specialAnimationRemaining - dt)

  if (specialAnimationRemaining === 0 && chiriLocomotion === 'idle') {
    playChiriAnimation('idle', true)
  }
}

function playQueuedBoredAnimation(dt: number) {
  if (
    !boredMomentQueued ||
    chiriLocomotion !== 'idle' ||
    specialAnimationRemaining > 0
  ) {
    return
  }

  boredStartDelayRemaining = Math.max(0, boredStartDelayRemaining - dt)
  if (boredStartDelayRemaining > 0) return

  boredMomentQueued = false
  if (chiriEntity !== undefined) {
    setTransform(
      Transform.get(chiriEntity).position,
      undefined,
      stationaryYawOffsetDegrees,
      0
    )
  }
  playChiriAnimation('bored', true)
}

function shouldWaitBeforeFollowing(dt: number, playerPosition: Vector3) {
  if (!lastPlayerPosition) {
    lastPlayerPosition = Vector3.create(
      playerPosition.x,
      playerPosition.y,
      playerPosition.z
    )
    return false
  }

  const movement = getHorizontalMovementDistance(
    lastPlayerPosition,
    playerPosition
  )
  const hasMoved = movement >= CHIRI_COMPANION_CONFIG.playerMovementThreshold

  if (hasMoved) {
    if (!playerWasMoving) {
      followDelayRemaining = CHIRI_COMPANION_CONFIG.followStartDelaySeconds
    }
    playerWasMoving = true
    playerStillElapsed = 0
  } else {
    playerStillElapsed += dt
    if (
      playerStillElapsed >=
      CHIRI_COMPANION_CONFIG.playerMovementStopThresholdSeconds
    ) {
      playerWasMoving = false
    }
  }

  lastPlayerPosition = Vector3.create(
    playerPosition.x,
    playerPosition.y,
    playerPosition.z
  )

  if (followDelayRemaining <= 0) return false

  followDelayRemaining = Math.max(0, followDelayRemaining - dt)
  setChiriLocomotion('idle')
  return followDelayRemaining > 0
}

function shouldWaitForFirstPlayerMove(playerPosition: Vector3) {
  if (!waitForPlayerMovementAfterDialogue) return false

  if (!lastPlayerPosition) {
    lastPlayerPosition = Vector3.create(
      playerPosition.x,
      playerPosition.y,
      playerPosition.z
    )
    return true
  }

  const movement = getHorizontalMovementDistance(
    lastPlayerPosition,
    playerPosition
  )
  lastPlayerPosition = Vector3.create(
    playerPosition.x,
    playerPosition.y,
    playerPosition.z
  )

  if (movement < CHIRI_COMPANION_CONFIG.playerMovementThreshold) {
    return true
  }

  waitForPlayerMovementAfterDialogue = false
  followDelayRemaining = CHIRI_COMPANION_CONFIG.followStartDelaySeconds
  return false
}

function getFollowTarget(playerPosition: Vector3, forward: Vector3) {
  return Vector3.add(
    Vector3.add(playerPosition, Vector3.scale(forward, CHIRI_COMPANION_CONFIG.followDistance)),
    Vector3.scale(getPlayerRight(forward), CHIRI_COMPANION_CONFIG.followSideOffset)
  )
}

function updateFollow(dt: number) {
  if (chiriEntity === undefined) return

  const playerPosition = getLivePlayerPosition()
  if (!playerPosition) return

  if (playerRelocatedSinceLastFrame(playerPosition)) {
    beginFollowLandingWait()
    return
  }

  // Capture jump input before any follow-delay early return. Otherwise a
  // running jump could release its button during the delay and Chiri would
  // still copy the avatar's airborne height afterward.
  const followGroundY = getStableFollowGroundY(dt, playerPosition)

  if (shouldWaitForFirstPlayerMove(playerPosition)) {
    return
  }

  if (shouldWaitBeforeFollowing(dt, playerPosition)) {
    return
  }

  const forward = getPlayerForward()
  const flightActive =
    gliderActive && CHIRI_COMPANION_CONFIG.flyAnimationAvailable
  const target = getFollowTarget(playerPosition, forward)
  target.y = flightActive
    ? getChiriGroundY(playerPosition)
    : followGroundY
  const transform = Transform.get(chiriEntity)
  const toTarget = Vector3.subtract(target, transform.position)
  const verticalDistance = Math.abs(toTarget.y)
  toTarget.y = 0
  const horizontalDistance = Vector3.length(toTarget)
  const distance = flightActive
    ? Math.sqrt(
        horizontalDistance * horizontalDistance +
        verticalDistance * verticalDistance
      )
    : horizontalDistance

  obstacleJumpCooldownRemaining = Math.max(
    0,
    obstacleJumpCooldownRemaining - dt
  )
  if (
    obstacleJumpCooldownRemaining === 0 &&
    obstacleJumpElapsed < 0
  ) {
    obstacleJumpDecisionLocked = false
  }

  moveGroundProbe(transform.position, followGroundY)
  const currentProbedGround = resolveProbedGround(
    transform.position,
    transform.position.y
  )
  const currentMovementGroundY =
    currentProbedGround.y ?? followGroundY

  if (!flightActive && updateObstacleJump(dt, currentMovementGroundY)) {
    return
  }

  if (distance < 0.2) {
    // Keep the companion's feet on exactly the same floor as the avatar even
    // while it is idle, instead of retaining a height from a previous step.
    const idlePosition = Vector3.create(
      transform.position.x,
      target.y,
      transform.position.z
    )
    moveGroundProbe(idlePosition, target.y)
    const idleGround = resolveProbedGround(idlePosition, transform.position.y)
    if (idleGround.y !== undefined) {
      idlePosition.y = idleGround.y
      stableFollowGroundY = idleGround.y
    }
    if (flightActive) {
      setChiriLocomotion('fly')
    } else if (
      activeChiriAnimation !== 'bored' &&
      specialAnimationRemaining <= 0
    ) {
      // Do not request idle every frame. That used to cancel bored1 (and a
      // manual wave) immediately after its first visible pose.
      setChiriLocomotion('idle')
    }
    stationaryYawOffsetDegrees = CHIRI_COMPANION_CONFIG.idleYawOffsetDegrees
    setTransform(
      idlePosition,
      forward,
      stationaryYawOffsetDegrees,
      activeChiriAnimation === 'idle'
        ? CHIRI_COMPANION_CONFIG.idleRollOffsetDegrees
        : 0
    )
    catchUpElapsed = 0
    blockedMovementElapsed = 0
    return
  }

  // Pathfinding is intentionally lightweight for now. If Chiri is caught
  // behind a mesh or the player gets far away, recover close to the player
  // instead of leaving the companion stranded.
  if (distance >= CHIRI_COMPANION_CONFIG.recoverAtDistance) {
    setChiriLocomotion('idle')
    stationaryYawOffsetDegrees = CHIRI_COMPANION_CONFIG.idleYawOffsetDegrees
    setTransform(
      target,
      forward,
      stationaryYawOffsetDegrees,
      CHIRI_COMPANION_CONFIG.idleRollOffsetDegrees
    )
    catchUpElapsed = 0
    blockedMovementElapsed = 0
    return
  }

  const direction = horizontalDistance > 0.001
    ? Vector3.normalize(toTarget)
    : lastFacingDirection
  const speed =
    flightActive || distance >= CHIRI_COMPANION_CONFIG.runAtDistance
      ? CHIRI_COMPANION_CONFIG.runSpeed
      : CHIRI_COMPANION_CONFIG.walkSpeed
  const step = Math.min(horizontalDistance, speed * dt)
  if (!flightActive) {
    updateObstacleSensors(dt, transform.position, direction)
  }
  const routedDirection = flightActive
    ? direction
    : getSafeMovementDirection(direction)
  const safeDirection = routedDirection

  catchUpElapsed += dt
  const shouldRun =
    distance >= CHIRI_COMPANION_CONFIG.runAtDistance &&
    catchUpElapsed >= CHIRI_COMPANION_CONFIG.runStartDelaySeconds

  if (
    !flightActive &&
    tryStartObstacleJump(
      direction,
      currentMovementGroundY,
      shouldRun ? 'run' : 'walk'
    )
  ) {
    return
  }

  if (!safeDirection) {
    setChiriLocomotion('idle')
    catchUpElapsed = 0
    blockedMovementElapsed += dt

    if (
      blockedMovementElapsed >=
        CHIRI_COMPANION_CONFIG.blockedRecoverySeconds &&
      distance >= CHIRI_COMPANION_CONFIG.blockedRecoveryMinDistance
    ) {
      stationaryYawOffsetDegrees = CHIRI_COMPANION_CONFIG.idleYawOffsetDegrees
      setTransform(
        target,
        forward,
        stationaryYawOffsetDegrees,
        CHIRI_COMPANION_CONFIG.idleRollOffsetDegrees
      )
      blockedMovementElapsed = 0
    }
    return
  }

  const next = Vector3.add(transform.position, Vector3.scale(safeDirection, step))
  if (flightActive) {
    const verticalStep = Math.min(verticalDistance, speed * dt)
    next.y = transform.position.y + Math.sign(target.y - transform.position.y) * verticalStep
  } else {
    moveGroundProbe(next, followGroundY)
    const probedGround = resolveProbedGround(next, transform.position.y)

    // Prefer the collider directly below Chiri. While the async raycast is
    // warming up, retain Chiri's current floor; only use the avatar floor when
    // already close enough that both characters are on the same surface.
    next.y = probedGround.y ?? (
      distance < 2.25 ? followGroundY : transform.position.y
    )
    if (probedGround.y !== undefined) {
      stableFollowGroundY = probedGround.y
    }
  }
  blockedMovementElapsed = 0
  stationaryYawOffsetDegrees = 0
  setChiriLocomotion(
    flightActive ? 'fly' : shouldRun ? 'run' : 'walk'
  )
  setTransform(next, safeDirection)
}

function updateChiri(dt: number) {
  groundProbeAgeSeconds += dt
  updateAnimationBlend(dt)

  careDecayElapsed += dt
  if (careDecayElapsed >= 60) {
    careDecayElapsed = 0
    if (playerProgress && applyChiriCareDecay(playerProgress.chiri.care)) {
      void persistPlayerProgress()
      notifyUi()
    }
  }

  if (playerProgress?.chiri.stored) return

  if (introductionPending) {
    beginIntroduction(dt)
    return
  }

  if (followSpawnPending) {
    const playerPosition = getLivePlayerPosition()
    if (playerPosition) rememberObservedPlayerPosition(playerPosition)
    if (placeChiriNearPlayer(true, dt)) {
      followSpawnPending = false
      chiriMode = 'follow'
      applyStoredVisibility()
    }
    return
  }

  if (chiriMode === 'intro') {
    updateIntroduction(dt)
    return
  }

  if (chiriMode === 'follow') {
    updateFollow(dt)
  } else if (chiriMode === 'free-roam') {
    updateFreeRoam(dt)
  }

  updateIdleBehavior(dt)
  playQueuedBoredAnimation(dt)
  updateSpecialAnimation(dt)
}

export function initializeChiriCompanion(
  progress: PlayerProgress,
  persist: () => Promise<void> | void
) {
  playerProgress = progress
  persistPlayerProgress = persist
  if (applyChiriCareDecay(progress.chiri.care)) {
    void persistPlayerProgress()
  }
  const requestedVariant = normalizeVariantId(progress.chiri.activeVariant)
  activeChiriVariantId = progress.chiri.unlockedVariants.includes(requestedVariant)
    ? requestedVariant
    : 'classic'

  if (progress.chiri.activeVariant !== activeChiriVariantId) {
    progress.chiri.activeVariant = activeChiriVariantId
    void persistPlayerProgress()
  }

  const firstMissionCompleted = progress.story.completedMissionIds.includes(
    FIRST_SEEDS_QUEST_ID
  )

  if (firstMissionCompleted) {
    if (progress.story.flags.chiriIntroductionSeen) {
      chiriMode = 'follow'
      beginFollowLandingWait(true)
    } else {
      startChiriIntroduction()
    }
  }

  if (!systemInitialized) {
    engine.addSystem(updateChiri)
    systemInitialized = true
  }
}

export function startChiriIntroduction() {
  if (chiriMode !== 'hidden' || introductionPending) return

  resetLandingGate(CHIRI_COMPANION_CONFIG.teleportLandingMinWaitSeconds)
  introductionPending = true
}

// The mission-completed card stays in focus first. Chiri enters only after it
// closes, whether it was dismissed by the player or by its automatic timeout.
export function startChiriIntroductionAfterMissionCard() {
  if (chiriMode !== 'hidden' || introductionPending || introductionDelayPending) {
    return
  }

  introductionDelayPending = true

  setTimeout(() => {
    introductionDelayPending = false
    startChiriIntroduction()
  }, CHIRI_COMPANION_CONFIG.introductionDelayAfterMissionCardMs)
}

export function setChiriUiListener(listener: () => void) {
  onChiriUiChanged = listener
}

export function setChiriDialogueClosedListener(listener: () => void) {
  onChiriDialogueClosed = listener
}

export function getUnlockedChiriVariants(): ChiriVariantDefinition[] {
  const unlocked = playerProgress?.chiri.unlockedVariants ?? ['classic']
  return (Object.keys(CHIRI_VARIANTS) as ChiriVariantId[])
    .filter(variantId => unlocked.includes(variantId))
    .map(variantId => CHIRI_VARIANTS[variantId])
}

export function getActiveChiriVariantId() {
  return activeChiriVariantId
}

export function selectChiriVariant(variantId: ChiriVariantId) {
  if (!playerProgress?.chiri.unlockedVariants.includes(variantId)) return false

  activeChiriVariantId = variantId
  playerProgress.chiri.activeVariant = variantId
  applyActiveChiriVariant()
  void persistPlayerProgress()
  notifyUi()
  return true
}

export function isChiriUnlocked() {
  return isProgressChiriUnlocked()
}

export function isChiriStored() {
  return playerProgress?.chiri.stored === true
}

export function getChiriCareSnapshot() {
  return playerProgress?.chiri.care ?? createDefaultChiriCareState()
}

// Integration point for the future Chiri moods UI.
export function setChiriStored(stored: boolean) {
  if (!playerProgress || !isProgressChiriUnlocked()) return false
  if (playerProgress.chiri.stored === stored) return true

  playerProgress.chiri.stored = stored
  if (stored) {
    dialogueVisible = false
    transientDialogue = []
    onTransientDialogueClosed = null
  }
  applyStoredVisibility()
  void persistPlayerProgress()
  notifyUi()
  return true
}

// Accessories are saved once and are automatically mirrored by the live
// presence system. Unknown ids remain saved but render only after their model
// definition is added to chiriAppearance.ts.
export function setChiriEquippedItems(accessoryIds: string[]) {
  if (!playerProgress || !isProgressChiriUnlocked()) return false

  playerProgress.chiri.equippedItems = [...new Set(accessoryIds)]
  syncLocalChiriAccessories()
  void persistPlayerProgress()
  notifyUi()
  return true
}

export function getChiriPresenceSnapshot(): ChiriPresenceSnapshot {
  const transform = chiriEntity === undefined
    ? undefined
    : Transform.getOrNull(chiriEntity)
  const visible =
    isProgressChiriUnlocked() &&
    playerProgress?.chiri.stored !== true &&
    !followSpawnPending &&
    chiriMode !== 'hidden' &&
    transform !== undefined

  return {
    visible,
    variantId: activeChiriVariantId,
    equippedItems: [...(playerProgress?.chiri.equippedItems ?? [])],
    equippedMateId: playerProgress?.collection.equippedMateId ?? null,
    position: transform?.position,
    rotation: transform?.rotation,
    animation: activeChiriAnimation ?? 'idle'
  }
}

export function isChiriDialogueVisible() {
  return dialogueVisible
}

export function getChiriDialogueText() {
  const pages = transientDialogue.length > 0 ? transientDialogue : INTRO_DIALOGUE
  return pages[dialoguePage] ?? ''
}

export function getChiriDialoguePageLabel() {
  const pages = transientDialogue.length > 0 ? transientDialogue : INTRO_DIALOGUE
  return `${dialoguePage + 1}/${pages.length}`
}

// Reuses the established Chiri bubble for gameplay reactions without mutating
// the first-introduction sequence or firing its mission listener.
export function showChiriDialogue(lines: string | string[], onClosed?: () => void) {
  const pages = (Array.isArray(lines) ? lines : [lines]).map(line => line.trim()).filter(Boolean)
  if (pages.length === 0 || dialogueVisible || !isProgressChiriUnlocked() || playerProgress?.chiri.stored) return false
  transientDialogue = pages
  onTransientDialogueClosed = onClosed ?? null
  dialoguePage = 0
  dialogueVisible = true
  notifyUi()
  return true
}

export function advanceChiriDialogue() {
  if (!dialogueVisible) return

  if (transientDialogue.length > 0) {
    if (dialoguePage < transientDialogue.length - 1) {
      dialoguePage += 1
    } else {
      dialogueVisible = false
      transientDialogue = []
      const callback = onTransientDialogueClosed
      onTransientDialogueClosed = null
      callback?.()
    }
    notifyUi()
    return
  }

  if (dialoguePage < INTRO_DIALOGUE.length - 1) {
    dialoguePage += 1
  } else {
    dialogueVisible = false
    // updateIntroduction owns the entrance state. It lets the wave finish and
    // then starts following, even when this dialogue closes sooner.
    onChiriDialogueClosed()
  }

  notifyUi()
}

export function getChiriMode() {
  return chiriMode
}

// Used by the Chiri UI's Free Chiri / Follow Me toggle. Free-roam leaves
// Chiri at the current safe position while keeping idle/bored behavior alive;
// following resumes from that same position without respawning the companion.
export function setChiriFollowingPlayer(following: boolean) {
  if (!playerProgress || !isProgressChiriUnlocked() || chiriMode === 'intro') {
    return false
  }

  chiriMode = following ? 'follow' : 'free-roam'
  followDelayRemaining = following
    ? CHIRI_COMPANION_CONFIG.followStartDelaySeconds
    : 0
  if (!following) setChiriLocomotion('idle')
  if (!following) {
    freeRoamTarget = undefined
    freeRoamPauseRemaining = .4
  }
  notifyUi()
  return true
}

export function getChiriLocomotion() {
  return chiriLocomotion
}

// Integration point for the future glider controller. The SDK does not expose
// a generic "glider active" player flag, so the feature that owns the glider
// must report its real state here instead of inferring it from vertical motion.
export function setChiriGliderActive(active: boolean) {
  gliderActive = active && CHIRI_COMPANION_CONFIG.flyAnimationAvailable

  if (!gliderActive && chiriLocomotion === 'fly') {
    setChiriLocomotion('idle')
  }
}

// Ready for future interactions, for example a greeting button in Chiri's UI.
export function playChiriWave() {
  if (chiriEntity === undefined) return

  specialAnimationRemaining = CHIRI_COMPANION_CONFIG.waveAnimationDurationSeconds
  playChiriAnimation('wave', true)
}

// Kept available for any future UI or quest logic that needs to observe an
// idle moment. The companion itself now consumes it to play `bored1`.
export function consumeChiriBoredMoment() {
  if (!boredMomentQueued) return false

  boredMomentQueued = false
  return true
}
