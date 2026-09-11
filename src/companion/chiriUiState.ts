import type {
  ChiriArchiveGroup,
  ChiriFeedPlayGroup,
  ChiriUiTab
} from './chiriUiConfig'

export interface ChiriUiStateSnapshot {
  open: boolean
  tabsVisible: boolean
  activeTab: ChiriUiTab | null
  clothPage: number
  selectedClothSlot: number | null
  clothChoiceIndexes: number[]
  feedPlayGroup: ChiriFeedPlayGroup | null
  feedPage: number
  playPage: number
  archiveGroup: ChiriArchiveGroup
  archivePage: number
  selectedArchiveSlot: number | null
  archivePreviewItemId: string | null
  hoveredControl: string | null
  pressedControl: string | null
}

let state: ChiriUiStateSnapshot = {
  open: false,
  tabsVisible: true,
  activeTab: null,
  clothPage: 0,
  selectedClothSlot: null,
  clothChoiceIndexes: [0, 0, 0, 0, 0, 0],
  feedPlayGroup: null,
  feedPage: 0,
  playPage: 0,
  archiveGroup: 'memories',
  archivePage: 0,
  selectedArchiveSlot: null,
  archivePreviewItemId: null,
  hoveredControl: null,
  pressedControl: null
}

let onChange: () => void = () => {}

function update(patch: Partial<ChiriUiStateSnapshot>) {
  state = { ...state, ...patch }
  onChange()
}

export function setChiriUiStateListener(listener: () => void) {
  onChange = listener
}

export function getChiriUiState(): Readonly<ChiriUiStateSnapshot> {
  return state
}

export function openChiriUi() {
  update({ open: true })
}

export function closeChiriUi() {
  update({ open: false })
}

export function toggleChiriTabs() {
  // The orange handle alternates the complete tab drawer. Closed always keeps
  // the three compact tab buttons visible; opening always starts on Cloth.
  update({
    tabsVisible: true,
    activeTab: state.activeTab ? null : 'cloth'
  })
}

export function selectChiriTab(tab: ChiriUiTab) {
  update({ tabsVisible: true, activeTab: tab })
}

export function selectClothSlot(slot: number) {
  if (slot < 0 || slot >= 6) return
  update({ selectedClothSlot: slot })
}

export function pageCloth(direction: -1 | 1, optionCount = 0) {
  const slot = state.selectedClothSlot
  if (slot === null || optionCount <= 0) return
  const nextIndexes = [...state.clothChoiceIndexes]
  nextIndexes[slot] = (
    (nextIndexes[slot] ?? 0) + direction + optionCount
  ) % optionCount
  update({ clothChoiceIndexes: nextIndexes })
}

export function activateFeedPlayGroup(group: ChiriFeedPlayGroup) {
  update({ feedPlayGroup: group })
}

export function pageActiveFeedPlayGroup(direction: -1 | 1, itemCount = 0) {
  if (!state.feedPlayGroup) return
  const key = state.feedPlayGroup === 'feed' ? 'feedPage' : 'playPage'
  update({ [key]: Math.max(0, Math.min(Math.max(0, itemCount - 3), state[key] + direction)) })
}

export function selectArchiveGroup(group: ChiriArchiveGroup) {
  update({ archiveGroup: group, archivePage: 0, selectedArchiveSlot: null })
}

export function pageArchive(direction: -1 | 1, itemCount = 0) {
  const lastPage = Math.max(0, Math.ceil(itemCount / 12) - 1)
  update({
    archivePage: Math.max(0, Math.min(lastPage, state.archivePage + direction)),
    selectedArchiveSlot: null,
    archivePreviewItemId: null
  })
}

export function selectArchiveSlot(slot: number, itemId?: string | null) {
  if (slot < 0 || slot >= 12) return
  update({
    selectedArchiveSlot: itemId ? slot : null,
    archivePreviewItemId: itemId ?? null
  })
}

export function closeArchivePreview() {
  update({ archivePreviewItemId: null })
}

export function setHoveredChiriControl(control: string | null) {
  if (state.hoveredControl === control) return
  update({ hoveredControl: control })
}

export function leaveChiriControl(control: string) {
  if (state.hoveredControl === control) update({ hoveredControl: null })
}

export function setPressedChiriControl(control: string | null) {
  if (state.pressedControl === control) return
  update({ pressedControl: control })
}

export function releaseChiriControl(control: string) {
  if (state.pressedControl === control) update({ pressedControl: null })
}

// Tests and a future logout/reset flow can restore the UI without retaining a
// previous player's temporary tab or carousel selection.
export function resetChiriUiState() {
  state = {
    open: false,
    tabsVisible: true,
    activeTab: null,
    clothPage: 0,
    selectedClothSlot: null,
    clothChoiceIndexes: [0, 0, 0, 0, 0, 0],
    feedPlayGroup: null,
    feedPage: 0,
    playPage: 0,
    archiveGroup: 'memories',
    archivePage: 0,
    selectedArchiveSlot: null,
    archivePreviewItemId: null,
    hoveredControl: null,
    pressedControl: null
  }
  onChange()
}
