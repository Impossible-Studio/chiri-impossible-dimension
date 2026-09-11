import {
  ColliderLayer,
  engine,
  Font,
  GltfContainer,
  Material,
  MeshCollider,
  MeshRenderer,
  InputAction,
  pointerEventsSystem,
  TextAlignMode,
  TextShape,
  Transform,
  type Entity
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import type { PointActivity } from '../gameplay/pointsConfig'
import { LEADERBOARD_CONFIG } from './leaderboardConfig'
import { leaderboardRoom } from './leaderboardProtocol'
import type { LeaderboardSnapshot } from './leaderboardTypes'
import { visitPlayerDimension } from '../house/houseSystem'
import { showNotification } from '../farming/notifications'

type PendingEvent = {
  activity: PointActivity
  eventId: string
  eventReference: string
}

const rowLabels: Entity[] = []
const scoreLabels: Entity[] = []
const visitButtons: Entity[] = []
const visitButtonLabels: Entity[] = []
const pendingEvents: PendingEvent[] = []

let initialized = false
let roomReady = false
let requestElapsed = 0
let eventCounter = 0
let titleLabel: Entity | undefined
let periodLabel: Entity | undefined
let latestSnapshot: LeaderboardSnapshot | undefined

function localPlayerName(): string {
  return getPlayer()?.name?.trim() ?? ''
}

function eventId(): string {
  eventCounter++
  return `lb_${Date.now().toString(36)}_${eventCounter.toString(36)}_${Math.floor(Math.random() * 0xfffffff).toString(36)}`
}

function requestSnapshot(): void {
  if (!roomReady) return
  void leaderboardRoom.send('leaderboardSnapshotRequest', {
    playerName: localPlayerName()
  })
}

function flushPendingEvents(): void {
  if (!roomReady) return
  const queued = pendingEvents.splice(0, pendingEvents.length)
  for (const event of queued) {
    void leaderboardRoom.send('leaderboardEvent', {
      ...event,
      playerName: localPlayerName()
    })
  }
}

function formatPeriodDate(timestamp: number): string {
  const date = new Date(timestamp)
  const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][date.getUTCMonth()]
  return `${month} ${date.getUTCDate()}`
}

function compactName(value: string): string {
  return value.length <= 21 ? value : `${value.slice(0, 19)}..`
}

function updateBoard(snapshot: LeaderboardSnapshot): void {
  latestSnapshot = snapshot
  if (titleLabel !== undefined) {
    TextShape.getMutable(titleLabel).text = 'TOP 20  ·  IMPOSSIBLE STARS'
  }
  if (periodLabel !== undefined) {
    TextShape.getMutable(periodLabel).text =
      `${formatPeriodDate(snapshot.startsAt)} - ${formatPeriodDate(snapshot.endsAt)}  ·  14 DAYS`
  }

  for (let index = 0; index < LEADERBOARD_CONFIG.topSize; index++) {
    const entry = snapshot.entries[index]
    if (entry) {
      const canVisit = entry.wallet.trim().toLowerCase() !== getPlayer()?.userId.trim().toLowerCase()
      TextShape.getMutable(rowLabels[index]).text = `${index + 1}.  ${compactName(entry.name)}`
      TextShape.getMutable(scoreLabels[index]).text = entry.periodPoints.toString()
      TextShape.getMutable(visitButtonLabels[index]).text = canVisit ? 'VISIT DIMENSION' : 'MY DIMENSION'
    } else {
      TextShape.getMutable(rowLabels[index]).text = `${index + 1}.  ---`
      TextShape.getMutable(scoreLabels[index]).text = '0'
      TextShape.getMutable(visitButtonLabels[index]).text = ''
    }
  }
}

function createLabel(
  parent: Entity,
  position: Vector3,
  text: string,
  fontSize: number,
  align: TextAlignMode,
  width: number,
  height: number
): Entity {
  const entity = engine.addEntity()
  Transform.create(entity, { parent, position })
  TextShape.create(entity, {
    text,
    font: Font.F_SANS_SERIF,
    fontSize,
    textAlign: align,
    width,
    height,
    textWrapping: false,
    textColor: Color4.create(
      LEADERBOARD_CONFIG.panel.textColor.r,
      LEADERBOARD_CONFIG.panel.textColor.g,
      LEADERBOARD_CONFIG.panel.textColor.b,
      LEADERBOARD_CONFIG.panel.textColor.a
    ),
    outlineWidth: 0.08,
    outlineColor: Color3.create(1, 0.84, 0.94)
  })
  return entity
}

function createBoardGeometry(frame: Entity): void {
  // The placed frame is viewed from its negative-Z side. Rotating one shared
  // surface fixes the formerly mirrored text and keeps every child aligned.
  const surface = engine.addEntity()
  Transform.create(surface, {
    parent: frame,
    position: Vector3.create(
      LEADERBOARD_CONFIG.panel.position.x,
      LEADERBOARD_CONFIG.panel.position.y,
      LEADERBOARD_CONFIG.panel.position.z
    ),
    rotation: Quaternion.fromEulerDegrees(0, 180, 0)
  })

  const panel = engine.addEntity()
  Transform.create(panel, {
    parent: surface,
    position: Vector3.Zero(),
    scale: Vector3.create(
      LEADERBOARD_CONFIG.panel.width,
      LEADERBOARD_CONFIG.panel.height,
      1
    )
  })
  MeshRenderer.setPlane(panel)
  Material.setPbrMaterial(panel, {
    albedoColor: Color4.create(
      LEADERBOARD_CONFIG.panel.backgroundColor.r,
      LEADERBOARD_CONFIG.panel.backgroundColor.g,
      LEADERBOARD_CONFIG.panel.backgroundColor.b,
      LEADERBOARD_CONFIG.panel.backgroundColor.a
    ),
    roughness: 1,
    metallic: 0
  })

  // Keep text clearly in front of the panel. The old 0.012 separation could
  // disappear through depth precision at this world scale.
  const textZ = 0.06
  titleLabel = createLabel(
    surface,
    Vector3.create(0, 4.15, textZ),
    'TOP 20  ·  IMPOSSIBLE STARS',
    2.85,
    TextAlignMode.TAM_MIDDLE_CENTER,
    9,
    0.62
  )
  periodLabel = createLabel(
    surface,
    Vector3.create(0, 3.55, textZ),
    'LOADING 14-DAY RANKING...',
    1.6,
    TextAlignMode.TAM_MIDDLE_CENTER,
    9,
    0.38
  )

  const firstRowY = 3.02
  const rowStep = 0.35
  for (let index = 0; index < LEADERBOARD_CONFIG.topSize; index++) {
    const y = firstRowY - index * rowStep
    rowLabels.push(createLabel(
      surface,
      Vector3.create(-1.05, y, textZ),
      `${index + 1}.  ---`,
      1.75,
      TextAlignMode.TAM_MIDDLE_LEFT,
      4.85,
      0.36
    ))
    scoreLabels.push(createLabel(
      surface,
      Vector3.create(1.35, y, textZ),
      '0',
      1.75,
      TextAlignMode.TAM_MIDDLE_RIGHT,
      1.05,
      0.36
    ))

    const visitButton = engine.addEntity()
    visitButtons.push(visitButton)
    Transform.create(visitButton, {
      parent: surface,
      position: Vector3.create(2.9, y, 0.045),
      scale: Vector3.create(1.7, .27, 1)
    })
    MeshRenderer.setPlane(visitButton)
    MeshCollider.setPlane(visitButton, ColliderLayer.CL_POINTER)
    Material.setPbrMaterial(visitButton, {
      albedoColor: Color4.create(.53, .32, .88, .98),
      roughness: 1,
      metallic: 0
    })
    const visitLabel = createLabel(
      surface,
      Vector3.create(2.9, y, textZ + .015),
      '',
      .78,
      TextAlignMode.TAM_MIDDLE_CENTER,
      1.62,
      .25
    )
    visitButtonLabels.push(visitLabel)
    pointerEventsSystem.onPointerDown({
      entity: visitButton,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: 'Visit Dimension',
        maxDistance: 10
      }
    }, () => {
      const entry = latestSnapshot?.entries[index]
      if (!entry?.wallet || entry.wallet.trim().toLowerCase() === getPlayer()?.userId.trim().toLowerCase()) return
      void visitPlayerDimension(entry.wallet).then(success => {
        showNotification(success
          ? `Visiting ${entry.name}'s dimension.`
          : 'That dimension could not be loaded.')
      })
    })
  }

  if (latestSnapshot) updateBoard(latestSnapshot)
}

function initializeBoardGeometry(): void {
  const placedFrame = engine.getEntityOrNullByName(LEADERBOARD_CONFIG.frameEntityName)
  if (placedFrame !== null) {
    createBoardGeometry(placedFrame)
    return
  }

  // Creator Hub normally owns this entity. The fallback only runs if the
  // placed model was removed, so preview and deployed builds never get two.
  const frame = engine.addEntity()
  Transform.create(frame, {
    position: Vector3.create(
      LEADERBOARD_CONFIG.framePosition.x,
      LEADERBOARD_CONFIG.framePosition.y,
      LEADERBOARD_CONFIG.framePosition.z
    ),
    rotation: Quaternion.fromEulerDegrees(0, LEADERBOARD_CONFIG.frameRotationY, 0)
  })
  GltfContainer.create(frame, {
    src: LEADERBOARD_CONFIG.frameModelPath,
    visibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS,
    invisibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS
  })
  createBoardGeometry(frame)
}

function updateSnapshotTimer(dt: number): void {
  requestElapsed += dt
  if (!roomReady || requestElapsed < 300) return
  requestElapsed = 0
  requestSnapshot()
}

export function initializeLeaderboardClient(): void {
  if (initialized) return
  initialized = true

  const now = Date.now()
  const first = Date.parse(LEADERBOARD_CONFIG.firstPeriodStartsAt)
  const periodMs = LEADERBOARD_CONFIG.periodDays * 24 * 60 * 60 * 1_000
  const periodId = Math.max(0, Math.floor((now - first) / periodMs))
  const name = localPlayerName()
  latestSnapshot = {
    periodId,
    startsAt: first + periodId * periodMs,
    endsAt: first + (periodId + 1) * periodMs,
    entries: name
      ? [{ wallet: '', name, periodPoints: 0, lifetimePoints: 0, updatedAt: now }]
      : [],
    ownLifetimePoints: 0,
    ownPeriodPoints: 0
  }
  initializeBoardGeometry()

  leaderboardRoom.onMessage('leaderboardSnapshot', data => {
    try {
      const parsed = JSON.parse(data.stateJson) as LeaderboardSnapshot
      if (!Array.isArray(parsed.entries)) throw new Error('entries are missing')
      updateBoard(parsed)
    } catch (error) {
      console.error('LEADERBOARD: invalid snapshot', error)
    }
  })

  leaderboardRoom.onMessage('leaderboardEventResult', data => {
    if (!data.accepted) {
      console.log(`LEADERBOARD: ${data.activity} was not counted (${data.reason})`)
    }
  })

  leaderboardRoom.onReady(ready => {
    roomReady = ready
    if (!ready) return
    requestElapsed = 0
    requestSnapshot()
    flushPendingEvents()
  })

  roomReady = leaderboardRoom.isReady()
  if (roomReady) {
    requestSnapshot()
    flushPendingEvents()
  }
  engine.addSystem(updateSnapshotTimer)
}

export function submitLeaderboardEvent(
  activity: PointActivity,
  eventReference = ''
): void {
  const event: PendingEvent = {
    activity,
    eventId: eventId(),
    eventReference: eventReference.trim().slice(0, 100)
  }
  pendingEvents.push(event)
  if (pendingEvents.length > 128) pendingEvents.shift()
  flushPendingEvents()
}

export function getLatestLeaderboardSnapshot(): LeaderboardSnapshot | undefined {
  return latestSnapshot
}
