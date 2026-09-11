

import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { ItemCard } from './farming/itemCard'

import {
  teleportToChiriHouse,
  teleportToWolfIsland,
  teleportToCloudMountain,
  teleportToNorthIsland,
  teleportToEastIsland,
  teleportToSkyIsland
} from './index'

import {
  isInventoryOpen,
  openInventory,
  closeInventory
} from './farming/inventoryUI'

import {
  getSelectedPlot,
  hidePlantMenu,
  isPlantMenuOpen
} from './farming/plantMenu'

import {
  plantCrop
} from './farming/planting'

import {
  getAllCrops,
  getCrop
} from './farming/definitions'

import {
  SEED_MENU_MASK_REGIONS
} from './farming/seedMenuMaskRegions'

import {
  SEED_MENU_LAYOUT,
  SEED_MENU_STYLE
} from './farming/seedMenuLayout'

import {
  getQuestNoticeColor,
  getHarvestQuests,
  getCraftReadyQuests,
  getChapterMissionQuests,
  getChapterMissionProgressIndex,
  getChapterMissionCompletionProgressIndex,
  getChapterMissionCompletion,
  closeChapterMissionCompletion,
  getChapterCompletedPresentation,
  closeChapterCompletedPresentation,
  isMagicMapUnlocked,
  getFirstQuestPresentation,
  closeFirstQuestPresentation,
  markQuestNoticesSeen,
  setQuestStateChangeListener
} from './farming/questState'

import {
  QUEST_CARD_OVERLAYS,
  getChapterMissionQuestOverlay,
  getChapterMissionProgressOverlay,
  getChapterMissionNumberOverlay,
  getChapterCompletedQuestOverlay,
  CHAPTER_MISSION_COMPLETE_OVERLAY,
  CHAPTER_MISSION_CARD_LAYOUT,
  CHAPTER_COMPLETED_CARD_LAYOUT
} from './farming/questCardAssets'

import { STORY_MISSIONS } from './farming/storyMissions'

import {
  isWorldIntroductionVisible,
  closeWorldIntroduction,
  setWorldIntroductionUiListener,
  WORLD_INTRODUCTION_IMAGE,
  WORLD_INTRODUCTION_LAYOUT
} from './farming/worldIntroduction'

import {
  advanceChiriDialogue,
  getChiriDialoguePageLabel,
  getChiriDialogueText,
  isChiriDialogueVisible,
  setChiriUiListener,
  CHIRI_DIALOGUE_LAYOUT,
  CHIRI_DIALOGUE_PANEL_TRANSFORM,
  CHIRI_DIALOGUE_BUBBLE
} from './companion/chiriCompanion'

import {
  getInventoryItems,
  getInventoryOrder
} from './farming/inventory'


import {
  INVENTORY_LAYOUT,
  INVENTORY_TEXT_STYLE,
  INVENTORY_INFO,
  INVENTORY_SLOT_STYLE,
  MINI_INVENTORY_NOTICE_STYLE
} from './farming/inventoryLayout'

import {
  INVENTORY_MASK_REGIONS
} from './farming/inventoryMaskRegions'

import {
  ITEM_DATA,
  getItemDimensionLabel,
  getItemSlotCategory
} from './farming/itemData'

import {
  ITEM_SLOT_BACKGROUNDS
} from './farming/itemSlotCategories'

import {
  CHIRI_MECHA_COLLECTION_CONFIG,
  CHIRI_MECHA_PARTS
} from './mecha/chiriMechaConfig'

import {
  closeItemUnlockPresentation,
  getItemUnlockPresentation,
  ITEM_UNLOCK_PRESENTATION_LAYOUT,
  setItemUnlockPresentationListener
} from './farming/itemUnlockPresentation'



import {
  INVENTORY_SCALE,
  MOBILE_UI_CONFIG,
  MAP_SCALE,
  MINI_INVENTORY_SCALE,
  MINI_MAP_SCALE,
  inventoryUi,
  mapUi,
  miniInventoryUi,
  miniMapUi,
  seedMenuUi
} from './uiLayout'

import {
  isPlayerReady
} from './farming/player'
import {
  canDropHouseFurnitureItem,
  dropHouseFurnitureItem
} from './house/houseSystem'
import {
  dropFurnitureInSharedZone,
  isPlayerInsideSharedZone
} from './multiplayer/sharedZoneRuntime'
import {
  cancelGiftSelection,
  getGiftRevision,
  getGiftTarget,
  isChoosingGift,
  isGiftableItem,
  sendSelectedGift
} from './multiplayer/giftState'


let mapOpen = false
let inventoryPage = 0

type InventorySection =
  | 'inventory'
  | 'farming'
  | 'cooking'
  | 'quests'

let activeInventorySection:
  InventorySection = 'inventory'

let hoveredInventoryButton:
  InventorySection | 'previous' | 'next' | 'close' | null = null

let hoveredInventorySlot: number | null = null
let selectedInventorySlot: number | null = null
let seedMenuPage = 0
let hoveredSeedMenuControl: string | null = null
let pressedSeedMenuSlot: number | null = null
let pressedInventoryButton: 'previous' | 'next' | null = null
let pressedSeedMenuButton: 'previous' | 'next' | null = null
let tappedInventoryButton: InventorySection | 'previous' | 'next' | 'close' | null = null
let tappedSeedMenuButton: 'close' | 'previous' | 'next' | null = null
let requestUiRender: () => void = () => {}
let openedChapterMissionQuest: ReturnType<typeof getChapterMissionQuests>[number] | null = null
let giftModeWasActive = false

const MOBILE_ITEM_TAP_FEEDBACK_MS = 120
let isMobileSeedTapPending = false

const QUANTITY_CIRCLE_TEXTURE =
  'assets/scene/ui/inventory/items/quantity circle/red_quantity.png'



const ITEM_BACKGROUND =
  'assets/scene/ui/inventory/backgrounds/item_background.png'

const INVENTORY_HOVER_LAYERS: Record<string, string> = {
  farming: 'assets/scene/ui/inventory/layers/farming_glow.png',
  inventory: 'assets/scene/ui/inventory/layers/inventory_glow.png',
  cooking: 'assets/scene/ui/inventory/layers/cooking_glow.png',
  quests: 'assets/scene/ui/inventory/layers/quests_glow.png',
  previous: 'assets/scene/ui/inventory/layers/previous_glow.png',
  next: 'assets/scene/ui/inventory/layers/next_glow.png',
  close: 'assets/scene/ui/inventory/layers/close_glow.png'
}

const INVENTORY_ACTIVE_LAYERS: Record<InventorySection, string> = {
  farming: 'assets/scene/ui/inventory/buttons/farming_active.png',
  inventory: 'assets/scene/ui/inventory/buttons/inventory_active.png',
  cooking: 'assets/scene/ui/inventory/buttons/cooking_active.png',
  quests: 'assets/scene/ui/inventory/buttons/quests_active.png'
}

const INVENTORY_PRESSED_LAYERS: Record<'previous' | 'next', string> = {
  previous: 'assets/scene/ui/inventory/buttons/previous_active.png',
  next: 'assets/scene/ui/inventory/buttons/next_active.png'
}

const SEED_MENU_HOVER_LAYERS: Record<'close' | 'previous' | 'next', string> = {
  close: 'assets/scene/ui/seed-menu/layers/close_glow.png',
  previous: 'assets/scene/ui/seed-menu/layers/previous_glow.png',
  next: 'assets/scene/ui/seed-menu/layers/next_glow.png'
}

const SEED_MENU_PRESSED_LAYERS: Record<'previous' | 'next', string> = {
  previous: 'assets/scene/ui/seed-menu/buttons/previous_active.png',
  next: 'assets/scene/ui/seed-menu/buttons/next_active.png'
}

// Keep feedback textures decoded before their first tap. This prevents the
// one-frame white placeholder that can appear while a PNG loads on mobile.
const UI_TEXTURES_TO_PRELOAD = [
  'assets/scene/ui/inventory/layers/item_hover.png',
  ...Object.values(INVENTORY_HOVER_LAYERS),
  ...Object.values(INVENTORY_ACTIVE_LAYERS),
  ...Object.values(INVENTORY_PRESSED_LAYERS),
  ...Object.values(SEED_MENU_HOVER_LAYERS),
  ...Object.values(SEED_MENU_PRESSED_LAYERS),
  ...CHIRI_MECHA_PARTS.map(part => part.inventoryIcon),
  CHIRI_MECHA_COLLECTION_CONFIG.craftItemIcon,
  ...STORY_MISSIONS.map(mission =>
    getChapterMissionQuestOverlay(mission.chapter, mission.mission)),
  ...[1, 2, 3, 4, 5].map(getChapterMissionProgressOverlay),
  ...[1, 2, 3, 4, 5].map(getChapterMissionNumberOverlay),
  CHAPTER_MISSION_COMPLETE_OVERLAY
]


const UI_INFO: Record<string, string> = {

  farming:
    'Grow, water and harvest crops in Chiri’s garden.',

  inventory:
    'Manage the seeds, crops and objects you have collected.',

  cooking:
    'Combine ingredients from your garden and the world.',

  quests:
    'Follow the Chapters and discover Chiri’s story.'

}



let infoText =
  UI_INFO.inventory

function setInventoryInfo(text: string) {
  infoText = text
}

function renderMaskHitbox(
  region: {
    x: number
    y: number
    width: number
    height: number
  },
  onClick: () => void
) {
  return (

    <UiEntity

      uiTransform={{

        width:
          inventoryUi(region.width),

        height:
          inventoryUi(region.height),

        positionType:
          'absolute',

        position: {

          left:
            inventoryUi(region.x),

          top:
            inventoryUi(region.y)

        }

      }}

      onMouseDown={onClick}

    />

  )

}

function renderInventoryButton(
  section:
    | 'inventory'
    | 'farming'
    | 'cooking'
    | 'quests'
    | 'previous'
    | 'next'
    | 'close',
  region: {
    x: number
    y: number
    width: number
    height: number
  },
  glowTexture?: string,
  activeTexture?: string,
  onClick?: () => void
) {

  return (

    <UiEntity

      uiTransform={{

        width:
          inventoryUi(region.width),

        height:
          inventoryUi(region.height),

        positionType:
          'absolute',

        position: {

          left:
            inventoryUi(region.x),

          top:
            inventoryUi(region.y)

        }

      }}

      onMouseEnter={() => {
        if (hoveredInventoryButton !== section) {
          hoveredInventoryButton = section
          requestUiRender()
        }

      }}

      onMouseLeave={() => {
        if (hoveredInventoryButton !== null) {
          hoveredInventoryButton = null
          requestUiRender()
        }

      }}

      onMouseDown={() => {

        if (isMobile()) {
          tappedInventoryButton = section
          requestUiRender()

          setTimeout(() => {
            if (tappedInventoryButton === section) {
              tappedInventoryButton = null
              requestUiRender()
            }
          }, MOBILE_ITEM_TAP_FEEDBACK_MS)

          if (section === 'close') {
            setTimeout(() => onClick?.(), MOBILE_ITEM_TAP_FEEDBACK_MS)
            return
          }
        }

        if (
          section === 'inventory'
          || section === 'farming'
          || section === 'cooking'
          || section === 'quests'
        ) {

          activeInventorySection =
            section

          inventoryPage = 0
          selectedInventorySlot = null

          requestUiRender()

        }

        if (section === 'previous' || section === 'next') {
          pressedInventoryButton = section
          requestUiRender()
        }

        onClick?.()

      }}

      onMouseUp={() => {
        pressedInventoryButton = null
        requestUiRender()
      }}

    />

  )

}

function renderSeedMenuHitbox(
  region: {
    x: number
    y: number
    width: number
    height: number
  },
  onClick: () => void,
  control: 'close' | 'previous' | 'next'
) {
  return (
    <UiEntity
      uiTransform={{
        width: seedMenuUi(region.width),
        height: seedMenuUi(region.height),
        positionType: 'absolute',
        position: {
          left: seedMenuUi(region.x),
          top: seedMenuUi(region.y)
        }
      }}
      onMouseEnter={() => {
        // Mobile sends a synthetic enter just before the tap. E/F use their
        // pressed/active art, so do not enable a second hover layer for them.
        if (isMobile() && (control === 'previous' || control === 'next')) {
          return
        }

        if (hoveredSeedMenuControl !== control) {
          hoveredSeedMenuControl = control
          requestUiRender()
        }
      }}
      onMouseLeave={() => {
        if (hoveredSeedMenuControl !== null) {
          hoveredSeedMenuControl = null
          requestUiRender()
        }
      }}
      onMouseDown={() => {
        // Previous/next already have their own pressed PNG. On mobile they
        // must not briefly show the transparent hover layer as well.
        if (isMobile() && control === 'close') {
          tappedSeedMenuButton = control
          requestUiRender()

          setTimeout(() => {
            if (tappedSeedMenuButton === control) {
              tappedSeedMenuButton = null
              requestUiRender()
            }
          }, MOBILE_ITEM_TAP_FEEDBACK_MS)

          if (control === 'close') {
            setTimeout(onClick, MOBILE_ITEM_TAP_FEEDBACK_MS)
            return
          }
        }

        if (control === 'previous' || control === 'next') {
          pressedSeedMenuButton = control
          requestUiRender()
        }

        onClick()
      }}
      onMouseUp={() => {
        pressedSeedMenuButton = null
        requestUiRender()
      }}
    />
  )
}

function renderInventorySlot(
  slot: typeof INVENTORY_LAYOUT.slots[number],
  itemId: string | null,
  quantity: number,
  isHovered: boolean
) {
  return ItemCard({
    slot,
    itemId,
    quantity,
    isHovered,
    canvasScale: inventoryUi(1),
    slotCategory:
      activeInventorySection === 'farming' || activeInventorySection === 'cooking'
        ? activeInventorySection
        : undefined
  })
}


function renderHarvestQuestCard(
  slot: typeof INVENTORY_LAYOUT.slots[number],
  quest: ReturnType<typeof getHarvestQuests>[number],
  isHovered: boolean
) {
  const scale = inventoryUi(1)
  const slotSize = INVENTORY_SLOT_STYLE.backgroundSize * scale
  const itemSize = INVENTORY_SLOT_STYLE.itemSize * scale
  const quantityWidth = INVENTORY_SLOT_STYLE.quantityWidth * scale
  const quantityHeight = INVENTORY_SLOT_STYLE.quantityHeight * scale
  const nameWidth = INVENTORY_SLOT_STYLE.nameWidth * scale
  const nameHeight = INVENTORY_SLOT_STYLE.nameHeight * scale
  const crop = getCrop(quest.cropId)
  const cropItem = ITEM_DATA[crop.cropItem]

  return (
    <UiEntity
      uiTransform={{
        width: slotSize,
        height: slotSize,
        positionType: 'absolute',
        position: {
          left: inventoryUi(slot.item.x) - slotSize / 2,
          top: inventoryUi(slot.item.y) - slotSize / 2
        }
      }}
    >
      <UiEntity
        uiTransform={{ width: slotSize, height: slotSize, positionType: 'absolute', position: { left: 0, top: 0 } }}
        uiBackground={{ textureMode: 'stretch', texture: { src: ITEM_SLOT_BACKGROUNDS['quest-harvest'] } }}
      />
      {isHovered && (
        <UiEntity
          uiTransform={{
            width: INVENTORY_SLOT_STYLE.hoverSize * scale,
            height: INVENTORY_SLOT_STYLE.hoverSize * scale,
            positionType: 'absolute',
            position: {
              left: slotSize / 2 - INVENTORY_SLOT_STYLE.hoverSize * scale / 2,
              top: slotSize / 2 - INVENTORY_SLOT_STYLE.hoverSize * scale / 2
            }
          }}
          uiBackground={{ textureMode: 'stretch', texture: { src: 'assets/scene/ui/inventory/layers/item_hover.png' } }}
        />
      )}
      <UiEntity
        uiTransform={{
          width: itemSize,
          height: itemSize,
          positionType: 'absolute',
          position: { left: slotSize / 2 - itemSize / 2, top: slotSize / 2 - itemSize / 2 }
        }}
        uiBackground={{ textureMode: 'stretch', texture: { src: cropItem.icon } }}
      />
      <UiEntity
        uiTransform={{ width: slotSize, height: slotSize, positionType: 'absolute', position: { left: 0, top: 0 } }}
        uiBackground={{ textureMode: 'stretch', texture: { src: QUEST_CARD_OVERLAYS['harvest-ready'] } }}
      />
      <UiEntity
        uiTransform={{
          width: slotSize,
          height: slotSize,
          positionType: 'absolute',
          position: {
            left: INVENTORY_SLOT_STYLE.quantityCircleOffsetX * scale,
            top: INVENTORY_SLOT_STYLE.quantityCircleOffsetY * scale
          }
        }}
        uiBackground={{ textureMode: 'stretch', texture: { src: QUANTITY_CIRCLE_TEXTURE } }}
      />
      <Label
        value={String(quest.readyPlotIds.length)}
        uiTransform={{
          width: quantityWidth,
          height: quantityHeight,
          positionType: 'absolute',
          position: {
            left: inventoryUi(slot.quantity.x) - inventoryUi(slot.item.x) - quantityWidth / 2 + slotSize / 2,
            top: inventoryUi(slot.quantity.y) - inventoryUi(slot.item.y) - quantityHeight / 2 + slotSize / 2 + 4 * scale
          }
        }}
        font={INVENTORY_TEXT_STYLE.quantity.font}
        fontSize={INVENTORY_TEXT_STYLE.quantity.fontSize * scale}
        textAlign="middle-center"
      />
      <Label
        value={crop.displayName}
        uiTransform={{
          width: nameWidth,
          height: nameHeight,
          positionType: 'absolute',
          position: {
            left: inventoryUi(slot.name.x) - inventoryUi(slot.item.x) - nameWidth / 2 + slotSize / 2,
            top: inventoryUi(slot.name.y) - inventoryUi(slot.item.y) - nameHeight / 2 + slotSize / 2 + INVENTORY_SLOT_STYLE.nameOffsetY * scale
          }
        }}
        font={INVENTORY_TEXT_STYLE.itemName.font}
        fontSize={INVENTORY_TEXT_STYLE.itemName.fontSize * scale}
        textAlign="middle-center"
      />
    </UiEntity>
  )
}

function renderChapterMissionQuestCard(
  slot: typeof INVENTORY_LAYOUT.slots[number],
  quest: ReturnType<typeof getChapterMissionQuests>[number],
  isHovered: boolean
) {
  const deviceCardScale = isMobile()
    ? CHAPTER_MISSION_CARD_LAYOUT.questMobileScale
    : CHAPTER_MISSION_CARD_LAYOUT.questDesktopScale
  const scale = inventoryUi(1) * deviceCardScale
  const slotSize = INVENTORY_SLOT_STYLE.backgroundSize * scale
  const baseCardHeight = slotSize
  const baseCardWidth =
    baseCardHeight *
    CHAPTER_MISSION_CARD_LAYOUT.baseCanvasWidth /
    CHAPTER_MISSION_CARD_LAYOUT.baseCanvasHeight
  const baseCardLeft = (slotSize - baseCardWidth) / 2

  return (
    <UiEntity
      uiTransform={{
        width: slotSize,
        height: slotSize,
        positionType: 'absolute',
        position: {
          left: inventoryUi(slot.item.x) - slotSize / 2,
          top: inventoryUi(slot.item.y) - slotSize / 2
        }
      }}
    >
      <UiEntity
        uiTransform={{
          width: baseCardWidth,
          height: baseCardHeight,
          positionType: 'absolute',
          position: { left: baseCardLeft, top: 0 }
        }}
        uiBackground={{
          textureMode: 'stretch',
          texture: { src: getChapterMissionQuestOverlay(quest.chapter, quest.mission) }
        }}
      />
      <UiEntity
        uiTransform={{
          width: baseCardWidth,
          height: baseCardHeight,
          positionType: 'absolute',
          position: { left: baseCardLeft, top: 0 }
        }}
        uiBackground={{
          textureMode: 'stretch',
          texture: {
            src: getChapterMissionProgressOverlay(
              getChapterMissionProgressIndex(quest.chapter)
            )
          }
        }}
      />
      {isHovered && (
        <UiEntity
          uiTransform={{
            width: INVENTORY_SLOT_STYLE.hoverSize * scale,
            height: INVENTORY_SLOT_STYLE.hoverSize * scale,
            positionType: 'absolute',
            position: {
              left: slotSize / 2 - INVENTORY_SLOT_STYLE.hoverSize * scale / 2,
              top: slotSize / 2 - INVENTORY_SLOT_STYLE.hoverSize * scale / 2
            }
          }}
          uiBackground={{ textureMode: 'stretch', texture: { src: 'assets/scene/ui/inventory/layers/item_hover.png' } }}
        />
      )}
    </UiEntity>
  )
}

export function MapUI() {

  const [, setUiRevision] = ReactEcs.useState<number>(0)
  // This renderer now uses the complete device canvas. Percent sizes are
  // therefore more reliable than vw/vh on phones with different pixel ratios.
  const modalBackdropWidth = '100%'
  const modalBackdropHeight = '100%'
  const modalBackdropLeft = 0
  const modalContentOffsetX = isMobile()
    ? MOBILE_UI_CONFIG.modalContentOffsetX
    : 0

  requestUiRender = () => {
    setUiRevision(revision => revision + 1)
  }

  setQuestStateChangeListener(requestUiRender)
  setWorldIntroductionUiListener(requestUiRender)
  setChiriUiListener(requestUiRender)
  setItemUnlockPresentationListener(requestUiRender)
  getGiftRevision()
  const giftMode = isChoosingGift()
  if (giftMode && !giftModeWasActive) {
    activeInventorySection = 'inventory'
    inventoryPage = 0
    selectedInventorySlot = null
  }
  giftModeWasActive = giftMode

  // A reset/late progress load must close an already-open map as well as hide
  // its shortcut. The Chapter 3 unlock is the single source of truth.
  const magicMapUnlocked = isMagicMapUnlocked()
  if (!magicMapUnlocked) mapOpen = false

  const inventoryItems =
  isPlayerReady()
    ? getInventoryItems()
    : {}

const inventoryOrder =
  isPlayerReady()
    ? getInventoryOrder()
    : []

const inventoryEntries =
  inventoryOrder
    .filter(
      itemId => {
        const item = ITEM_DATA[itemId]

        return (
          (inventoryItems[itemId] ?? 0) > 0 &&
          (giftMode
            ? isGiftableItem(itemId)
            : activeInventorySection === 'inventory' ||
              item?.categories.includes(activeInventorySection))
        )
      }
    )
    .map(
      itemId => [
        itemId,
        inventoryItems[itemId]
      ] as [string, number]
    )

  const selectedInventoryItemId =
    selectedInventorySlot !== null && activeInventorySection !== 'quests'
      ? inventoryEntries[inventoryPage * 10 + selectedInventorySlot]?.[0] ?? null
      : null

  const harvestQuests = getHarvestQuests()
  const craftReadyQuests = getCraftReadyQuests()
  const chapterMissionQuests = getChapterMissionQuests()
  const chapterMissionCompletion = getChapterMissionCompletion()
  const chapterCompletedPresentation = getChapterCompletedPresentation()
  const itemUnlockPresentation = getItemUnlockPresentation()
  const itemUnlockPresentationScale = isMobile()
    ? ITEM_UNLOCK_PRESENTATION_LAYOUT.mobileScale
    : ITEM_UNLOCK_PRESENTATION_LAYOUT.desktopScale
  const itemUnlockPresentationHeight =
    ITEM_UNLOCK_PRESENTATION_LAYOUT.baseHeight * itemUnlockPresentationScale
  const itemUnlockPresentationWidth = itemUnlockPresentation
    ? itemUnlockPresentationHeight * itemUnlockPresentation.artworkAspectRatio
    : itemUnlockPresentationHeight
  const itemUnlockOverlayLayout = isMobile()
    ? ITEM_UNLOCK_PRESENTATION_LAYOUT.unlockedOverlayTransform.mobile
    : ITEM_UNLOCK_PRESENTATION_LAYOUT.unlockedOverlayTransform.desktop
  const itemUnlockSourcePixelScale =
    itemUnlockPresentationHeight /
    ITEM_UNLOCK_PRESENTATION_LAYOUT.artworkSourceHeight
  const itemUnlockOverlayHeight =
    ITEM_UNLOCK_PRESENTATION_LAYOUT.unlockedOverlayCanvasHeight *
    itemUnlockSourcePixelScale *
    itemUnlockOverlayLayout.scale
  const itemUnlockOverlayWidth =
    ITEM_UNLOCK_PRESENTATION_LAYOUT.unlockedOverlayCanvasWidth *
    itemUnlockSourcePixelScale *
    itemUnlockOverlayLayout.scale
  const chapterMissionCompletionScale =
    isMobile()
      ? CHAPTER_MISSION_CARD_LAYOUT.completionMobileScale
      : CHAPTER_MISSION_CARD_LAYOUT.completionDesktopScale
  const chapterMissionCompletionHeight =
    CHAPTER_MISSION_CARD_LAYOUT.completionBaseSize * chapterMissionCompletionScale
  const chapterMissionCompletionWidth =
    chapterMissionCompletionHeight *
    CHAPTER_MISSION_CARD_LAYOUT.baseCanvasWidth /
    CHAPTER_MISSION_CARD_LAYOUT.baseCanvasHeight
  const missionCompleteOverlayLayout = isMobile()
    ? CHAPTER_MISSION_CARD_LAYOUT.missionCompleteOverlay.mobile
    : CHAPTER_MISSION_CARD_LAYOUT.missionCompleteOverlay.desktop
  const chapterMissionCompletionSourcePixelScale =
    chapterMissionCompletionHeight /
    CHAPTER_MISSION_CARD_LAYOUT.baseCanvasHeight
  const chapterMissionCompletionOverlayWidth =
    CHAPTER_MISSION_CARD_LAYOUT.largeOverlayCanvasWidth *
    chapterMissionCompletionSourcePixelScale *
    missionCompleteOverlayLayout.scale
  const chapterMissionCompletionOverlayHeight =
    CHAPTER_MISSION_CARD_LAYOUT.largeOverlayCanvasHeight *
    chapterMissionCompletionSourcePixelScale *
    missionCompleteOverlayLayout.scale
  const chapterCompletedLayout = isMobile()
    ? CHAPTER_COMPLETED_CARD_LAYOUT.mobile
    : CHAPTER_COMPLETED_CARD_LAYOUT.desktop
  const chapterCompletedHeight =
    CHAPTER_COMPLETED_CARD_LAYOUT.baseHeight * chapterCompletedLayout.scale
  const chapterCompletedWidth =
    chapterCompletedHeight *
    CHAPTER_COMPLETED_CARD_LAYOUT.sourceWidth /
    CHAPTER_COMPLETED_CARD_LAYOUT.sourceHeight
  const firstQuestPresentation = getFirstQuestPresentation()
  const chapterMissionQuestPreview =
    firstQuestPresentation ?? openedChapterMissionQuest
  const firstQuestPresentationGroupScale = isMobile()
    ? CHAPTER_MISSION_CARD_LAYOUT.firstPresentationGroupMobileScale
    : CHAPTER_MISSION_CARD_LAYOUT.firstPresentationGroupDesktopScale
  const chapterMissionQuestPreviewScale =
    isMobile()
      ? CHAPTER_MISSION_CARD_LAYOUT.previewGroupMobileScale
      : CHAPTER_MISSION_CARD_LAYOUT.previewGroupDesktopScale
  const chapterMissionQuestPreviewHeight = firstQuestPresentation
    ? CHAPTER_MISSION_CARD_LAYOUT.firstPresentationBaseSize *
      firstQuestPresentationGroupScale
    : CHAPTER_MISSION_CARD_LAYOUT.previewBaseSize *
      chapterMissionQuestPreviewScale
  const chapterMissionQuestPreviewWidth =
    chapterMissionQuestPreviewHeight *
    CHAPTER_MISSION_CARD_LAYOUT.baseCanvasWidth /
    CHAPTER_MISSION_CARD_LAYOUT.baseCanvasHeight
  const missionInfoOverlayLayout = isMobile()
    ? CHAPTER_MISSION_CARD_LAYOUT.missionInfoOverlay.mobile
    : CHAPTER_MISSION_CARD_LAYOUT.missionInfoOverlay.desktop
  const chapterMissionQuestPreviewSourcePixelScale =
    chapterMissionQuestPreviewHeight /
    CHAPTER_MISSION_CARD_LAYOUT.baseCanvasHeight
  const chapterMissionQuestPreviewOverlayWidth =
    CHAPTER_MISSION_CARD_LAYOUT.largeOverlayCanvasWidth *
    chapterMissionQuestPreviewSourcePixelScale *
    missionInfoOverlayLayout.scale
  const chapterMissionQuestPreviewOverlayHeight =
    CHAPTER_MISSION_CARD_LAYOUT.largeOverlayCanvasHeight *
    chapterMissionQuestPreviewSourcePixelScale *
    missionInfoOverlayLayout.scale
  const closeChapterMissionQuestPreview = () => {
    if (firstQuestPresentation) {
      closeFirstQuestPresentation()
    }
    openedChapterMissionQuest = null
    requestUiRender()
  }
  const visibleQuests = [
    ...chapterMissionQuests.map(quest => ({ type: 'chapter-mission' as const, quest })),
    ...harvestQuests.map(quest => ({ type: 'harvest-ready' as const, quest })),
    ...craftReadyQuests.map(quest => ({ type: 'craft-ready' as const, quest }))
  ]

  const visibleEntryCount =
    activeInventorySection === 'quests'
      ? visibleQuests.length
      : inventoryEntries.length

  const questNoticeColor = getQuestNoticeColor()
  const inventoryHoverButton =
    hoveredInventoryButton ?? (isMobile() ? tappedInventoryButton : null)
  const seedMenuHoverButton =
    (hoveredSeedMenuControl as 'close' | 'previous' | 'next' | null) ??
    (isMobile() ? tappedSeedMenuButton : null)
  const inventoryInfoScale =
    isMobile() ? MOBILE_UI_CONFIG.inventoryInfoScale : 1
  const inventoryInfoWidth =
    inventoryUi(INVENTORY_INFO.width) * inventoryInfoScale *
    (isMobile() ? MOBILE_UI_CONFIG.inventoryInfoWidthScale : 1)
  const inventoryInfoHeight =
    inventoryUi(INVENTORY_INFO.height) * inventoryInfoScale *
    (isMobile() ? MOBILE_UI_CONFIG.inventoryInfoHeightScale : 1)
  const dropItemButtonWidth = inventoryUi(206) * inventoryInfoScale
  const dropItemButtonHeight = inventoryUi(50) * inventoryInfoScale
  const worldIntroductionScale =
    isMobile()
      ? WORLD_INTRODUCTION_LAYOUT.mobileScale
      : WORLD_INTRODUCTION_LAYOUT.desktopScale
  const chiriDialogueLayout = isMobile()
    ? CHIRI_DIALOGUE_LAYOUT.mobile
    : CHIRI_DIALOGUE_LAYOUT.desktop
  const chiriDialoguePanelTransform = isMobile()
    ? CHIRI_DIALOGUE_PANEL_TRANSFORM.mobile
    : CHIRI_DIALOGUE_PANEL_TRANSFORM.desktop
  const chiriDialogueWidth =
    chiriDialogueLayout.width * chiriDialoguePanelTransform.scale
  const chiriDialogueHeight =
    chiriDialogueLayout.height * chiriDialoguePanelTransform.scale
  const chiriDialogueBubbleWidth =
    chiriDialogueWidth * chiriDialogueLayout.bubbleScale
  const chiriDialogueBubbleHeight =
    chiriDialogueHeight * chiriDialogueLayout.bubbleScale
  const chiriDialogueBubbleLeft =
    (chiriDialogueWidth - chiriDialogueBubbleWidth) / 2 +
    chiriDialogueLayout.bubbleOffsetX
  const chiriDialogueBubbleTop =
    (chiriDialogueHeight - chiriDialogueBubbleHeight) / 2 +
    chiriDialogueLayout.bubbleOffsetY
  const chiriDialogueBubbleBottomOverflow = Math.max(
    0,
    chiriDialogueBubbleTop + chiriDialogueBubbleHeight - chiriDialogueHeight
  )


  return (

    <UiEntity

      uiTransform={{
        width: '100%',
        height: '100%'
      }}

    >

      {UI_TEXTURES_TO_PRELOAD.map(texture => (
        <UiEntity
          key={texture}
          uiTransform={{
            width: 2,
            height: 2,
            positionType: 'absolute',
            position: { left: 0, top: 0 }
          }}
          uiBackground={{
            // Non-zero alpha forces mobile/desktop Explorer to decode the
            // texture instead of culling this preload element entirely.
            color: { r: 1, g: 1, b: 1, a: 0.01 },
            textureMode: 'stretch',
            texture: { src: texture }
          }}
        />
      ))}

      {/* =================================================
          MINI INVENTORY
          ================================================= */}

      {!isInventoryOpen() && (

        <UiEntity

          uiTransform={{
            width:
  miniInventoryUi(140),

height:
  miniInventoryUi(140),
            positionType: 'absolute',

            position: {
              top:
  miniInventoryUi(isMobile() ? MOBILE_UI_CONFIG.miniInventoryTop : 20),

right:
  isMobile()
    ? miniInventoryUi(MOBILE_UI_CONFIG.miniInventoryRight)
    : miniInventoryUi(240)
            }
          }}

          uiBackground={{
            textureMode: 'stretch',

            texture: {
              src:
                'assets/scene/ui/inventory/miniInventory.png'
            }
          }}

          onMouseDown={() => {
            mapOpen = false
            openInventory()
          }}

        >

          {questNoticeColor && (

            <UiEntity

              uiTransform={{
                width: miniInventoryUi(MINI_INVENTORY_NOTICE_STYLE.size),
                height: miniInventoryUi(MINI_INVENTORY_NOTICE_STYLE.size),
                positionType: 'absolute',
                position: {
                  right: miniInventoryUi(MINI_INVENTORY_NOTICE_STYLE.right),
                  top: miniInventoryUi(MINI_INVENTORY_NOTICE_STYLE.top)
                },
                borderRadius: miniInventoryUi(MINI_INVENTORY_NOTICE_STYLE.size / 2)
              }}

              uiBackground={{
                color: {
                  ...questNoticeColor,
                  a: 1
                }
              }}

            />

          )}

        </UiEntity>

      )}


      {/* =================================================
          INVENTORY
          ================================================= */}

      {isInventoryOpen() && (

        <UiEntity

          uiTransform={{
            width: modalBackdropWidth,
            height: modalBackdropHeight,
            positionType: 'absolute',
            position: { left: modalBackdropLeft, top: 0 },
            zIndex: 20
          }}

        >

          {/* FONDO OSCURO */}

          <UiEntity

            uiTransform={{
              width: '100%',
              height: '100%',
              positionType: 'absolute'
            }}

            uiBackground={{
              color: {
                r: 0,
                g: 0,
                b: 0,
                a: 0.5
              }
            }}

          />


          {/* =================================================
    ZONA EXTERIOR PARA CERRAR
    ================================================= */}

<UiEntity

  uiTransform={{
    width: '100%',
    height: '100%',
    positionType: 'absolute',

    position: {
      left: 0,
      top: 0
    }
  }}

  onMouseDown={() => {
    closeInventory()
    cancelGiftSelection()
  }}

/>


          {/* =================================================
              INVENTORY CANVAS
              ================================================= */}

          <UiEntity

            uiTransform={{
              width:
                inventoryUi(1536),

              height:
                inventoryUi(1024),

              positionType: 'absolute',

              position: {
                left: '50%',
                top: '50%'
              },

              margin: {

                left:
                  -inventoryUi(1536) / 2 + modalContentOffsetX,

                top:
                  -inventoryUi(1024) / 2

              }
            }}

            onMouseDown={() => {}}

          >

            {/* FONDO DEL INVENTARIO */}

            <UiEntity

              uiTransform={{
                width:
                inventoryUi(1536),

                height:
                inventoryUi(1024),

                positionType: 'absolute',

                position: {
                  left: 0,
                  top: 0
                }
              }}

              uiBackground={{
                textureMode: 'stretch',

                texture: {
                  src:
                    'assets/scene/ui/inventory/inventory_background.png'
                }
              }}

            />

            <UiEntity

              uiTransform={{
                width: inventoryUi(1536),
                height: inventoryUi(1024),
                positionType: 'absolute',
                position: { left: 0, top: 0 }
              }}

              uiBackground={{
                textureMode: 'stretch',
                texture: { src: INVENTORY_ACTIVE_LAYERS[activeInventorySection] }
              }}

            />

            {inventoryHoverButton && INVENTORY_HOVER_LAYERS[inventoryHoverButton] && (

              <UiEntity

                uiTransform={{
                width: inventoryUi(1536),
                height: inventoryUi(1024),
                  positionType: 'absolute',
                  position: {
                    left: 0,
                    top: 0
                  }
                }}

                uiBackground={{
                  textureMode: 'stretch',
                  texture: {
                    src: INVENTORY_HOVER_LAYERS[inventoryHoverButton]
                  }
                }}

              />

            )}

            {pressedInventoryButton && (

              <UiEntity

                uiTransform={{
                width: inventoryUi(1536),
                height: inventoryUi(1024),
                  positionType: 'absolute',
                  position: { left: 0, top: 0 }
                }}

                uiBackground={{
                  textureMode: 'stretch',
                  texture: { src: INVENTORY_PRESSED_LAYERS[pressedInventoryButton] }
                }}

              />

            )}

{/* =================================================
    MASK HITBOXES
    ================================================= */}

{renderInventoryButton(

  'farming',

  INVENTORY_MASK_REGIONS.TAB_FARMING,

  'assets/scene/ui/inventory/buttons/farming_glow.png',

  'assets/scene/ui/inventory/buttons/farming_active.png',

  () => {

    setInventoryInfo(UI_INFO.farming)

  }

)}

{renderInventoryButton(

  'inventory',

  INVENTORY_MASK_REGIONS.TAB_INVENTORY,

  'assets/scene/ui/inventory/buttons/inventory_glow.png',

  'assets/scene/ui/inventory/buttons/inventory_active.png',

  () => {

    setInventoryInfo(UI_INFO.inventory)

  }

)}

{renderInventoryButton(

  'cooking',

  INVENTORY_MASK_REGIONS.TAB_COOKING,

  'assets/scene/ui/inventory/buttons/cooking_glow.png',

  'assets/scene/ui/inventory/buttons/cooking_active.png',

  () => {

    setInventoryInfo(UI_INFO.cooking)

  }

)}

{renderInventoryButton(

  'quests',

  INVENTORY_MASK_REGIONS.TAB_QUESTS,

  'assets/scene/ui/inventory/buttons/quests_glow.png',

  'assets/scene/ui/inventory/buttons/quests_active.png',

  () => {

    setInventoryInfo(UI_INFO.quests)

    markQuestNoticesSeen()
    requestUiRender()

  }

)}




            {/* =================================================
                10 SLOTS
                ================================================= */}

            {INVENTORY_LAYOUT.slots.map(
              (slot, index) => {

                const entry =
  inventoryEntries[
    inventoryPage * 10 + index
  ]

                const itemId =
                  entry
                    ? entry[0]
                    : null

                const quantity =
                  entry
                    ? Number(entry[1])
                    : 0

                return renderInventorySlot(
                  slot,
                  itemId,
                  quantity,
                  hoveredInventorySlot === index ||
                    selectedInventorySlot === index
                )

              }
            )}

            {activeInventorySection === 'quests' && (

              visibleQuests
                .slice(inventoryPage * 10, inventoryPage * 10 + 10)
                .map((visibleQuest, index) =>
                  visibleQuest.type === 'chapter-mission'
                    ? renderChapterMissionQuestCard(
                        INVENTORY_LAYOUT.slots[index],
                        visibleQuest.quest,
                        hoveredInventorySlot === index ||
                          selectedInventorySlot === index
                      )
                    : visibleQuest.type === 'harvest-ready'
                    ? renderHarvestQuestCard(
                        INVENTORY_LAYOUT.slots[index],
                        visibleQuest.quest,
                        hoveredInventorySlot === index ||
                          selectedInventorySlot === index
                      )
                    : renderInventorySlot(
                        INVENTORY_LAYOUT.slots[index],
                        visibleQuest.quest.itemId,
                        1,
                        hoveredInventorySlot === index ||
                          selectedInventorySlot === index
                      )
                )

            )}

            {INVENTORY_LAYOUT.slots.map(
  (slot, index) => {

    const entry =
      inventoryEntries[
        inventoryPage * 10 + index
      ]

    const itemId =
      entry
        ? entry[0]
        : null

    if (!itemId) {
      return null
    }

    const region =
      INVENTORY_MASK_REGIONS[
        `SLOT_${index + 1}` as keyof typeof INVENTORY_MASK_REGIONS
      ]

    return (

      <UiEntity

        uiTransform={{

          width:
            inventoryUi(region.width),

          height:
            inventoryUi(region.height),

          positionType:
            'absolute',

          position: {

            left:
              inventoryUi(region.x),

            top:
              inventoryUi(region.y)

          }

        }}

        onMouseDown={() => {

          selectedInventorySlot = index
          requestUiRender()

          const item = ITEM_DATA[itemId]
          setInventoryInfo(
            item
              ? item.showDimensionInInfo === false
                ? item.info
                : `${item.info}\nFrom ${getItemDimensionLabel(item.dimension)}`
              : 'This item is part of your collection.'
          )

        }}

        onMouseEnter={() => {
          if (hoveredInventorySlot !== index) {
            hoveredInventorySlot = index
            requestUiRender()
          }
        }}

        onMouseLeave={() => {
          if (hoveredInventorySlot !== null) {
            hoveredInventorySlot = null
            requestUiRender()
          }
        }}

      />

    )

  }
)}

{activeInventorySection === 'quests' && (

  visibleQuests
    .slice(inventoryPage * 10, inventoryPage * 10 + 10)
    .map((visibleQuest, index) => {
      const region =
        INVENTORY_MASK_REGIONS[
          `SLOT_${index + 1}` as keyof typeof INVENTORY_MASK_REGIONS
        ]

      return (

        <UiEntity

          uiTransform={{
            width: inventoryUi(region.width),
            height: inventoryUi(region.height),
            positionType: 'absolute',
            position: {
              left: inventoryUi(region.x),
              top: inventoryUi(region.y)
            }
          }}

          onMouseEnter={() => {
            if (hoveredInventorySlot !== index) {
              hoveredInventorySlot = index
              requestUiRender()
            }
          }}

          onMouseLeave={() => {
            if (hoveredInventorySlot !== null) {
              hoveredInventorySlot = null
              requestUiRender()
            }
          }}

          onMouseDown={() => {
            selectedInventorySlot = index
            if (visibleQuest.type === 'chapter-mission') {
              openedChapterMissionQuest = visibleQuest.quest
            }

            setInventoryInfo(
              visibleQuest.type === 'chapter-mission'
                ? visibleQuest.quest.info
                : visibleQuest.type === 'harvest-ready'
                ? `Harvest ${visibleQuest.quest.readyPlotIds.length} ready ${getCrop(visibleQuest.quest.cropId).displayName}`
                : visibleQuest.quest.info
            )
            requestUiRender()
          }}

        />

      )
    })

)}

{renderInventoryButton(

  'previous',

  INVENTORY_MASK_REGIONS.PREVIOUS,

  undefined,

  undefined,

  () => {

    if (inventoryPage > 0) {

      inventoryPage--
      selectedInventorySlot = null

    }

  }

)}

{renderInventoryButton(

  'next',

  INVENTORY_MASK_REGIONS.NEXT,

  undefined,

  undefined,

  () => {

    const totalPages =
      Math.ceil(
        visibleEntryCount / 10
      )

    if (
      inventoryPage <
      totalPages - 1
    ) {

      inventoryPage++
      selectedInventorySlot = null

    }

  }

)}



{/* =================================================
    INFO
    ================================================= */}

<Label
  value={infoText}
  uiTransform={{
    width: inventoryInfoWidth,
    height: inventoryInfoHeight,
    positionType: 'absolute',
    position: {
      left: inventoryUi(INVENTORY_INFO.center.x) - inventoryInfoWidth / 2,
      top:
        inventoryUi(INVENTORY_INFO.center.y) -
        inventoryInfoHeight / 2 +
        (isMobile() ? MOBILE_UI_CONFIG.inventoryInfoOffsetY : 0)
    }
  }}
        font="sans-serif"
  fontSize={
    inventoryUi(INVENTORY_INFO.fontSize) * inventoryInfoScale +
    (isMobile() ? MOBILE_UI_CONFIG.inventoryInfoFontSizeOffset : 0)
  }
  textAlign="middle-center"
/>

{!giftMode && selectedInventoryItemId && canDropHouseFurnitureItem(selectedInventoryItemId) && (
  <UiEntity
    uiTransform={{
      width: dropItemButtonWidth,
      height: dropItemButtonHeight,
      positionType: 'absolute',
      position: {
        left: inventoryUi(INVENTORY_INFO.center.x) - dropItemButtonWidth / 2,
        top:
          inventoryUi(INVENTORY_INFO.center.y) + inventoryInfoHeight / 2 -
          dropItemButtonHeight / 2 +
          (isMobile() ? MOBILE_UI_CONFIG.inventoryInfoOffsetY : 0)
      },
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: inventoryUi(18),
      pointerFilter: 'block'
    }}
    uiBackground={{ color: { r: 0.16, g: 0.65, b: 0.91, a: 1 } }}
    onMouseDown={() => {
      const dropped = isPlayerInsideSharedZone()
        ? dropFurnitureInSharedZone(selectedInventoryItemId)
        : dropHouseFurnitureItem(selectedInventoryItemId)
      if (!dropped) return
      selectedInventorySlot = null
      closeInventory()
      requestUiRender()
    }}
  >
    <Label
      value="DROP ITEM"
      color={{ r: 1, g: 1, b: 1, a: 1 }}
      font="sans-serif"
      fontSize={inventoryUi(22) * inventoryInfoScale}
      textAlign="middle-center"
      uiTransform={{ width: '100%', height: '100%', pointerFilter: 'none' }}
    />
  </UiEntity>
)}

{giftMode && selectedInventoryItemId && isGiftableItem(selectedInventoryItemId) && (
  <UiEntity
    uiTransform={{
      width: inventoryInfoWidth,
      height: inventoryInfoHeight,
      positionType: 'absolute',
      position: {
        left: inventoryUi(INVENTORY_INFO.center.x) - inventoryInfoWidth / 2,
        top: inventoryUi(INVENTORY_INFO.center.y) - inventoryInfoHeight / 2 +
          (isMobile() ? MOBILE_UI_CONFIG.inventoryInfoOffsetY : 0)
      },
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: inventoryUi(20),
      pointerFilter: 'block'
    }}
    uiBackground={{ color: { r: .18, g: .62, b: .91, a: .98 } }}
    onMouseDown={() => {
      if (!sendSelectedGift(selectedInventoryItemId)) return
      selectedInventorySlot = null
      requestUiRender()
    }}
  >
    <Label
      value={`SEND GIFT\nTO ${getGiftTarget()?.name.toUpperCase() ?? 'CHIRI'}`}
      color={{ r: 1, g: 1, b: 1, a: 1 }}
      font="sans-serif"
      fontSize={inventoryUi(24) * inventoryInfoScale}
      textAlign="middle-center"
      uiTransform={{ width: '100%', height: '100%', pointerFilter: 'none' }}
    />
  </UiEntity>
)}

            {/* =================================================
                BOTÓN X
                ================================================= */}

            {renderInventoryButton(

  'close',

  INVENTORY_MASK_REGIONS.CLOSE,

  undefined,

  undefined,

  () => {

    closeInventory()
    cancelGiftSelection()

  }

)}

          </UiEntity>

        </UiEntity>

      )}


      {/* =================================================
          SEED MENU
          ================================================= */}

      {isPlantMenuOpen() && !isInventoryOpen() && (

        <UiEntity

          uiTransform={{
            width: modalBackdropWidth,
            height: modalBackdropHeight,
            positionType: 'absolute',
            position: { left: modalBackdropLeft, top: 0 },
            zIndex: 20
          }}

        >

          <UiEntity

            uiTransform={{
              width: '100%',
              height: '100%',
              positionType: 'absolute'
            }}

            uiBackground={{
              color: {
                r: 0,
                g: 0,
                b: 0,
                a: 0.55
              }
            }}

            onMouseDown={() => {
              hidePlantMenu()
            }}

          />

          <UiEntity

            uiTransform={{
              width: seedMenuUi(820),
              height: seedMenuUi(853),
              positionType: 'absolute',
              position: {
                left: '50%',
                top: '50%'
              },
              margin: {
                left: seedMenuUi(-410) + modalContentOffsetX,
                top: seedMenuUi(-426.5)
              }
            }}

            uiBackground={{
              textureMode: 'stretch',
              texture: {
                src: 'assets/scene/ui/seed-menu/seedmenu_background.png'
              }
            }}

            onMouseDown={() => {}}

          >

            {seedMenuHoverButton && SEED_MENU_HOVER_LAYERS[seedMenuHoverButton] && (

              <UiEntity

                uiTransform={{
                  width: seedMenuUi(820),
                  height: seedMenuUi(853),
                  positionType: 'absolute',
                  position: { left: 0, top: 0 }
                }}

                uiBackground={{
                  textureMode: 'stretch',
                  texture: {
                    src: SEED_MENU_HOVER_LAYERS[seedMenuHoverButton]
                  }
                }}

              />

            )}

            {pressedSeedMenuButton && (

              <UiEntity

                uiTransform={{
                  width: seedMenuUi(820),
                  height: seedMenuUi(853),
                  positionType: 'absolute',
                  position: { left: 0, top: 0 }
                }}

                uiBackground={{
                  textureMode: 'stretch',
                  texture: { src: SEED_MENU_PRESSED_LAYERS[pressedSeedMenuButton] }
                }}

              />

            )}

            {(() => {
              const seedCrops = getAllCrops().filter(
                crop => (inventoryItems[crop.seedItem] ?? 0) > 0
              )

              const totalPages = Math.max(1, Math.ceil(seedCrops.length / 4))
              const currentPage = Math.min(seedMenuPage, totalPages - 1)
              const pageCrops = seedCrops.slice(currentPage * 4, currentPage * 4 + 4)
              const slotRegions = [
                SEED_MENU_MASK_REGIONS.SLOT_1,
                SEED_MENU_MASK_REGIONS.SLOT_2,
                SEED_MENU_MASK_REGIONS.SLOT_3,
                SEED_MENU_MASK_REGIONS.SLOT_4
              ]

              return pageCrops.map((crop, index) => {
              const amount = inventoryItems[crop.seedItem] ?? 0
              const region = slotRegions[index]
              const slotLayout = SEED_MENU_LAYOUT.slots[index]
              const seedItemData = ITEM_DATA[crop.seedItem]

              return (

                <UiEntity

                  key={crop.id}

                  uiTransform={{
                    width: seedMenuUi(region.width),
                    height: seedMenuUi(region.height),
                    positionType: 'absolute',
                    position: {
                      left: seedMenuUi(region.x),
                      top: seedMenuUi(region.y)
                    }
                  }}

                >

                  <UiEntity

                    uiTransform={{
                      width: seedMenuUi(SEED_MENU_STYLE.itemBackgroundSize),
                      height: seedMenuUi(SEED_MENU_STYLE.itemBackgroundSize),
                      positionType: 'absolute',
                      position: {
                        left: seedMenuUi(115 - SEED_MENU_STYLE.itemBackgroundSize / 2),
                        top:
                          seedMenuUi(119.5 - SEED_MENU_STYLE.itemBackgroundSize / 2 +
                          SEED_MENU_STYLE.itemBackgroundOffsetY)
                      }
                    }}

                    uiBackground={{
                      textureMode: 'stretch',
                      texture: {
                        src: seedItemData
                          ? ITEM_SLOT_BACKGROUNDS[getItemSlotCategory(seedItemData)]
                          : ITEM_BACKGROUND
                      }
                    }}

                  />

                  {(hoveredSeedMenuControl === `slot-${index}` ||
                    (isMobile() && pressedSeedMenuSlot === index)) && (

                    <UiEntity

                      uiTransform={{
                        width: seedMenuUi(SEED_MENU_STYLE.itemHoverSize),
                        height: seedMenuUi(SEED_MENU_STYLE.itemHoverSize),
                        positionType: 'absolute',
                        position: {
                          left: seedMenuUi(115 - SEED_MENU_STYLE.itemHoverSize / 2),
                          top:
                            seedMenuUi(119.5 - SEED_MENU_STYLE.itemHoverSize / 2 +
                            SEED_MENU_STYLE.itemHoverOffsetY)
                        }
                      }}

                      uiBackground={{
                        textureMode: 'stretch',
                        texture: {
                          src: 'assets/scene/ui/inventory/layers/item_hover.png'
                        }
                      }}

                    />

                  )}

                  {amount > 0 && (

                    <UiEntity

                      uiTransform={{
                        width: seedMenuUi(SEED_MENU_STYLE.itemBackgroundSize),
                        height: seedMenuUi(SEED_MENU_STYLE.itemBackgroundSize),
                        positionType: 'absolute',
                        position: {
                          left:
                            seedMenuUi(115 - SEED_MENU_STYLE.itemBackgroundSize / 2 +
                            SEED_MENU_STYLE.quantityCircleOffsetX),
                          top:
                            seedMenuUi(119.5 - SEED_MENU_STYLE.itemBackgroundSize / 2 +
                            SEED_MENU_STYLE.quantityCircleOffsetY)
                        }
                      }}

                      uiBackground={{
                        textureMode: 'stretch',
                        texture: { src: QUANTITY_CIRCLE_TEXTURE }
                      }}

                    />

                  )}

                  <UiEntity

                    uiTransform={{
                      width: seedMenuUi(SEED_MENU_STYLE.itemSize),
                      height: seedMenuUi(SEED_MENU_STYLE.itemSize),
                      positionType: 'absolute',
                      position: {
                        left:
                          seedMenuUi(slotLayout.item.x - region.x -
                          SEED_MENU_STYLE.itemSize / 2),
                        top:
                          seedMenuUi(slotLayout.item.y - region.y -
                          SEED_MENU_STYLE.itemSize / 2 +
                          SEED_MENU_STYLE.itemOffsetY)
                      }
                    }}

                    uiBackground={{
                      textureMode: 'stretch',
                      texture: {
                        src: ITEM_DATA[crop.seedItem]?.icon
                      }
                    }}

                  />

                  <Label

                    value={String(amount)}

                    uiTransform={{
                      width: seedMenuUi(SEED_MENU_STYLE.quantityWidth),
                      height: seedMenuUi(SEED_MENU_STYLE.quantityHeight),
                      positionType: 'absolute',
                      position: {
                        left:
                          seedMenuUi(slotLayout.quantity.x - region.x -
                          SEED_MENU_STYLE.quantityWidth / 2),
                        top:
                          seedMenuUi(slotLayout.quantity.y - region.y -
                          SEED_MENU_STYLE.quantityHeight / 2 +
                          SEED_MENU_STYLE.quantityOffsetY)
                      }
                    }}

                    font={INVENTORY_TEXT_STYLE.quantity.font}
                    fontSize={seedMenuUi(SEED_MENU_STYLE.quantityFontSize)}
                    textAlign="middle-center"

                  />

                  <Label

                    value={ITEM_DATA[crop.seedItem]?.name ?? crop.displayName}

                    uiTransform={{
                      width: seedMenuUi(SEED_MENU_STYLE.itemNameWidth),
                      height: seedMenuUi(SEED_MENU_STYLE.itemNameHeight),
                      positionType: 'absolute',
                      position: {
                        left:
                          seedMenuUi(slotLayout.name.x - region.x -
                          SEED_MENU_STYLE.itemNameWidth / 2),
                        top:
                          seedMenuUi(slotLayout.name.y - region.y -
                          SEED_MENU_STYLE.itemNameHeight / 2 +
                          SEED_MENU_STYLE.itemNameOffsetY)
                      }
                    }}

                    font={INVENTORY_TEXT_STYLE.itemName.font}
                    fontSize={seedMenuUi(SEED_MENU_STYLE.itemNameFontSize)}
                    textAlign="middle-center"

                  />

                  <UiEntity

                    uiTransform={{
                      width: '100%',
                      height: '100%',
                      positionType: 'absolute'
                    }}

                    onMouseEnter={() => {
                      const control = `slot-${index}`
                      if (hoveredSeedMenuControl !== control) {
                        hoveredSeedMenuControl = control
                        requestUiRender()
                      }
                    }}

                    onMouseLeave={() => {
                      if (hoveredSeedMenuControl !== null) {
                        hoveredSeedMenuControl = null
                        requestUiRender()
                      }
                    }}

                    onMouseDown={() => {
                      const plotId = getSelectedPlot()

                      if (plotId === null) {
                        return
                      }

                      if (isMobile()) {
                        if (isMobileSeedTapPending) {
                          return
                        }

                        isMobileSeedTapPending = true
                        pressedSeedMenuSlot = index
                        requestUiRender()

                        setTimeout(() => {
                          plantCrop(plotId, crop.id)
                          pressedSeedMenuSlot = null
                          isMobileSeedTapPending = false
                          hidePlantMenu()
                          requestUiRender()
                        }, MOBILE_ITEM_TAP_FEEDBACK_MS)

                        return
                      }

                      plantCrop(plotId, crop.id)
                      hidePlantMenu()
                    }}

                  />

                </UiEntity>

              )
            })
            })()}

            {renderSeedMenuHitbox(
              SEED_MENU_MASK_REGIONS.CLOSE,
              hidePlantMenu,
              'close'
            )}

            {renderSeedMenuHitbox(
              SEED_MENU_MASK_REGIONS.PREVIOUS,
              () => {
                if (seedMenuPage > 0) {
                  seedMenuPage--
                  requestUiRender()
                }
              },
              'previous'
            )}

            {renderSeedMenuHitbox(
              SEED_MENU_MASK_REGIONS.NEXT,
              () => {
                const seedCount = getAllCrops().filter(
                  crop => (inventoryItems[crop.seedItem] ?? 0) > 0
                ).length
                const totalPages = Math.ceil(seedCount / 4)

                if (seedMenuPage < totalPages - 1) {
                  seedMenuPage++
                  requestUiRender()
                }
              },
              'next'
            )}

          </UiEntity>

        </UiEntity>

      )}


      {/* =================================================
          MINI MAP
          ================================================= */}

      {magicMapUnlocked && !mapOpen && !isPlantMenuOpen() && (

        <UiEntity

          uiTransform={{
            width:
  miniMapUi(140),

height:
  miniMapUi(140),
            positionType: 'absolute',
            zIndex: 1,

            position: {
              top:
  miniMapUi(isMobile() ? MOBILE_UI_CONFIG.miniMapTop : 20),

right:
  isMobile()
    ? miniMapUi(MOBILE_UI_CONFIG.miniMapRight)
    : miniMapUi(80)
            }
          }}

          uiBackground={{
            textureMode: 'stretch',

            texture: {
              src:
                'assets/scene/ui/minimap.png'
            }
          }}

          onMouseDown={
            isInventoryOpen()
              ? undefined
              : () => {
                  if (!isMagicMapUnlocked()) return
                  mapOpen = true
                }
          }

        />

      )}


      {/* =================================================
          MAP
          ================================================= */}

      {magicMapUnlocked && mapOpen && (

        <UiEntity

          uiTransform={{
            width: modalBackdropWidth,
            height: modalBackdropHeight,
            positionType: 'absolute',
            position: { left: modalBackdropLeft, top: 0 },
            zIndex: 20
          }}

        >

          {/* FONDO OSCURO */}

          <UiEntity

            uiTransform={{
              width: '100%',
              height: '100%',
              positionType: 'absolute'
            }}

            uiBackground={{
              color: {
                r: 0,
                g: 0,
                b: 0,
                a: 0.5
              }
            }}

          />


          {/* CERRAR ARRIBA */}

          <UiEntity

            uiTransform={{
              width: '100%',
              height: '10%',
              positionType: 'absolute',

              position: {
                top: 0
              }
            }}

            onMouseDown={() => {
              mapOpen = false
            }}

          />


          {/* CERRAR ABAJO */}

          <UiEntity

            uiTransform={{
              width: '100%',
              height: '10%',
              positionType: 'absolute',

              position: {
                bottom: 0
              }
            }}

            onMouseDown={() => {
              mapOpen = false
            }}

          />


          {/* CERRAR IZQUIERDA */}

          <UiEntity

            uiTransform={{
              width: '15%',
              height: '100%',
              positionType: 'absolute',

              position: {
                left: 0
              }
            }}

            onMouseDown={() => {
              mapOpen = false
            }}

          />


          {/* CERRAR DERECHA */}

          <UiEntity

            uiTransform={{
              width: '15%',
              height: '100%',
              positionType: 'absolute',

              position: {
                right: 0
              }
            }}

            onMouseDown={() => {
              mapOpen = false
            }}

          />


          {/* MAPA */}

          <UiEntity

            uiTransform={{
              width:
  mapUi(1200),

height:
  mapUi(900),

              positionType: 'absolute',

              position: {
                left: '50%',
                top: '50%'
              },

              margin: {
  left:
    mapUi(-600) + modalContentOffsetX,

  top:
    mapUi(-450)
}

            }}

          >

            {/* IMAGEN DEL MAPA */}

            <UiEntity

              uiTransform={{
                width: '100%',
                height: '100%'
              }}

              uiBackground={{
                textureMode: 'stretch',

                texture: {
                  src:
                    'assets/scene/ui/world_map.png'
                }
              }}

            />


            {/* X */}

            <UiEntity

              uiTransform={{
                width: mapUi(80),
                height: mapUi(80),
                positionType: 'absolute',

                position: {
                  left: mapUi(1080),
                  top: mapUi(25)
                }
              }}

              onMouseDown={() => {
                mapOpen = false
              }}

            />


            {/* CHIRI HOUSE */}

            <UiEntity
              uiTransform={{
                width: mapUi(650),
                height: mapUi(220),
                positionType: 'absolute',
                position: {
                  left: mapUi(250),
                  top: mapUi(80)
                }
              }}
              onMouseDown={() => {
                mapOpen = false
                teleportToChiriHouse()
              }}
            />

            <UiEntity
              uiTransform={{
                width: mapUi(700),
                height: mapUi(220),
                positionType: 'absolute',
                position: {
                  left: mapUi(220),
                  top: mapUi(260)
                }
              }}
              onMouseDown={() => {
                mapOpen = false
                teleportToChiriHouse()
              }}
            />

            <UiEntity
              uiTransform={{
                width: mapUi(500),
                height: mapUi(180),
                positionType: 'absolute',
                position: {
                  left: mapUi(350),
                  top: mapUi(460)
                }
              }}
              onMouseDown={() => {
                mapOpen = false
                teleportToChiriHouse()
              }}
            />


            {/* CLOUD MOUNTAIN */}

            <UiEntity
              uiTransform={{
                width: mapUi(430),
                height: mapUi(380),
                positionType: 'absolute',
                position: {
                  left: mapUi(80),
                  top: mapUi(420)
                }
              }}
              onMouseDown={() => {
                mapOpen = false
                teleportToCloudMountain()
              }}
            />

            <UiEntity
              uiTransform={{
                width: mapUi(320),
                height: mapUi(180),
                positionType: 'absolute',
                position: {
                  left: mapUi(120),
                  top: mapUi(760)
                }
              }}
              onMouseDown={() => {
                mapOpen = false
                teleportToCloudMountain()
              }}
            />


            {/* WOLF ISLAND */}

            <UiEntity
              uiTransform={{
                width: mapUi(520),
                height: mapUi(260),
                positionType: 'absolute',
                position: {
                  left: mapUi(560),
                  top: mapUi(620)
                }
              }}
              onMouseDown={() => {
                mapOpen = false
                teleportToWolfIsland()
              }}
            />

            <UiEntity
              uiTransform={{
                width: mapUi(430),
                height: mapUi(140),
                positionType: 'absolute',
                position: {
                  left: mapUi(620),
                  top: mapUi(520)
                }
              }}
              onMouseDown={() => {
                mapOpen = false
                teleportToWolfIsland()
              }}
            />


            {/* NORTH ISLAND */}

            <UiEntity
              uiTransform={{
                width: mapUi(220),
                height: mapUi(150),
                positionType: 'absolute',
                position: {
                  left: mapUi(100),
                  top: mapUi(70)
                }
              }}
              onMouseDown={() => {
                mapOpen = false
                teleportToNorthIsland()
              }}
            />


            {/* EAST ISLAND */}

            <UiEntity
              uiTransform={{
                width: mapUi(150),
                height: mapUi(180),
                positionType: 'absolute',
                position: {
                  left: mapUi(930),
                  top: mapUi(360)
                }
              }}
              onMouseDown={() => {
                mapOpen = false
                teleportToEastIsland()
              }}
            />


            {/* SKY ISLAND */}

            <UiEntity
              uiTransform={{
                width: mapUi(120),
                height: mapUi(110),
                positionType: 'absolute',
                position: {
                  left: mapUi(870),
                  top: mapUi(80)
                }
              }}
              onMouseDown={() => {
                mapOpen = false
                teleportToSkyIsland()
              }}
            />

          </UiEntity>

        </UiEntity>

      )}

      {isWorldIntroductionVisible() && (
        <UiEntity
          uiTransform={{
            width: modalBackdropWidth,
            height: modalBackdropHeight,
            positionType: 'absolute',
            position: { left: modalBackdropLeft, top: 0 },
            zIndex: 30
          }}
          uiBackground={{ color: { r: 0, g: 0, b: 0, a: 0.55 } }}
          onMouseDown={closeWorldIntroduction}
        >
          <UiEntity
            uiTransform={{
              width: WORLD_INTRODUCTION_LAYOUT.width * worldIntroductionScale,
              height: WORLD_INTRODUCTION_LAYOUT.height * worldIntroductionScale,
              positionType: 'absolute',
              position: { left: '50%', top: '50%' },
              margin: {
                left:
                  -WORLD_INTRODUCTION_LAYOUT.width * worldIntroductionScale / 2 +
                  modalContentOffsetX,
                top: -WORLD_INTRODUCTION_LAYOUT.height * worldIntroductionScale / 2
              }
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: { src: WORLD_INTRODUCTION_IMAGE }
            }}
            onMouseDown={closeWorldIntroduction}
          />
        </UiEntity>
      )}

      {chapterMissionCompletion && (
        <UiEntity
          uiTransform={{
            width: modalBackdropWidth,
            height: modalBackdropHeight,
            positionType: 'absolute',
            position: { left: modalBackdropLeft, top: 0 },
            // Mission completion must stay above a newly-unlocked mission's
            // translucent presentation backdrop.
            zIndex: 34
          }}
          uiBackground={{ color: { r: 0, g: 0, b: 0, a: 0.5 } }}
          onMouseDown={closeChapterMissionCompletion}
        >
          <UiEntity
            uiTransform={{
              width: chapterMissionCompletionWidth,
              height: chapterMissionCompletionHeight,
              positionType: 'absolute',
              position: { left: '50%', top: '50%' },
              margin: {
                left: -chapterMissionCompletionWidth / 2,
                top: -chapterMissionCompletionHeight / 2
              }
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: {
                src: getChapterMissionQuestOverlay(
                  chapterMissionCompletion.chapter,
                  chapterMissionCompletion.mission
                )
              }
            }}
            onMouseDown={closeChapterMissionCompletion}
          >
            <UiEntity
              uiTransform={{
                width: chapterMissionCompletionWidth,
                height: chapterMissionCompletionHeight,
                positionType: 'absolute',
                position: { left: 0, top: 0 }
              }}
              uiBackground={{
                textureMode: 'stretch',
                texture: {
                  src: getChapterMissionProgressOverlay(
                    getChapterMissionCompletionProgressIndex(
                      chapterMissionCompletion.chapter
                    )
                  )
                }
              }}
              onMouseDown={closeChapterMissionCompletion}
            />
            <UiEntity
              uiTransform={{
                width: chapterMissionCompletionOverlayWidth,
                height: chapterMissionCompletionOverlayHeight,
                positionType: 'absolute',
                position: {
                  left:
                    chapterMissionCompletionWidth / 2 -
                    chapterMissionCompletionOverlayWidth / 2 +
                    missionCompleteOverlayLayout.offsetX,
                  top:
                    chapterMissionCompletionHeight / 2 -
                    chapterMissionCompletionOverlayHeight / 2 +
                    missionCompleteOverlayLayout.offsetY
                }
              }}
              uiBackground={{
                textureMode: 'stretch',
                texture: { src: CHAPTER_MISSION_COMPLETE_OVERLAY }
              }}
              onMouseDown={closeChapterMissionCompletion}
            />
          </UiEntity>
        </UiEntity>
      )}

      {chapterCompletedPresentation && (
        <UiEntity
          uiTransform={{
            width: modalBackdropWidth,
            height: modalBackdropHeight,
            positionType: 'absolute',
            position: { left: modalBackdropLeft, top: 0 },
            zIndex: 32
          }}
          uiBackground={{ color: { r: 0, g: 0, b: 0, a: 0.55 } }}
          onMouseDown={closeChapterCompletedPresentation}
        >
          <UiEntity
            uiTransform={{
              width: chapterCompletedWidth,
              height: chapterCompletedHeight,
              positionType: 'absolute',
              position: { left: '50%', top: '50%' },
              margin: {
                left:
                  -chapterCompletedWidth / 2 +
                  chapterCompletedLayout.offsetX,
                top:
                  -chapterCompletedHeight / 2 +
                  chapterCompletedLayout.offsetY
              }
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: {
                src: getChapterCompletedQuestOverlay(
                  chapterCompletedPresentation.chapter
                )
              }
            }}
            onMouseDown={closeChapterCompletedPresentation}
          />
        </UiEntity>
      )}

      {chapterMissionQuestPreview && (
        <UiEntity
          uiTransform={{
            width: modalBackdropWidth,
            height: modalBackdropHeight,
            positionType: 'absolute',
            position: { left: modalBackdropLeft, top: 0 },
            zIndex: 32
          }}
          // The full-screen hitbox deliberately consumes the tap,
          // so the Inventory below cannot receive a click while the mission
          // card is being inspected.
          uiBackground={{ color: { r: 0, g: 0, b: 0, a: 0.5 } }}
          onMouseDown={closeChapterMissionQuestPreview}
        >
          <UiEntity
            uiTransform={{
              width: chapterMissionQuestPreviewWidth,
              height: chapterMissionQuestPreviewHeight,
              positionType: 'absolute',
              position: { left: '50%', top: '50%' },
              margin: {
                left: -chapterMissionQuestPreviewWidth / 2,
                top: -chapterMissionQuestPreviewHeight / 2
              }
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: {
                src: getChapterMissionQuestOverlay(
                  chapterMissionQuestPreview.chapter,
                  chapterMissionQuestPreview.mission
                )
              }
            }}
            onMouseDown={closeChapterMissionQuestPreview}
          >
            {/* Both the automatic presentation and click-open preview keep the
                progress counter. The larger misionN description belongs only
                to Chapter 1 and is positioned independently below. */}
            <UiEntity
              uiTransform={{
                width: chapterMissionQuestPreviewWidth,
                height: chapterMissionQuestPreviewHeight,
                positionType: 'absolute',
                position: { left: 0, top: 0 },
                pointerFilter: 'none'
              }}
              uiBackground={{
                textureMode: 'stretch',
                texture: {
                  src: getChapterMissionProgressOverlay(
                    getChapterMissionProgressIndex(
                      chapterMissionQuestPreview.chapter
                    )
                  )
                }
              }}
            />
            {chapterMissionQuestPreview.chapter === 1 && <UiEntity
              uiTransform={{
                width: chapterMissionQuestPreviewOverlayWidth,
                height: chapterMissionQuestPreviewOverlayHeight,
                positionType: 'absolute',
                position: {
                  left:
                    chapterMissionQuestPreviewWidth / 2 -
                    chapterMissionQuestPreviewOverlayWidth / 2 +
                    missionInfoOverlayLayout.offsetX,
                  top:
                    chapterMissionQuestPreviewHeight / 2 -
                    chapterMissionQuestPreviewOverlayHeight / 2 +
                    missionInfoOverlayLayout.offsetY
                }
              }}
              uiBackground={{
                textureMode: 'stretch',
                texture: {
                  src: getChapterMissionNumberOverlay(
                    chapterMissionQuestPreview.mission
                  )
                }
              }}
              onMouseDown={closeChapterMissionQuestPreview}
            />}
          </UiEntity>
        </UiEntity>
      )}

      {isChiriDialogueVisible() && (
        <UiEntity
          uiTransform={{
            width: chiriDialogueWidth,
            height: chiriDialogueHeight,
            positionType: 'absolute',
            position: isMobile()
              ? {
                  left: '50%',
                  bottom:
                    chiriDialoguePanelTransform.bottomMargin +
                    chiriDialogueBubbleBottomOverflow -
                    chiriDialoguePanelTransform.offsetY
                }
              : { left: '50%', top: '50%' },
            margin: isMobile()
              ? {
                  left:
                    -chiriDialogueWidth / 2 +
                    chiriDialoguePanelTransform.offsetX
                }
              : {
                  left:
                    -chiriDialogueWidth / 2 +
                    chiriDialoguePanelTransform.offsetX,
                  top:
                    -chiriDialogueHeight / 2 +
                    chiriDialoguePanelTransform.offsetY
                },
            zIndex: 30
          }}
          onMouseDown={advanceChiriDialogue}
        >
          <UiEntity
            uiTransform={{
              width: chiriDialogueBubbleWidth,
              height: chiriDialogueBubbleHeight,
              positionType: 'absolute',
              position: {
                left: chiriDialogueBubbleLeft,
                top: chiriDialogueBubbleTop
              }
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: { src: CHIRI_DIALOGUE_BUBBLE }
            }}
          />
          <Label
            value="CHIRI"
            uiTransform={{
              width: '100%',
              height: 30 * chiriDialoguePanelTransform.scale,
              positionType: 'absolute',
              position: {
                left: 0,
                top: chiriDialogueLayout.titleTop * chiriDialoguePanelTransform.scale
              }
            }}
            font="sans-serif"
            fontSize={chiriDialogueLayout.titleFontSize * chiriDialoguePanelTransform.scale}
            color={{ r: 1, g: 0.42, b: 0.68, a: 1 }}
            textAlign="middle-center"
          />
          <Label
            value={getChiriDialogueText()}
            uiTransform={{
              width: `${chiriDialogueLayout.bodyWidthPercent}%`,
              height: (isMobile() ? 74 : 62) * chiriDialoguePanelTransform.scale,
              positionType: 'absolute',
              position: {
                left: `${chiriDialogueLayout.bodyLeftPercent}%`,
                top: chiriDialogueLayout.bodyTop * chiriDialoguePanelTransform.scale
              }
            }}
            font="sans-serif"
            fontSize={chiriDialogueLayout.bodyFontSize * chiriDialoguePanelTransform.scale}
            color={{ r: 1, g: 1, b: 1, a: 1 }}
            textAlign="middle-center"
          />
          <Label
            value="Tap to continue"
            uiTransform={{
              width: '100%',
              height: 22 * chiriDialoguePanelTransform.scale,
              positionType: 'absolute',
              position: {
                left: 0,
                top: chiriDialogueLayout.hintTop * chiriDialoguePanelTransform.scale
              }
            }}
            font="sans-serif"
            fontSize={chiriDialogueLayout.hintFontSize * chiriDialoguePanelTransform.scale}
            color={{ r: 1, g: 0.95, b: 0.62, a: 1 }}
            textAlign="middle-center"
          />
        </UiEntity>
      )}

      {itemUnlockPresentation && (
        <UiEntity
          uiTransform={{
            width: modalBackdropWidth,
            height: modalBackdropHeight,
            positionType: 'absolute',
            position: { left: modalBackdropLeft, top: 0 },
            zIndex: 33
          }}
          uiBackground={{
            color: {
              r: 0,
              g: 0,
              b: 0,
              a: ITEM_UNLOCK_PRESENTATION_LAYOUT.backdropOpacity
            }
          }}
          onMouseDown={closeItemUnlockPresentation}
        >
          <UiEntity
            uiTransform={{
              width: itemUnlockPresentationWidth,
              height: itemUnlockPresentationHeight,
              positionType: 'absolute',
              position: { left: '50%', top: '50%' },
              margin: {
                left:
                  -itemUnlockPresentationWidth / 2 + modalContentOffsetX,
                top: -itemUnlockPresentationHeight / 2
              }
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: { src: itemUnlockPresentation.icon }
            }}
            onMouseDown={closeItemUnlockPresentation}
          />
          {ITEM_UNLOCK_PRESENTATION_LAYOUT.unlockedOverlayEnabled && (
            <UiEntity
              uiTransform={{
                width: itemUnlockOverlayWidth,
                height: itemUnlockOverlayHeight,
                positionType: 'absolute',
                position: { left: '50%', top: '50%' },
                margin: {
                  left:
                    -itemUnlockOverlayWidth / 2 +
                    modalContentOffsetX +
                    itemUnlockOverlayLayout.offsetX,
                  top:
                    -itemUnlockOverlayHeight / 2 +
                    itemUnlockOverlayLayout.offsetY
                }
              }}
              uiBackground={{
                textureMode: 'stretch',
                texture: {
                  src: ITEM_UNLOCK_PRESENTATION_LAYOUT.unlockedOverlay
                }
              }}
              onMouseDown={closeItemUnlockPresentation}
            />
          )}
        </UiEntity>
      )}

    </UiEntity>

  )

}
