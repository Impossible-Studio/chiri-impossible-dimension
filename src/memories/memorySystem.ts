import {
  ColliderLayer,
  engine,
  GltfContainer,
  InputAction,
  pointerEventsSystem,
  Transform,
  type Entity
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { canModifyCurrentDimension } from '../house/houseSystem'
import { getProgress, syncProgress } from '../farming/player'
import { showNotification } from '../farming/notifications'
import { emitStoryMissionEvent } from '../farming/storyProgression'
import { awardPoints } from '../gameplay/points'
import {
  MEMORIES,
  MEMORY_INTERACTION_DISTANCE,
  MEMORY_WORLD_ORIGIN,
  type MemoryDefinition
} from './memoryConfig'

const entities = new Map<string, Entity>()
let refreshElapsed = 0

function chapterPages(chapter: number): string[] {
  const progress = getProgress()
  const key = String(chapter)
  if (!Array.isArray(progress.comic.pageOrderByChapter[key])) {
    progress.comic.pageOrderByChapter[key] = []
  }
  return progress.comic.pageOrderByChapter[key]
}

function isCollected(memory: MemoryDefinition): boolean {
  return chapterPages(memory.chapter).includes(memory.itemId)
}

function removeMemoryEntity(memoryId: string): void {
  const entity = entities.get(memoryId)
  if (entity === undefined) return
  engine.removeEntity(entity)
  entities.delete(memoryId)
}

function finishMemoryChapter(chapter: 1 | 2 | 3): void {
  const progress = getProgress()
  if (!progress.comic.unlockedChapterIds.includes(chapter)) {
    progress.comic.unlockedChapterIds.push(chapter)
  }
  if (chapter === 1) emitStoryMissionEvent('all-house-memories-found')
  if (chapter === 2) {
    emitStoryMissionEvent('all-forest-memories-found')
  }
  if (chapter === 3) emitStoryMissionEvent('all-void-memories-found')
}

function collectMemory(memory: MemoryDefinition): void {
  if (!canModifyCurrentDimension() || isCollected(memory)) return
  const pages = chapterPages(memory.chapter)
  pages.push(memory.itemId)
  removeMemoryEntity(memory.id)

  if (memory.chapter === 1) emitStoryMissionEvent('first-house-memory-found')
  if (memory.chapter === 2) emitStoryMissionEvent('first-forest-memory-found')
  if (memory.chapter === 3) emitStoryMissionEvent('first-void-memory-found')

  const points = awardPoints('memoryCollected', false, memory.id)
  const chapterCount = MEMORIES.filter(
    candidate => candidate.chapter === memory.chapter && pages.includes(candidate.itemId)
  ).length
  if (chapterCount >= 4) finishMemoryChapter(memory.chapter)
  void syncProgress()
  showNotification(`${memory.displayName} found · +${points} points (${chapterCount}/4)`)
}

function spawnMemory(memory: MemoryDefinition): void {
  if (entities.has(memory.id)) return
  const entity = engine.addEntity()
  Transform.create(entity, {
    position: Vector3.create(MEMORY_WORLD_ORIGIN.x, MEMORY_WORLD_ORIGIN.y, MEMORY_WORLD_ORIGIN.z),
    rotation: Quaternion.Identity(),
    scale: Vector3.One()
  })
  GltfContainer.create(entity, {
    src: memory.model,
    visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
    invisibleMeshesCollisionMask: ColliderLayer.CL_NONE
  })
  pointerEventsSystem.onPointerDown({
    entity,
    opts: {
      button: InputAction.IA_POINTER,
      hoverText: `Collect ${memory.displayName}`,
      maxDistance: MEMORY_INTERACTION_DISTANCE
    }
  }, () => collectMemory(memory))
  entities.set(memory.id, entity)
}

function refreshMemories(): void {
  const activeChapter = getProgress().story.activeChapter
  for (const memory of MEMORIES) {
    if (memory.chapter <= activeChapter && !isCollected(memory)) spawnMemory(memory)
    else removeMemoryEntity(memory.id)
  }
}

export function initializeMemorySystem(): void {
  refreshMemories()
  engine.addSystem(dt => {
    refreshElapsed += dt
    if (refreshElapsed < 1) return
    refreshElapsed = 0
    refreshMemories()
  })
}
