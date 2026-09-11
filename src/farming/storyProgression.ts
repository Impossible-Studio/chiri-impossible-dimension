import { getProgress, syncProgress } from './player'
import {
  ChapterMissionQuest,
  completeChapterMissionQuest,
  registerChapterMissionQuest
} from './questState'
import {
  getStoryMission,
  getStoryMissionById,
  getChapterStoryMissions,
  STORY_MISSIONS
} from './storyMissions'
import {
  getStoryMissionFlow,
  STORY_MISSION_FLOWS
} from './storyMissionFlow'

// This gap is deliberately separate from each mission trigger. Chiri's future
// per-mission comment can play during it before the next card appears.
export const NEXT_NARRATIVE_MISSION_DELAY_MS = 6_000

export function initializeStoryProgression() {
  const progress = getProgress()

  // Active quest cards are runtime state, so rebuild every previously
  // discovered but unfinished mission after reconnecting.
  for (const missionId of progress.story.announcedMissionIds) {
    if (progress.story.completedMissionIds.includes(missionId)) continue
    const mission = getStoryMissionById(missionId)
    if (!mission) continue
    registerChapterMissionQuest(mission, { showPresentation: false })
  }
}

export function activateStoryMission(
  chapter: number,
  mission: number,
  presentationDelayMs = 0
) {
  const definition = getStoryMission(chapter, mission)
  if (!definition) return false

  return registerChapterMissionQuest(definition, {
    showPresentation: true,
    presentationDelayMs
  })
}

export function completeStoryMission(
  chapter: number,
  mission: number,
  showPresentation = true
) {
  const definition = getStoryMission(chapter, mission)
  if (!definition) return false

  // A direct gameplay trigger may complete a mission before the narrative
  // sequence introduced it. Activate it first so the same card presentation,
  // persistence and discovery order are preserved.
  registerChapterMissionQuest(definition)
  return completeChapterMissionQuest(definition.id, showPresentation)
}

export interface StoryMissionEventResult {
  activatedMissionIds: string[]
  updatedStepMissionIds: string[]
  completedMissionIds: string[]
}

// Final world systems only need to emit one semantic name from
// storyMissionFlow.ts. This router keeps out-of-order discovery, quest-card
// presentation, intermediate progress and completion persistence consistent
// across all 15 missions.
export function emitStoryMissionEvent(
  eventName: string,
  presentationDelayMs = 0
): StoryMissionEventResult {
  const result: StoryMissionEventResult = {
    activatedMissionIds: [],
    updatedStepMissionIds: [],
    completedMissionIds: []
  }
  const event = eventName.trim()
  if (!event) return result

  const progress = getProgress()
  let progressChanged = false
  for (const flow of STORY_MISSION_FLOWS) {
    if (progress.story.completedMissionIds.includes(flow.id)) continue
    const activates = flow.activationEvents.includes(event)
    const advances = flow.steps.includes(event)
    const completes = flow.completionEvent === event
    if (!activates && !advances && !completes) continue

    const definition = getStoryMissionById(flow.id)
    if (!definition) continue
    if (registerChapterMissionQuest(definition, {
      showPresentation: true,
      presentationDelayMs
    })) {
      result.activatedMissionIds.push(flow.id)
    }

    if (advances) {
      const stepFlag = `missionStep:${flow.id}:${event}`
      if (progress.story.flags[stepFlag] !== true) {
        progress.story.flags[stepFlag] = true
        progressChanged = true
        result.updatedStepMissionIds.push(flow.id)
      }
    }

    if (completes && completeChapterMissionQuest(flow.id, true)) {
      for (const outcome of flow.outcomes) {
        progress.story.flags[`missionOutcome:${outcome}`] = true
      }
      progressChanged = true
      result.completedMissionIds.push(flow.id)
    }
  }

  if (progressChanged) void syncProgress()
  return result
}

export function scheduleNextNarrativeMission(
  completedQuest: ChapterMissionQuest
) {
  const progress = getProgress()
  const nextMission = getChapterStoryMissions(completedQuest.chapter)
    .sort((a, b) => a.mission - b.mission)
    .find(mission => !progress.story.completedMissionIds.includes(mission.id))
  if (!nextMission) return

  if (
    progress.story.announcedMissionIds.includes(nextMission.id)
  ) {
    return
  }

  // Chapters 2 and 3 reveal their final-world clue only after missions 1–4
  // are done. These flags will control the ants and Magic Map world entities
  // as soon as their final models are connected.
  if (nextMission.mission === 5) {
    const firstFourComplete = getChapterStoryMissions(completedQuest.chapter)
      .filter(mission => mission.mission <= 4)
      .every(mission => progress.story.completedMissionIds.includes(mission.id))
    if (!firstFourComplete) return

    if (completedQuest.chapter === 2) {
      progress.story.flags.antsPathUnlocked = true
    }
    if (completedQuest.chapter === 3) {
      progress.story.flags.magicMapPickupUnlocked = true
    }
    void syncProgress()
  }

  activateStoryMission(
    nextMission.chapter,
    nextMission.mission,
    NEXT_NARRATIVE_MISSION_DELAY_MS
  )
}

export function getStoryMissionCatalog() {
  return STORY_MISSIONS.map(mission => ({
    ...mission,
    flow: getStoryMissionFlow(mission.id)
  }))
}

export function getStoryMissionFlowCatalog() {
  return STORY_MISSION_FLOWS
}
