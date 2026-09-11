// Single source of truth for the playable flow of all three current chapters.
// World/UI systems should emit the named semantic events when their final
// models are connected; discovery events can activate a mission out of order
// without changing its permanent chapter/mission number.
export interface StoryMissionFlowDefinition {
  id: string
  activationEvents: readonly string[]
  steps: readonly string[]
  completionEvent: string
  outcomes: readonly string[]
}

export const STORY_MISSION_FLOWS: readonly StoryMissionFlowDefinition[] = [
  {
    id: 'chapter-1-mission-1-plant-seeds',
    activationEvents: ['world-introduction-closed'],
    steps: ['find-seed', 'plant-seed-in-backyard'],
    completionEvent: 'first-found-seed-planted-in-backyard',
    outcomes: ['unlock-chiri-introduction', 'introduce-companion-follow']
  },
  {
    id: 'chapter-1-mission-2-cook-first-meal',
    activationEvents: ['chiri-introduction-dialogue-closed', 'oven-opened'],
    steps: ['take-pizza-dough', 'take-last-cheese', 'harvest-eggplant', 'cook-eggplant-pizza', 'prepare-infinite-mate'],
    completionEvent: 'pizza-and-mate-served',
    outcomes: ['unlock-move-in-mission']
  },
  {
    id: 'chapter-1-mission-3-move-in',
    activationEvents: ['chapter-1-mission-2-closed', 'first-house-box-opened'],
    steps: ['open-house-boxes', 'unpack-furniture', 'move-house-furniture'],
    completionEvent: 'house-furniture-reorganized',
    outcomes: ['persist-personal-house-layout', 'unlock-house-memories-mission']
  },
  {
    id: 'chapter-1-mission-4-find-chiri-memories',
    activationEvents: ['chapter-1-mission-3-closed', 'first-house-memory-found'],
    steps: ['find-all-house-memories'],
    completionEvent: 'all-house-memories-found',
    outcomes: ['add-house-memories-to-comic', 'unlock-craftpack-mission']
  },
  {
    id: 'chapter-1-mission-5-create-craftpack',
    activationEvents: ['chapter-1-mission-4-closed', 'craftpack-station-discovered'],
    steps: ['visit-tower', 'collect-craftpack-parts', 'craft-base-craftpack'],
    completionEvent: 'base-craftpack-created',
    outcomes: ['unlock-portable-crafting-with-10-charges', 'unlock-exterior-door', 'activate-chapter-2']
  },
  {
    id: 'chapter-2-mission-1-find-chiri-mecha-parts',
    activationEvents: ['chapter-2-entered', 'first-chiri-mecha-part-found'],
    steps: ['find-head', 'find-left-arm', 'find-right-arm', 'find-left-leg', 'find-right-leg', 'find-cabin'],
    completionEvent: 'all-six-chiri-mecha-parts-found',
    outcomes: ['assemble-chiri-mecha-automatically', 'unlock-mecha-skin']
  },
  {
    id: 'chapter-2-mission-2-find-flower-seeds',
    activationEvents: ['chapter-2-mission-1-closed', 'first-forest-flower-seed-found'],
    steps: ['explore-impossible-forest', 'collect-all-forest-flower-seed-types'],
    completionEvent: 'all-forest-flower-seed-types-found',
    outcomes: ['unlock-forest-flowers', 'unlock-craftpack-upgrade-mission']
  },
  {
    id: 'chapter-2-mission-3-upgrade-craftpack',
    activationEvents: ['chapter-2-mission-2-closed', 'craftpack-upgrade-part-found'],
    steps: ['find-lost-upgrade', 'install-upgrade-in-craftpack'],
    completionEvent: 'craftpack-upgrade-installed',
    outcomes: ['unlock-clothing-and-chiri-accessory-crafting', 'unlock-unlimited-crafting-panel', 'unlock-forest-memories-mission']
  },
  {
    id: 'chapter-2-mission-4-create-chiri-comic',
    activationEvents: ['chapter-2-mission-3-closed', 'first-forest-memory-found'],
    steps: ['find-all-forest-memories'],
    completionEvent: 'all-forest-memories-found',
    outcomes: ['reveal-forest-story', 'unlock-ants-after-first-four-forest-missions']
  },
  {
    id: 'chapter-2-mission-5-follow-the-ants',
    activationEvents: ['first-four-chapter-2-missions-complete'],
    steps: ['spawn-ant-path', 'follow-ants', 'discover-secret-void-door'],
    completionEvent: 'void-dimension-entered',
    outcomes: ['unlock-void-door', 'activate-chapter-3']
  },
  {
    id: 'chapter-3-mission-1-repair-irrigation',
    activationEvents: ['chapter-3-entered', 'first-irrigation-pipe-found'],
    steps: ['find-five-machine-parts', 'repair-water-machine'],
    completionEvent: 'irrigation-machine-repaired',
    outcomes: ['reduce-crop-growth-time-from-30-to-20-minutes', 'unlock-void-decoration-mission']
  },
  {
    id: 'chapter-3-mission-2-decorate-void',
    activationEvents: ['chapter-3-mission-1-closed', 'first-void-decoration-placed'],
    steps: ['place-items-in-collaborative-void-space'],
    completionEvent: 'void-decoration-goal-reached',
    outcomes: ['persist-shared-void-decoration', 'unlock-free-chiri-mission']
  },
  {
    id: 'chapter-3-mission-3-let-chiri-play',
    activationEvents: ['chapter-3-mission-2-closed', 'chiri-released-in-shared-zone'],
    steps: ['release-chiri-in-shared-zone', 'let-chiri-meet-other-chiris'],
    completionEvent: 'chiri-play-session-complete',
    outcomes: ['persist-shared-chiri-state', 'unlock-void-memories-mission']
  },
  {
    id: 'chapter-3-mission-4-find-void-memories',
    activationEvents: ['chapter-3-mission-3-closed', 'first-void-memory-found'],
    steps: ['find-all-void-memories'],
    completionEvent: 'all-void-memories-found',
    outcomes: ['add-void-memories-to-comic', 'reveal-magic-map-pickup']
  },
  {
    id: 'chapter-3-mission-5-find-magic-map',
    activationEvents: ['first-four-chapter-3-missions-complete', 'magic-map-discovered'],
    steps: ['follow-magic-water-clue', 'collect-magic-map-near-exit'],
    completionEvent: 'magic-map-collected',
    outcomes: ['unlock-map-ui', 'redirect-magic-water-to-clouds', 'show-story-continues-soon']
  }
] as const

export function getStoryMissionFlow(id: string) {
  return STORY_MISSION_FLOWS.find(flow => flow.id === id)
}
