import { QuestCardType } from './questCardAssets'
import { getStoryChapter, STORY_CHAPTERS } from './storyChapters'
import { PlayerProgress } from './types'
import { addPointsToProgress } from '../gameplay/pointsConfig'
import { submitLeaderboardEvent } from '../leaderboard/leaderboardClient'

export type QuestNoticeKind =
  | 'chapter-mission'
  | 'harvest-ready'
  | 'craft-ready'
  | 'robot-ready'
  | 'chapter-unlocked'
  | 'chiri-request'

export interface HarvestQuest {
  id: string
  cropId: string
  cardType: Extract<QuestCardType, 'harvest-ready'>
  readyPlotIds: number[]
}

export interface ChapterMissionQuest {
  id: string
  chapter: number
  mission: number
  title: string
  info: string
  cardType: Extract<QuestCardType, 'chapter-mission'>
}

export interface CraftReadyQuest {
  id: string
  itemId: string
  title: string
  info: string
  cardType: Extract<QuestCardType, 'ready-for-crafting'>
}

export interface ChapterCompletedPresentation {
  chapter: number
  title: string
  info: string
}

export interface RegisterChapterMissionOptions {
  showPresentation?: boolean
  presentationDelayMs?: number
}

const harvestQuests = new Map<string, HarvestQuest>()
const chapterMissionQuests = new Map<string, ChapterMissionQuest>()
const craftReadyQuests = new Map<string, CraftReadyQuest>()
const unreadNotices = new Set<QuestNoticeKind>()
let onQuestStateChanged: () => void = () => {}
let firstQuestSeedCollected = false
let firstQuestSeedPlanted = false
let chapterMissionCompletion: ChapterMissionQuest | null = null
let missionActivationPresentation: ChapterMissionQuest | null = null
const missionActivationQueue: ChapterMissionQuest[] = []
let missionActivationTimerToken = 0
let chapterCompletedPresentation: ChapterCompletedPresentation | null = null
const chapterCompletedPresentationQueue: ChapterCompletedPresentation[] = []
let chapterCompletedTimerToken = 0
let playerProgress: PlayerProgress | null = null
let savePlayerProgress: () => Promise<void> | void = () => {}
let onChapterMissionCompleted: (quest: ChapterMissionQuest) => void = () => {}
let onChapterMissionCompletionClosed: (quest: ChapterMissionQuest) => void = () => {}
let onChapterCompleted: (chapter: ChapterCompletedPresentation) => void = () => {}
let onChapterCompletedClosed: (chapter: ChapterCompletedPresentation) => void = () => {}

export const QUEST_NOTICE_COLORS: Record<QuestNoticeKind, { r: number; g: number; b: number }> = {
  'chapter-mission': { r: 0.38, g: 0.82, b: 0.29 },
  'harvest-ready': { r: 0.38, g: 0.82, b: 0.29 },
  'craft-ready': { r: 1, g: 0.8, b: 0.12 },
  'robot-ready': { r: 1, g: 0.8, b: 0.12 },
  'chapter-unlocked': { r: 0.42, g: 0.62, b: 1 },
  'chiri-request': { r: 0.94, g: 0.35, b: 0.67 }
}

export const FIRST_SEEDS_QUEST_ID = 'chapter-1-mission-1-plant-seeds'
export const CHAPTER_MISSION_TOTAL = 5
export const MISSION_ACTIVATION_PRESENTATION_MS = 20_000
export const CHAPTER_COMPLETED_PRESENTATION_MS = 20_000

export function initializeQuestState(
  progress: PlayerProgress,
  persist: () => Promise<void> | void
) {
  playerProgress = progress
  savePlayerProgress = persist
  chapterMissionQuests.clear()
  craftReadyQuests.clear()
  unreadNotices.clear()
  chapterMissionCompletion = null
  missionActivationPresentation = null
  missionActivationQueue.length = 0
  missionActivationTimerToken++
  chapterCompletedPresentation = null
  chapterCompletedPresentationQueue.length = 0
  chapterCompletedTimerToken++
  firstQuestSeedCollected =
    progress.story.flags.firstQuestSeedCollected === true
  firstQuestSeedPlanted =
    progress.story.completedMissionIds.includes(FIRST_SEEDS_QUEST_ID)

  // Repair progress created by older versions that already had five mission
  // ids but did not yet store the chapter reward flags.
  for (const chapter of STORY_CHAPTERS) {
    if (getCompletedChapterMissionCount(chapter.chapter) >= chapter.missionCount) {
      markChapterCompleted(chapter.chapter, true)
    }
  }
}

function persistQuestProgress() {
  void savePlayerProgress()
}

export function registerFirstSeedsQuest() {
  if (firstQuestSeedPlanted) {
    return
  }

  if (chapterMissionQuests.has(FIRST_SEEDS_QUEST_ID)) {
    return
  }

  const firstQuest: ChapterMissionQuest = {
    id: FIRST_SEEDS_QUEST_ID,
    chapter: 1,
    mission: 1,
    title: 'Plant your first seeds',
    info: 'Find seeds around the islands & plant them in the backyard',
    cardType: 'chapter-mission'
  }

  chapterMissionQuests.set(FIRST_SEEDS_QUEST_ID, firstQuest)

  // The first objective is also presented full-screen once, so new players
  // understand that the card has begun their first mission.
  if (!hasMissionPresentationBeenSeen(firstQuest.id)) {
    scheduleMissionActivationPresentation(firstQuest)
  }

  if (!playerProgress?.story.announcedMissionIds.includes(FIRST_SEEDS_QUEST_ID)) {
    unreadNotices.add('chapter-mission')
    playerProgress?.story.announcedMissionIds.push(FIRST_SEEDS_QUEST_ID)
    persistQuestProgress()
  }

  onQuestStateChanged()
}

// Reusable registration for the remaining chapter missions. Mission systems
// own their gameplay triggers, while this central state keeps Inventory,
// progress numbering, notifications and the full-screen PNG presentation
// consistent for every chapter.
export function registerChapterMissionQuest(
  quest: ChapterMissionQuest,
  options: RegisterChapterMissionOptions = {}
) {
  if (
    !playerProgress ||
    playerProgress.story.completedMissionIds.includes(quest.id) ||
    chapterMissionQuests.has(quest.id)
  ) {
    return false
  }

  chapterMissionQuests.set(quest.id, quest)
  const newlyAnnounced = !playerProgress.story.announcedMissionIds.includes(quest.id)
  if (newlyAnnounced) {
    playerProgress.story.announcedMissionIds.push(quest.id)
    unreadNotices.add('chapter-mission')
    persistQuestProgress()
  }

  if (newlyAnnounced && options.showPresentation !== false) {
    scheduleMissionActivationPresentation(
      quest,
      options.presentationDelayMs ?? 0
    )
  }
  onQuestStateChanged()
  return true
}

export function completeChapterMissionQuest(
  questId: string,
  showPresentation = true
) {
  if (!playerProgress) return false
  const quest = chapterMissionQuests.get(questId)
  if (!quest) return false

  if (!playerProgress.story.completedMissionIds.includes(questId)) {
    playerProgress.story.completedMissionIds.push(questId)
    addPointsToProgress(playerProgress, 'storyMissionCompleted')
    submitLeaderboardEvent('storyMissionCompleted', questId)
  }
  chapterMissionQuests.delete(questId)
  unreadNotices.delete('chapter-mission')
  if (showPresentation) {
    chapterMissionCompletion = quest
    onChapterMissionCompleted(quest)
    setTimeout(closeChapterMissionCompletion, 10_000)
  }
  markChapterCompletedIfReady(quest.chapter, showPresentation)
  persistQuestProgress()
  onQuestStateChanged()
  return true
}

export function registerFirstSeedsQuestSeedFound() {
  firstQuestSeedCollected = true

  if (playerProgress) {
    playerProgress.story.flags.firstQuestSeedCollected = true
    persistQuestProgress()
  }
}

export function registerFirstSeedsQuestPlanting() {
  if (!firstQuestSeedCollected) {
    return
  }

  firstQuestSeedPlanted = true
  completeChapterMissionQuest(FIRST_SEEDS_QUEST_ID, true)
}

export function getChapterMissionQuests(): ChapterMissionQuest[] {
  return [...chapterMissionQuests.values()]
}

export function getFirstQuestPresentation() {
  return missionActivationPresentation
}

export function closeFirstQuestPresentation() {
  if (!missionActivationPresentation) return

  const closedMission = missionActivationPresentation
  missionActivationPresentation = null
  missionActivationTimerToken++
  markMissionPresentationSeen(closedMission.id)
  showNextMissionActivationPresentation()
  onQuestStateChanged()
}

export function setChapterMissionCompletedListener(
  listener: (quest: ChapterMissionQuest) => void
) {
  onChapterMissionCompleted = listener
}

export function setChapterMissionCompletionClosedListener(
  listener: (quest: ChapterMissionQuest) => void
) {
  onChapterMissionCompletionClosed = listener
}

export function setChapterCompletedListener(
  listener: (chapter: ChapterCompletedPresentation) => void
) {
  onChapterCompleted = listener
}

export function setChapterCompletedClosedListener(
  listener: (chapter: ChapterCompletedPresentation) => void
) {
  onChapterCompletedClosed = listener
}

function getCompletedChapterMissionCount(chapter: number) {
  const missionPrefix = `chapter-${chapter}-mission-`
  return (
    playerProgress?.story.completedMissionIds.filter(
      missionId => missionId.startsWith(missionPrefix)
    ).length ?? 0
  )
}

// This is completion order, not the mission file number. It stays meaningful
// even when a player completes the chapter objectives in a different order.
export function getChapterMissionProgressIndex(chapter: number) {
  return Math.min(
    getCompletedChapterMissionCount(chapter) + 1,
    CHAPTER_MISSION_TOTAL
  )
}

// Completion is shown after saving the mission, so it uses the completed
// count itself (mission one shows 1of5, then the next active mission is 2of5).
export function getChapterMissionCompletionProgressIndex(chapter: number) {
  return Math.max(
    1,
    Math.min(getCompletedChapterMissionCount(chapter), CHAPTER_MISSION_TOTAL)
  )
}

export function getChapterMissionCompletion() {
  return chapterMissionCompletion
}

export function closeChapterMissionCompletion() {
  if (!chapterMissionCompletion) return

  const completedQuest = chapterMissionCompletion
  chapterMissionCompletion = null
  onChapterMissionCompletionClosed(completedQuest)
  showPendingChapterCompletedPresentation()
  onQuestStateChanged()
}

export function getChapterCompletedPresentation() {
  return chapterCompletedPresentation
}

export function closeChapterCompletedPresentation() {
  if (!chapterCompletedPresentation) return

  const completedChapter = chapterCompletedPresentation
  chapterCompletedPresentation = null
  chapterCompletedTimerToken++
  if (playerProgress) {
    playerProgress.story.flags[
      `chapterCompletionPresented:${completedChapter.chapter}`
    ] = true
    persistQuestProgress()
  }
  onChapterCompletedClosed(completedChapter)
  showPendingChapterCompletedPresentation()
  onQuestStateChanged()
}

export function isChapterCompleted(chapter: number) {
  return playerProgress?.story.completedChapterIds.includes(chapter) === true
}

export function isMagicMapUnlocked() {
  return (
    playerProgress?.story.flags.magicMapUnlocked === true ||
    isChapterCompleted(3)
  )
}

export function isExteriorDoorUnlocked() {
  return (
    playerProgress?.story.flags.exteriorDoorUnlocked === true ||
    isChapterCompleted(1)
  )
}

export function isVoidDoorUnlocked() {
  return (
    playerProgress?.story.flags.voidDoorUnlocked === true ||
    isChapterCompleted(2)
  )
}

function hasMissionPresentationBeenSeen(missionId: string) {
  if (!playerProgress) return false
  if (
    missionId === FIRST_SEEDS_QUEST_ID &&
    playerProgress.story.flags.firstQuestPresentationSeen === true
  ) {
    return true
  }
  return playerProgress.story.flags[`missionPresentationSeen:${missionId}`] === true
}

function markMissionPresentationSeen(missionId: string) {
  if (!playerProgress) return
  playerProgress.story.flags[`missionPresentationSeen:${missionId}`] = true
  if (missionId === FIRST_SEEDS_QUEST_ID) {
    playerProgress.story.flags.firstQuestPresentationSeen = true
  }
  persistQuestProgress()
}

function scheduleMissionActivationPresentation(
  quest: ChapterMissionQuest,
  delayMs = 0
) {
  if (hasMissionPresentationBeenSeen(quest.id)) return

  const enqueue = () => {
    if (
      hasMissionPresentationBeenSeen(quest.id) ||
      missionActivationPresentation?.id === quest.id ||
      missionActivationQueue.some(entry => entry.id === quest.id)
    ) {
      return
    }
    missionActivationQueue.push(quest)
    showNextMissionActivationPresentation()
    onQuestStateChanged()
  }

  if (delayMs > 0) setTimeout(enqueue, delayMs)
  else enqueue()
}

function showNextMissionActivationPresentation() {
  if (missionActivationPresentation || missionActivationQueue.length === 0) return

  missionActivationPresentation = missionActivationQueue.shift() ?? null
  if (!missionActivationPresentation) return

  const token = ++missionActivationTimerToken
  setTimeout(() => {
    if (token === missionActivationTimerToken) closeFirstQuestPresentation()
  }, MISSION_ACTIVATION_PRESENTATION_MS)
}

function markChapterCompletedIfReady(chapter: number, showPresentation: boolean) {
  const definition = getStoryChapter(chapter)
  if (!definition) return
  if (getCompletedChapterMissionCount(chapter) < definition.missionCount) return
  markChapterCompleted(chapter, showPresentation)
}

function markChapterCompleted(chapter: number, showPresentation: boolean) {
  if (!playerProgress) return
  const definition = getStoryChapter(chapter)
  if (!definition) return

  const newlyCompleted = !playerProgress.story.completedChapterIds.includes(chapter)
  if (newlyCompleted) {
    playerProgress.story.completedChapterIds.push(chapter)
  }
  playerProgress.story.flags[definition.unlockFlag] = true
  if (chapter < STORY_CHAPTERS.length) {
    playerProgress.story.activeChapter = Math.max(
      playerProgress.story.activeChapter,
      chapter + 1
    )
  }
  if (chapter === 3) {
    playerProgress.story.flags.magicMapUnlocked = true
    playerProgress.story.flags.storyContinuesSoon = true
  }

  const presentation: ChapterCompletedPresentation = {
    chapter,
    title: definition.completionTitle,
    info: definition.completionInfo
  }
  if (newlyCompleted) {
    onChapterCompleted(presentation)
  }
  if (
    showPresentation &&
    playerProgress.story.flags[`chapterCompletionPresented:${chapter}`] !== true &&
    chapterCompletedPresentation?.chapter !== chapter &&
    !chapterCompletedPresentationQueue.some(entry => entry.chapter === chapter)
  ) {
    chapterCompletedPresentationQueue.push(presentation)
    if (!chapterMissionCompletion) showPendingChapterCompletedPresentation()
  }
  persistQuestProgress()
}

function showPendingChapterCompletedPresentation() {
  if (chapterCompletedPresentation || chapterCompletedPresentationQueue.length === 0) return

  chapterCompletedPresentation = chapterCompletedPresentationQueue.shift() ?? null
  if (!chapterCompletedPresentation) return
  const token = ++chapterCompletedTimerToken
  setTimeout(() => {
    if (token === chapterCompletedTimerToken) closeChapterCompletedPresentation()
  }, CHAPTER_COMPLETED_PRESENTATION_MS)
}

export function registerHarvestReadyQuest(plotId: number, cropId: string) {
  const existingQuest = harvestQuests.get(cropId)

  if (existingQuest?.readyPlotIds.includes(plotId)) {
    return
  }

  if (existingQuest) {
    existingQuest.readyPlotIds.push(plotId)
  } else {
    harvestQuests.set(cropId, {
      id: `harvest-ready-${cropId}`,
      cropId,
      cardType: 'harvest-ready',
      readyPlotIds: [plotId]
    })
  }

  unreadNotices.add('harvest-ready')
  onQuestStateChanged()
}

export function completeHarvestReadyQuest(plotId: number, cropId: string) {
  const quest = harvestQuests.get(cropId)

  if (!quest) {
    return
  }

  quest.readyPlotIds = quest.readyPlotIds.filter(
    readyPlotId => readyPlotId !== plotId
  )

  if (quest.readyPlotIds.length === 0) {
    harvestQuests.delete(cropId)
  }

  if (harvestQuests.size === 0) {
    unreadNotices.delete('harvest-ready')
  }

  onQuestStateChanged()
}

export function getHarvestQuests(): HarvestQuest[] {
  return [...harvestQuests.values()]
}

export function registerCraftReadyQuest(quest: CraftReadyQuest) {
  if (craftReadyQuests.has(quest.id)) return false
  craftReadyQuests.set(quest.id, quest)
  unreadNotices.add('craft-ready')
  onQuestStateChanged()
  return true
}

export function completeCraftReadyQuest(questId: string) {
  if (!craftReadyQuests.delete(questId)) return false
  if (craftReadyQuests.size === 0) unreadNotices.delete('craft-ready')
  onQuestStateChanged()
  return true
}

export function getCraftReadyQuests(): CraftReadyQuest[] {
  return [...craftReadyQuests.values()]
}

export function getQuestNoticeColor() {
  const priority: QuestNoticeKind[] = [
    'robot-ready',
    'craft-ready',
    'chapter-unlocked',
    'chiri-request',
    'chapter-mission',
    'harvest-ready'
  ]

  const kind = priority.find(notice => unreadNotices.has(notice))

  return kind ? QUEST_NOTICE_COLORS[kind] : null
}

export function markQuestNoticesSeen() {
  unreadNotices.clear()
  onQuestStateChanged()
}

export function registerRobotReadyNotice() {
  unreadNotices.add('robot-ready')
  onQuestStateChanged()
}

export function setQuestStateChangeListener(listener: () => void) {
  onQuestStateChanged = listener
}
