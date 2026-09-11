export interface StoryChapterDefinition {
  id: string
  chapter: number
  title: string
  location: string
  missionCount: number
  completionTitle: string
  completionInfo: string
  unlockFlag: string
}

// Chapter-level rewards are persisted as flags. The physical door controllers
// can read the same flags once their final Creator Hub entity names are known.
export const STORY_CHAPTERS: readonly StoryChapterDefinition[] = [
  {
    id: 'home',
    chapter: 1,
    title: 'Chapter 1 · House',
    location: 'House',
    missionCount: 5,
    completionTitle: 'Chapter One Complete!',
    completionInfo: 'You unlocked the door to the Hood. Venture into the unknown, adventurer—but be careful in the Impossible Forest.',
    unlockFlag: 'exteriorDoorUnlocked'
  },
  {
    id: 'forest',
    chapter: 2,
    title: 'Chapter 2 · Forest',
    location: 'Impossible Forest',
    missionCount: 5,
    completionTitle: 'Chapter Two Complete!',
    completionInfo: 'You unlocked the secret door to the Void Dimension.',
    unlockFlag: 'voidDoorUnlocked'
  },
  {
    id: 'void',
    chapter: 3,
    title: 'Chapter 3 · Void',
    location: 'Void Dimension',
    missionCount: 5,
    completionTitle: 'Chapter Three Complete!',
    completionInfo: 'You found the Magic Map. Keep exploring and collecting—the story will continue in new chapters soon.',
    unlockFlag: 'magicMapUnlocked'
  }
] as const

export function getStoryChapter(chapter: number) {
  return STORY_CHAPTERS.find(entry => entry.chapter === chapter)
}
