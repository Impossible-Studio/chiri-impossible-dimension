import { ChapterMissionQuest } from './questState'

export const STORY_MISSIONS: readonly ChapterMissionQuest[] = [
  {
    id: 'chapter-1-mission-1-plant-seeds',
    chapter: 1,
    mission: 1,
    title: 'Find seeds and plant them',
    info: 'Find seeds around the house and plant them in the backyard.',
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-1-mission-2-cook-first-meal',
    chapter: 1,
    mission: 2,
    title: 'Cook your favs',
    info: 'Prepare an eggplant pizza and a mate for Chiri in the kitchen.',
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-1-mission-3-move-in',
    chapter: 1,
    mission: 3,
    title: 'Move in!',
    info: 'Open the boxes, take out the furniture and reorganize the house.',
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-1-mission-4-find-chiri-memories',
    chapter: 1,
    mission: 4,
    title: "Find Chiri's memories",
    info: 'Discover the memories Chiri lost around the house.',
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-1-mission-5-create-craftpack',
    chapter: 1,
    mission: 5,
    title: 'Create the Craftpack',
    info: 'Build the Craftpack in the tower and learn to craft away from home.',
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-2-mission-1-find-chiri-mecha-parts',
    chapter: 2,
    mission: 1,
    title: 'Find the Chiri Mecha parts',
    info: 'Find all six robot parts. Chiri Mecha assembles automatically when the set is complete.',
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-2-mission-2-find-flower-seeds',
    chapter: 2,
    mission: 2,
    title: 'Find flower seeds',
    info: 'Explore the Impossible Forest and collect its hidden flower seeds.',
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-2-mission-3-upgrade-craftpack',
    chapter: 2,
    mission: 3,
    title: 'Upgrade the Craftpack',
    info: 'Find the lost upgrade that lets the Craftpack create clothes and Chiri accessories.',
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-2-mission-4-create-chiri-comic',
    chapter: 2,
    mission: 4,
    title: "Find Chiri's forest memories",
    info: "Find Chiri's four memories hidden throughout the forest.",
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-2-mission-5-follow-the-ants',
    chapter: 2,
    mission: 5,
    title: 'Follow the ants',
    info: 'Follow the ants and discover the secret entrance to the Void Dimension.',
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-3-mission-1-repair-irrigation',
    chapter: 3,
    mission: 1,
    title: 'Repair the irrigation system',
    info: 'Find the five machine parts in the Void and repair the water machine.',
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-3-mission-2-decorate-void',
    chapter: 3,
    mission: 2,
    title: 'Help decorate the Void',
    info: 'Place decorative items in the collaborative Void space.',
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-3-mission-3-let-chiri-play',
    chapter: 3,
    mission: 3,
    title: 'Let Chiri play',
    info: 'Let Chiri free in the shared space to meet and play with other Chiris.',
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-3-mission-4-find-void-memories',
    chapter: 3,
    mission: 4,
    title: "Find Chiri's Void memories",
    info: 'Recover the memories hidden throughout the Void Dimension.',
    cardType: 'chapter-mission'
  },
  {
    id: 'chapter-3-mission-5-find-magic-map',
    chapter: 3,
    mission: 5,
    title: 'Find the Magic Map',
    info: 'Find the map near the exit, where the fluorescent magic water touched it.',
    cardType: 'chapter-mission'
  }
] as const

export function getStoryMission(chapter: number, mission: number) {
  return STORY_MISSIONS.find(
    entry => entry.chapter === chapter && entry.mission === mission
  )
}

export function getStoryMissionById(id: string) {
  return STORY_MISSIONS.find(entry => entry.id === id)
}

export function getChapterStoryMissions(chapter: number) {
  return STORY_MISSIONS.filter(entry => entry.chapter === chapter)
}
