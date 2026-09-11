import type { PlayerProgress } from './types'

export const FOLLOW_ANTS_MISSION_ID =
  'chapter-2-mission-5-follow-the-ants'
export const MAGIC_MAP_MISSION_ID =
  'chapter-3-mission-5-find-magic-map'

export const STORY_WORLD_CONFIG = {
  origin: { x: 256, y: 0, z: 256 },
  models: {
    chapterOneCollider:
      'assets/scene/Models/story/doors/collider_cubo_chapter1.glb',
    hoodDoorClosed:
      'assets/scene/Models/story/doors/hood_door_closed.glb',
    hoodDoorOpen:
      'assets/scene/Models/story/doors/hood_door_open.glb',
    upperVoidClosed:
      'assets/scene/Models/story/doors/void_arriba_closed.glb',
    lowerVoidClosed:
      'assets/scene/Models/story/doors/void_abajo_closed.glb',
    magicMap:
      'assets/scene/Models/world_map/world_map.glb'
  },
  magicMap: {
    itemId: 'world_map',
    position: { x: 346.75, y: 2.75, z: 199.5 },
    rotation: { x: 0, y: 48.27, z: 0 },
    scale: 1,
    interactionDistance: 5
  },
  upperVoidDoorTrigger: {
    // Derived from puerta_void_collider inside void_arriba_closed.glb plus
    // the requested common (256, 0, 256) model origin.
    position: { x: 119.61, y: 28.37, z: 215.75 },
    horizontalRadius: 7,
    verticalRadius: 9
  },
  antsEntityName: 'ants_fn_2.glb'
} as const

export type HoodDoorWorldModel =
  | 'closed'
  | 'open'

export interface StoryWorldState {
  chapterOneColliderVisible: boolean
  hoodDoorModel: HoodDoorWorldModel
  upperVoidDoorVisible: boolean
  lowerVoidDoorVisible: boolean
  antsVisible: boolean
  magicMapVisible: boolean
}

function missionCompleted(progress: PlayerProgress, missionId: string) {
  return progress.story.completedMissionIds.includes(missionId)
}

function chapterCompleted(progress: PlayerProgress, chapter: number) {
  return progress.story.completedChapterIds.includes(chapter)
}

export function getStoryWorldState(
  progress: PlayerProgress
): StoryWorldState {
  const exteriorUnlocked =
    progress.story.flags.exteriorDoorUnlocked === true ||
    chapterCompleted(progress, 1)
  const followAntsCompleted =
    missionCompleted(progress, FOLLOW_ANTS_MISSION_ID) ||
    progress.story.flags.voidDoorUnlocked === true ||
    chapterCompleted(progress, 2)
  const antsVisible =
    progress.story.flags.antsPathUnlocked === true ||
    progress.story.announcedMissionIds.includes(FOLLOW_ANTS_MISSION_ID) ||
    followAntsCompleted
  const magicMapCollected =
    progress.story.flags.magicMapCollected === true ||
    missionCompleted(progress, MAGIC_MAP_MISSION_ID)
  const magicMapAvailable =
    progress.story.flags.magicMapPickupUnlocked === true ||
    progress.story.announcedMissionIds.includes(MAGIC_MAP_MISSION_ID)

  return {
    chapterOneColliderVisible: !exteriorUnlocked,
    hoodDoorModel: exteriorUnlocked ? 'open' : 'closed',
    upperVoidDoorVisible: !followAntsCompleted,
    lowerVoidDoorVisible:
      progress.story.flags.magicMapUnlocked !== true &&
      !chapterCompleted(progress, 3),
    antsVisible,
    magicMapVisible: magicMapAvailable && !magicMapCollected
  }
}
