import {
  engine,
  Transform,
  GltfContainer,
  Animator,
  VisibilityComponent
} from '@dcl/sdk/ecs'

import { Vector3, Quaternion } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'

import { movePlayerTo } from '~system/RestrictedActions'

import {
  getPlayer,
  onEnterScene,
  onLeaveScene
} from '@dcl/sdk/players'

import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { ui } from './ui'
import { initializeCookingControls, reconcileCookingMission } from './cooking/cookingRuntime'
import { initializeCookingOven } from './cooking/cookingOven'
import { initializeCookingSupplies } from './cooking/cookingSupplies'
import { initializeMobileSceneModels } from './mobile/mobileSceneModels'
import { initializeForestFlowerSystem } from './farming/flowerSystem'
import { initializeStoryWorldSystem } from './farming/storyWorldSystem'

import {
  initializePlayer,
  getProgress,
  syncProgress
} from './farming/player'
import { initializeSeedSystem } from './farming/seed'
import { initializeFarmPlots } from './farming/farmPlot'
import { initializeGrowthSystem } from './farming/growth'
import { initializeHarvestSystem } from './farming/harvest'
import { initializeWorldIntroduction } from './farming/worldIntroduction'
import {
  initializeQuestState,
  FIRST_SEEDS_QUEST_ID,
  isMagicMapUnlocked,
  setChapterMissionCompletionClosedListener
} from './farming/questState'
import {
  initializeChiriCompanion,
  setChiriDialogueClosedListener,
  startChiriIntroductionAfterMissionCard
} from './companion/chiriCompanion'
import { initializeMateSystem } from './mates/mate'
import { initializeSharedZoneClient } from './multiplayer/sharedZoneClient'
import { initializeSharedZoneServer } from './multiplayer/sharedZoneServer'
import { initializeChiriPresenceClient } from './multiplayer/chiriPresenceClient'
import { initializeChiriPresenceServer } from './multiplayer/chiriPresenceServer'
import { initializeSharedZoneRuntime } from './multiplayer/sharedZoneRuntime'
import { initializeGiftSystem } from './multiplayer/giftState'
import {
  initializeHouseSystem,
  registerHouseFurnitureItemCatalog
} from './house/houseSystem'
import {
  initializeChiriMechaSystem,
  registerChiriMechaItemCatalog
} from './mecha/chiriMechaSystem'
import {
  activateStoryMission,
  initializeStoryProgression,
  scheduleNextNarrativeMission
} from './farming/storyProgression'
import { notifyPointsChanged } from './gameplay/pointsConfig'
import { initializeLeaderboardClient } from './leaderboard/leaderboardClient'
import { initializeLeaderboardServer } from './leaderboard/leaderboardServer'
import { initializeMemorySystem } from './memories/memorySystem'
import {
  initializeWaterMachineSystem,
  registerWaterMachineItemCatalog
} from './waterMachine/waterMachineSystem'
import {
  initializeSewingMachineSystem,
  registerSewingMachineItemCatalog
} from './sewing/sewingMachineSystem'

// Exact center of the default Spawn Point 1 range from scene.json.
export const WORLD_HOUSE_SPAWN = Vector3.create(328.6, 48.47, 336.1)
export const MAGIC_WATER_CLOUD_DESTINATION = Vector3.create(233, 218, 212)

/* TELEPORTS DEL MAPA */

export function teleportToChiriHouse() {
  movePlayerTo({
    newRelativePosition: Vector3.create(328, 40, 338)
  })
}

export function teleportToWolfIsland() {
  movePlayerTo({
    newRelativePosition: Vector3.create(403, 26, 74)
  })
}

export function teleportToCloudMountain() {
  movePlayerTo({
    newRelativePosition: Vector3.create(113, 116, 114)
  })
}

export function teleportToNorthIsland() {
  movePlayerTo({
    newRelativePosition: Vector3.create(85, 81, 438)
  })
}

export function teleportToEastIsland() {
  movePlayerTo({
    newRelativePosition: Vector3.create(455, 55, 220)
  })
}

export function teleportToSkyIsland() {
  movePlayerTo({
    newRelativePosition: Vector3.create(450, 80, 468)
  })
}

export async function main() {

  // The same bundle runs in two different environments. The authoritative
  // server owns shared state and must not initialize UI, player controls or
  // client-only gameplay systems.
  if (isServer()) {
    initializeChiriPresenceServer()
    initializeLeaderboardServer()
    await initializeSharedZoneServer()
    return
  }

  // Inventory metadata and heavy collectible textures must be known before
  // the first UI frame; world pickups are initialized after progress loads.
  registerChiriMechaItemCatalog()
  registerHouseFurnitureItemCatalog()
  registerWaterMachineItemCatalog()
  registerSewingMachineItemCatalog()

  // Render scene UI against the complete device canvas. The default SDK
  // wrapper limits the whole renderer to the phone safe area, which also clips
  // modal backdrops and can shift centered panels on asymmetric notches.
  ReactEcsRenderer.setUiRenderer(ui, { screenInset: 'none' })

  // Imported ants are hidden immediately; doors and other progression models
  // are synchronized as soon as the player's persisted story state is ready.
  initializeStoryWorldSystem()
  initializeMobileSceneModels()
  initializeCookingControls()
  initializeCookingOven()
  initializeSharedZoneClient()
  initializeSharedZoneRuntime()
  initializeGiftSystem()

  try {

  await initializePlayer()
  initializeLeaderboardClient()
  // UI starts before the async save loads; refresh it with the persisted score.
  notifyPointsChanged()
  initializeQuestState(getProgress(), syncProgress)
  initializeStoryProgression()
  reconcileCookingMission()
  initializeChiriCompanion(getProgress(), syncProgress)
  initializeChiriPresenceClient()
  setChapterMissionCompletionClosedListener(quest => {
    if (quest.id === FIRST_SEEDS_QUEST_ID) {
      startChiriIntroductionAfterMissionCard()
      return
    }
    scheduleNextNarrativeMission(quest)
  })
  setChiriDialogueClosedListener(() => {
    // Mission 2 begins only after the player finishes Chiri's introduction,
    // so its card never opens on top of the dialogue.
    activateStoryMission(1, 2, 2_000)
  })
  initializeWorldIntroduction()
  initializeHouseSystem()
  initializeCookingSupplies()
  initializeChiriMechaSystem()
  initializeForestFlowerSystem()
  initializeMemorySystem()
  initializeWaterMachineSystem()
  initializeSewingMachineSystem()

} catch (e) {

  console.log('PLAYER INIT FAILED')

  console.log(e)

}

initializeSeedSystem()
initializeMateSystem()
initializeFarmPlots()
initializeGrowthSystem()
initializeHarvestSystem()
  
  // WATER

  const waterTeleport = engine.addEntity()

  Transform.create(waterTeleport, {
    position: Vector3.create(256, -0.92, 256),
    scale: Vector3.create(1.7, 1, 1.7)
  })

  GltfContainer.create(waterTeleport, {
    src: 'assets/scene/Models/water_teleport/water_teleport.glb'
  })

  VisibilityComponent.create(waterTeleport, {
    visible: false
  })

  // TRIGGER

  const triggerZone = engine.addEntity()

  Transform.create(triggerZone, {
    position: Vector3.create(285.75, 26.75, 234.75),
    rotation: Quaternion.Identity(),
    scale: Vector3.create(1, 1, 1)
  })

  GltfContainer.create(triggerZone, {
    src: 'assets/scene/Models/multi_trigger_zone/multi_trigger_zone.glb'
  })

  VisibilityComponent.create(triggerZone, {
    visible: false
  })

  // PLATFORM

  const floatingPlatform = engine.addEntity()

  Transform.create(floatingPlatform, {
    position: Vector3.create(283, 26.25, 218.5),
    rotation: Quaternion.fromEulerDegrees(0, 285, 0),
    scale: Vector3.create(1, 1, 1)
  })

  GltfContainer.create(floatingPlatform, {
    src: 'assets/scene/Models/floating_platform/floating_platform.glb'
  })

  Animator.create(floatingPlatform, {
    states: [
      {
        clip: 'AnimatedPlatformMulti',
        playing: false,
        loop: false
      }
    ]
  })

  const remotePlayers = new Set<string>()

  onEnterScene((player) => {
    if (player.userId !== getPlayer()?.userId) {
      remotePlayers.add(player.userId)
    }
  })

  onLeaveScene((userId) => {
    remotePlayers.delete(userId)
  })

  let waterCooldown = false
  let animationPlaying = false

  function isInsideTrigger(pos: Vector3) {
    return (
      pos.x >= 284 &&
      pos.x <= 287.5 &&
      pos.y >= 25 &&
      pos.y <= 29 &&
      pos.z >= 233 &&
      pos.z <= 236.5
    )
  }

  engine.addSystem(() => {
    const me = getPlayer()

    if (!me || !me.position) return

    // WATER TELEPORT

    if (me.position.y <= 1 && !waterCooldown) {
      waterCooldown = true

      movePlayerTo({
        // Before finding the Magic Map, falling into water safely returns the
        // player home. Chapter 3 permanently turns the same water into the
        // cloud teleport used by the original world.
        newRelativePosition: isMagicMapUnlocked()
          ? MAGIC_WATER_CLOUD_DESTINATION
          : WORLD_HOUSE_SPAWN
      })

      setTimeout(() => {
        waterCooldown = false
      }, 3000)
    }

    let playersInside = 0

    // YO

    if (isInsideTrigger(me.position)) {
      playersInside++
    }

    // OTROS

    for (const userId of remotePlayers) {
      const other = getPlayer({ userId })

      if (!other || !other.position) continue

      if (isInsideTrigger(other.position)) {
        playersInside++
      }
    }

    if (playersInside >= 2 && !animationPlaying) {
      animationPlaying = true

      console.log('ACTIVATING PLATFORM')

      Animator.playSingleAnimation(
        floatingPlatform,
        'AnimatedPlatformMulti'
      )
    }

    if (playersInside < 2) {
      animationPlaying = false
    }
  })
}
