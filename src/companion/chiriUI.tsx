import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { engine, UiCanvasInformation } from '@dcl/sdk/ecs'
import { isMobile } from '@dcl/sdk/platform'
import {
  getChiriMode,
  getChiriCareSnapshot,
  isChiriStored,
  isChiriUnlocked,
  playChiriWave,
  selectChiriVariant,
  setChiriFollowingPlayer,
  setChiriStored,
  showChiriDialogue
} from './chiriCompanion'
import {
  CHIRI_ACTIVE_ART,
  CHIRI_ARCHIVE_MASK_REGIONS,
  CHIRI_CLOTH_MASK_REGIONS,
  CHIRI_FAVORITE_MATE_ICONS,
  CHIRI_FEED_PLAY_MASK_REGIONS,
  CHIRI_GLOW_ART,
  CHIRI_ITEM_BACKGROUNDS,
  CHIRI_ITEM_CENTERS,
  CHIRI_ITEM_SIZE_CONTROLS,
  CHIRI_MAIN_MASK_REGIONS,
  CHIRI_MEMORY_ICONS,
  CHIRI_OPEN_TAB_MASK_REGIONS,
  CHIRI_STATUS_BAR_LAYOUT,
  CHIRI_UI_ART,
  CHIRI_UI_LAYOUT,
  CHIRI_MINI_SOURCE_SIZE,
  CHIRI_UI_SOURCE_SIZE,
  CHIRI_UI_TEXTURES,
  chiriUiScale,
  type ChiriUiRect,
  type ChiriUiPoint,
  type ChiriUiTab
} from './chiriUiConfig'
import { chiriMoodsForCare, recordChiriWorldEvent } from './chiriCare'
import { ITEM_DATA } from '../farming/itemData'
import {
  getInventoryOrder,
  getItemAmount,
  removeItem
} from '../farming/inventory'
import {
  getProgress,
  getCollected,
  isPlayerReady,
  syncInventory,
  syncProgress
} from '../farming/player'
import {
  CHIRI_MECHA_CRAFT_ITEM_ID,
  CHIRI_MECHA_PARTS,
  CHIRI_MECHA_VARIANT_ID
} from '../mecha/chiriMechaConfig'
import {
  activateFeedPlayGroup,
  closeArchivePreview,
  closeChiriUi,
  getChiriUiState,
  leaveChiriControl,
  openChiriUi,
  pageActiveFeedPlayGroup,
  pageArchive,
  pageCloth,
  releaseChiriControl,
  selectArchiveGroup,
  selectArchiveSlot,
  selectChiriTab,
  selectClothSlot,
  setChiriUiStateListener,
  setHoveredChiriControl,
  setPressedChiriControl,
  toggleChiriTabs
} from './chiriUiState'

const TALK_LINES = [
  'Hi, sidekick! What should we explore next?',
  'I am always happy when we travel together!',
  'The Impossible Dimension feels less impossible with you around.',
  'Do you think we will find something magical today?'
] as const

const FOOD_REACTION_LINES = [
  'Thank you! That was delicious!',
  'Mmm, I loved that!',
  'That was so tasty. Thank you, sidekick!',
  'Yum! You always know what I like.'
] as const

const MATE_REACTION_LINES = [
  'Thank you! That mate was perfect!',
  'Mmm, this mate tastes wonderful!',
  'I loved it! Let us share another one soon.',
  'That was exactly what I needed. Thank you!'
] as const

let nextTalkLine = 0
let nextFoodReaction = 0
let nextMateReaction = 0

function talkToChiri() {
  if (isChiriStored()) setChiriStored(false)
  closeChiriUi()
  playChiriWave()
  const line = TALK_LINES[nextTalkLine % TALK_LINES.length]
  nextTalkLine++
  showChiriDialogue(line)
}

function toggleFreeFollow() {
  if (isChiriStored()) setChiriStored(false)
  setChiriFollowingPlayer(getChiriMode() === 'free-roam')
}

function tabForOpenButton(key: keyof typeof CHIRI_OPEN_TAB_MASK_REGIONS): ChiriUiTab {
  if (key === 'TAB_CLOTH') return 'cloth'
  if (key === 'TAB_FEED_PLAY') return 'feed-play'
  return 'memories-collection'
}

function resolveItemIcon(itemId?: string | null) {
  if (!itemId) return undefined
  return CHIRI_MEMORY_ICONS[itemId] ?? CHIRI_FAVORITE_MATE_ICONS[itemId] ?? ITEM_DATA[itemId]?.icon
}

function getPreparedFoodIds() {
  if (!isPlayerReady()) return []
  return getInventoryOrder().filter(itemId =>
    getItemAmount(itemId) > 0 && ITEM_DATA[itemId]?.type === 'food'
  )
}

function getClothItemsBySlot(): string[][] {
  const slots = Array.from({ length: 6 }, () => [] as string[])
  if (!isPlayerReady()) return slots
  const progress = getProgress()
  if (
    progress.chiri.mechaCrafted ||
    getItemAmount(CHIRI_MECHA_CRAFT_ITEM_ID) > 0
  ) {
    slots[2].push(CHIRI_MECHA_CRAFT_ITEM_ID)
  }
  return slots
}

function getArchiveItemIds(group: 'memories' | 'collection') {
  if (!isPlayerReady()) return []
  const progress = getProgress()
  if (group === 'memories') {
    const collectedPageIds: string[] = []
    for (const chapterIds of Object.values(progress.comic.pageOrderByChapter)) {
      for (const itemId of chapterIds) {
        if (!collectedPageIds.includes(itemId)) collectedPageIds.push(itemId)
      }
    }
    return collectedPageIds
      .filter(itemId => Boolean(CHIRI_MEMORY_ICONS[itemId]))
      .slice(0, Object.keys(CHIRI_MEMORY_ICONS).length)
  }

  const ids: string[] = []
  const add = (itemId?: string | null) => {
    if (
      itemId &&
      (resolveItemIcon(itemId) || ITEM_DATA[itemId]) &&
      !ids.includes(itemId)
    ) ids.push(itemId)
  }

  // Unlocked mate cards already contain their own complete slot background.
  for (const mateId of progress.collection.ownedMateIds) add(`mate_${mateId}`)

  if (progress.chiri.mechaCrafted) {
    add(CHIRI_MECHA_CRAFT_ITEM_ID)
  } else {
    for (const partId of progress.chiri.mechaCollectedPartIds) {
      add(CHIRI_MECHA_PARTS.find(part => part.id === partId)?.inventoryItemId)
    }
  }

  const discovered = new Set(getInventoryOrder())
  for (const itemId of Object.keys(progress.chiri.care.foodTasteScores)) discovered.add(itemId)
  for (const collectionId of Object.keys(getCollected())) {
    const seedId = `seed_${collectionId}`
    if (ITEM_DATA[seedId]?.type === 'seed') discovered.add(seedId)
  }

  for (const itemId of discovered) {
    const item = ITEM_DATA[itemId]
    if (!item) continue
    if (
      progress.story.flags.waterMachineRepaired === true &&
      /^water_machine_part_[1-5]$/.test(itemId)
    ) continue
    const requestedType = item.type === 'seed' || item.type === 'crop' || item.type === 'food'
    const worldCollectionItem =
      itemId.startsWith('house_furniture:') ||
      itemId.startsWith('water_machine_') ||
      /watering|regadera|craftpack|backpack/i.test(itemId)
    if (requestedType || worldCollectionItem) add(itemId)
  }
  return ids
}

function giveItemToChiri(itemId: string) {
  if (!isPlayerReady() || getItemAmount(itemId) <= 0) return
  const mate = itemId.startsWith('prepared_mate_')
  if (!removeItem(itemId, 1)) return
  recordChiriWorldEvent(
    getProgress(),
    mate ? 'give-mate' : 'feed',
    itemId
  )
  void syncInventory()
  void syncProgress()
  if (isChiriStored()) setChiriStored(false)
  closeChiriUi()
  playChiriWave()
  if (mate) {
    showChiriDialogue(MATE_REACTION_LINES[nextMateReaction++ % MATE_REACTION_LINES.length])
  } else {
    showChiriDialogue(FOOD_REACTION_LINES[nextFoodReaction++ % FOOD_REACTION_LINES.length])
  }
}

function TexturePreloader() {
  return (
    <UiEntity
      key="chiri-ui-texture-preloader"
      uiTransform={{
        width: 2,
        height: 2,
        positionType: 'absolute',
        position: { left: 0, top: 0 },
        pointerFilter: 'none'
      }}
    >
      {CHIRI_UI_TEXTURES.map((src, index) => (
        <UiEntity
          key={`chiri-preload-${index}`}
          uiTransform={{
            width: 2,
            height: 2,
            positionType: 'absolute',
            position: { left: 0, top: 0 },
            pointerFilter: 'none'
          }}
          uiBackground={{
            textureMode: 'stretch',
            texture: { src },
            color: { r: 1, g: 1, b: 1, a: 0.01 }
          }}
        />
      ))}
    </UiEntity>
  )
}

export function ChiriUI() {
  const [, setRevision] = ReactEcs.useState(0)
  setChiriUiStateListener(() => setRevision(value => value + 1))

  const state = getChiriUiState()
  const mobile = isMobile()
  const mini = CHIRI_UI_LAYOUT[mobile ? 'miniMobile' : 'miniDesktop']

  if (!state.open) {
    return (
      <UiEntity
        key="chiri-ui-closed"
        uiTransform={{
          width: '100%',
          height: '100%',
          positionType: 'absolute',
          position: { left: 0, top: 0 },
          pointerFilter: 'none'
        }}
      >
        {TexturePreloader()}
        {isChiriUnlocked() && (
          <UiEntity
            key="mini-chiri"
            uiTransform={{
              width: mini.size,
              height: mini.size * CHIRI_MINI_SOURCE_SIZE.height / CHIRI_MINI_SOURCE_SIZE.width,
              positionType: 'absolute',
              position: { right: mini.right, top: mini.top },
              // Same low layer as the other HUD minis. Full-screen scene
              // windows render later/above it instead of removing it.
              zIndex: 1
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: { src: CHIRI_UI_ART.mini }
            }}
            onMouseDown={openChiriUi}
          />
        )}
      </UiEntity>
    )
  }

  if (!isChiriUnlocked()) {
    closeChiriUi()
    return <UiEntity uiTransform={{ width: 0, height: 0, pointerFilter: 'none' }} />
  }

  const viewport = UiCanvasInformation.getOrNull(engine.RootEntity)
  const scale = chiriUiScale(mobile, viewport?.width, viewport?.height)
  const device = CHIRI_UI_LAYOUT[mobile ? 'mobile' : 'desktop']
  const size = CHIRI_UI_SOURCE_SIZE * scale
  const transform = (rect: ChiriUiRect) => ({
    width: rect.width * scale,
    height: rect.height * scale,
    positionType: 'absolute' as const,
    position: { left: rect.x * scale, top: rect.y * scale }
  })
  const art = (key: string, src: string) => (
    <UiEntity
      key={key}
      uiTransform={{
        width: size,
        height: size,
        positionType: 'absolute',
        position: { left: 0, top: 0 },
        pointerFilter: 'none'
      }}
      uiBackground={{ textureMode: 'stretch', texture: { src } }}
    />
  )
  const click = (key: string, rect: ChiriUiRect, action: () => void) => (
    <UiEntity
      key={`chiri-input-${key}`}
      uiTransform={transform(rect)}
      onMouseEnter={() => setHoveredChiriControl(key)}
      onMouseLeave={() => {
        leaveChiriControl(key)
        releaseChiriControl(key)
      }}
      onMouseDown={() => {
        setPressedChiriControl(key)
        action()
      }}
      onMouseUp={() => releaseChiriControl(key)}
    />
  )
  const releaseClick = (key: string, rect: ChiriUiRect, action: () => void) => (
    <UiEntity
      key={`chiri-input-${key}`}
      uiTransform={transform(rect)}
      onMouseEnter={() => setHoveredChiriControl(key)}
      onMouseLeave={() => {
        leaveChiriControl(key)
        releaseChiriControl(key)
      }}
      onMouseDown={() => setPressedChiriControl(key)}
      onMouseUp={() => {
        releaseChiriControl(key)
        action()
      }}
    />
  )
  const itemSlot = (
    key: string,
    center: ChiriUiPoint,
    styleKey: keyof typeof CHIRI_ITEM_SIZE_CONTROLS,
    background: string,
    itemId?: string | null,
    backgroundMode: 'when-item' | 'always' | 'never' = 'when-item'
  ) => {
    const style = CHIRI_ITEM_SIZE_CONTROLS[styleKey]
    const backgroundHeight = style.backgroundSize * scale
    const backgroundWidth = backgroundHeight * 196 / 205
    const itemSize = style.itemSize * scale
    const itemIcon = resolveItemIcon(itemId)
    const icon = itemIcon ?? CHIRI_UI_ART.lockedItem
    const itemData = itemId ? ITEM_DATA[itemId] : undefined
    const completeArtwork = itemIcon && itemData?.completeSlotArtwork === true
    const showBackground = !completeArtwork && (
      backgroundMode === 'always' ||
      (backgroundMode === 'when-item' && Boolean(itemIcon))
    )
    const iconHeight = completeArtwork ? backgroundHeight : itemSize
    const iconWidth = completeArtwork
      ? iconHeight * (itemData?.completeSlotArtworkAspectRatio ?? 1)
      : itemSize
    return (
      <UiEntity
        key={`chiri-slot-${key}`}
        uiTransform={{
          width: backgroundWidth,
          height: backgroundHeight,
          positionType: 'absolute',
          position: {
            left: center.x * scale - backgroundWidth / 2,
            top: center.y * scale - backgroundHeight / 2
          },
          pointerFilter: 'none'
        }}
        uiBackground={showBackground
          ? { textureMode: 'stretch', texture: { src: background } }
          : undefined}
      >
        <UiEntity
          key={`${itemIcon ? 'chiri-slot-icon' : 'chiri-slot-lock'}-${key}`}
          uiTransform={{
            width: iconWidth,
            height: iconHeight,
            positionType: 'absolute',
            position: {
              left: (backgroundWidth - iconWidth) / 2,
              top: (backgroundHeight - iconHeight) / 2
            },
            pointerFilter: 'none'
          }}
          uiBackground={{ textureMode: 'stretch', texture: { src: icon } }}
        />
      </UiEntity>
    )
  }
  const statusBar = (
    key: keyof typeof CHIRI_STATUS_BAR_LAYOUT.y,
    value: number
  ) => {
    const layout = CHIRI_STATUS_BAR_LAYOUT
    const normalized = Math.max(0, Math.min(100, value)) / 100
    const allowedLevels = layout.markerLevelIndexes
    const allowedIndex = Math.round(normalized * (allowedLevels.length - 1))
    const markerLevel = allowedLevels[allowedIndex]
    const markerX = layout.minX +
      (layout.maxX - layout.minX) * markerLevel / (layout.dotCount - 1)
    const markerSize = layout.markerSize * scale
    const endpoint = markerLevel === 0 || markerLevel === layout.dotCount - 1
    return (
      <UiEntity
        key={`chiri-status-${key}`}
        uiTransform={{ width: size, height: size, positionType: 'absolute', pointerFilter: 'none' }}
      >
        {Array.from({ length: layout.dotCount }, (_, index) => {
          if (index < 2 || index > layout.dotCount - 3) return null
          const progress = index / (layout.dotCount - 1)
          const x = layout.minX + (layout.maxX - layout.minX) * progress
          const dotSize = layout.dotSize * scale
          return (
            <UiEntity
              key={`chiri-status-${key}-dot-${index}`}
              uiTransform={{
                width: dotSize,
                height: dotSize,
                positionType: 'absolute',
                position: {
                  left: x * scale - dotSize / 2,
                  top: layout.y[key] * scale - dotSize / 2
                },
                borderRadius: dotSize / 2,
                pointerFilter: 'none'
              }}
              uiBackground={{ color: { r: 0, g: 0, b: 0, a: 1 } }}
            />
          )
        })}
        <UiEntity
          key={`chiri-status-${key}-marker`}
          uiTransform={{
            width: markerSize,
            height: markerSize,
            positionType: 'absolute',
            position: {
              left: markerX * scale - markerSize / 2,
              top: layout.y[key] * scale - markerSize / 2
            },
            borderRadius: markerSize / 2,
            borderWidth: layout.markerBorderWidth * scale,
            borderColor: { r: 0, g: 0, b: 0, a: 1 },
            pointerFilter: 'none'
          }}
          uiBackground={{
            color: endpoint
              ? { r: 1, g: 1, b: 1, a: 0 }
              : { r: 1, g: 1, b: 1, a: 1 }
          }}
        />
      </UiEntity>
    )
  }

  const care = getChiriCareSnapshot()
  const moodArts = chiriMoodsForCare(care).map(mood =>
    mood === 'hungry'
      ? CHIRI_UI_ART.moodHungry
      : mood === 'bored'
        ? CHIRI_UI_ART.moodBored
        : mood === 'sad'
          ? CHIRI_UI_ART.moodSad
          : CHIRI_UI_ART.moodHappy
  )
  const tabArt = state.activeTab === 'cloth'
    ? CHIRI_UI_ART.tab1
    : state.activeTab === 'feed-play'
      ? CHIRI_UI_ART.tab2
      : state.activeTab === 'memories-collection'
        ? CHIRI_UI_ART.tab3
        : null

  const clothItems = getClothItemsBySlot()
  const clothVisibleItems = clothItems.map((items, slot) =>
    items[state.clothChoiceIndexes[slot] ?? 0] ?? null
  )
  const preparedFoods = getPreparedFoodIds()
  const playItems: string[] = []
  const feedVisible = preparedFoods.slice(state.feedPage, state.feedPage + 3)
  const playVisible = playItems.slice(state.playPage, state.playPage + 3)
  const activeFeedPlayItems = state.feedPlayGroup === 'feed'
    ? feedVisible
    : state.feedPlayGroup === 'play'
      ? playVisible
      : []
  const centerItem = activeFeedPlayItems.length > 0
    ? activeFeedPlayItems[Math.min(1, activeFeedPlayItems.length - 1)]
    : null
  const archiveItems = getArchiveItemIds(state.archiveGroup)
  const archiveVisible = archiveItems.slice(state.archivePage * 12, state.archivePage * 12 + 12)
  const hoveredOrPressed = (key: string) =>
    state.hoveredControl === key || state.pressedControl === key

  const applyCloth = () => {
    const mechaSelected =
      state.selectedClothSlot === 2 &&
      clothVisibleItems[2] === CHIRI_MECHA_CRAFT_ITEM_ID
    if (mechaSelected) selectChiriVariant(CHIRI_MECHA_VARIANT_ID)
  }

  return (
    <UiEntity
      key="chiri-modal"
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        position: { left: 0, top: 0 },
        zIndex: 38,
        pointerFilter: 'none'
      }}
      uiBackground={{
        color: { r: 0, g: 0, b: 0, a: CHIRI_UI_LAYOUT.backdropOpacity }
      }}
    >
      <UiEntity
        key="chiri-outside-close"
        uiTransform={{
          width: '100%',
          height: '100%',
          positionType: 'absolute',
          position: { left: 0, top: 0 },
          zIndex: 0
        }}
        onMouseDown={closeChiriUi}
      />
      <UiEntity
        key="chiri-canvas"
        uiTransform={{
          width: size,
          height: size,
          positionType: 'absolute',
          position: { left: '50%', top: '50%' },
          margin: {
            left: -size / 2 + device.offsetX,
            top: -size / 2 + device.offsetY
          },
          zIndex: 1,
          pointerFilter: 'block'
        }}
      >
        {tabArt && art('active-tab-background', tabArt)}
        {state.activeTab === 'cloth' && art('cloth-chiri', CHIRI_UI_ART.clothBase)}
        {state.tabsVisible && art(
          state.activeTab ? 'tabs-open' : 'tabs-closed',
          state.activeTab ? CHIRI_UI_ART.tabsOpen : CHIRI_UI_ART.tabsClosed
        )}
        {art('chiri-background', CHIRI_UI_ART.background)}
        {moodArts.map((src, index) => art(`chiri-mood-${index}`, src))}

        {statusBar('friendship', care.stats.friendship)}
        {statusBar('happy', care.stats.happy)}
        {statusBar('hungry', care.stats.hungry)}
        {statusBar('bored', care.stats.bored)}

        {itemSlot(
          'favorite-food',
          CHIRI_ITEM_CENTERS.favorites[0],
          'favorites',
          CHIRI_ITEM_BACKGROUNDS.lavender,
          care.favoriteFoodId ?? 'eggplant_pizza'
        )}
        {itemSlot(
          'favorite-mate',
          CHIRI_ITEM_CENTERS.favorites[1],
          'favorites',
          CHIRI_ITEM_BACKGROUNDS.lavender,
          care.favoriteMateId ?? 'mate_matexito_infinito'
        )}
        {art('chiri-favorites', CHIRI_UI_ART.favorites)}

        {state.activeTab === 'cloth' && CHIRI_ITEM_CENTERS.cloth.map((center, index) =>
          itemSlot(
            `cloth-${index}`,
            center,
            'cloth',
            CHIRI_ITEM_BACKGROUNDS.lavender,
            clothVisibleItems[index],
            'always'
          )
        )}
        {state.activeTab === 'cloth' &&
          state.selectedClothSlot === 2 &&
          clothVisibleItems[2] === CHIRI_MECHA_CRAFT_ITEM_ID &&
          art('cloth-mecha-preview', CHIRI_UI_ART.mechaSkinPreview)}

        {state.activeTab === 'feed-play' && CHIRI_ITEM_CENTERS.feed.map((center, index) =>
          itemSlot(`feed-${index}`, center, 'feed', CHIRI_ITEM_BACKGROUNDS.orange, feedVisible[index])
        )}
        {state.activeTab === 'feed-play' && CHIRI_ITEM_CENTERS.play.map((center, index) =>
          itemSlot(`play-${index}`, center, 'play', CHIRI_ITEM_BACKGROUNDS.blue, playVisible[index])
        )}
        {state.activeTab === 'feed-play' && itemSlot(
          'feed-play-center',
          CHIRI_ITEM_CENTERS.feedPlayCenter[0],
          'feedPlayCenter',
          CHIRI_ITEM_BACKGROUNDS.lavender,
          centerItem
        )}

        {state.activeTab === 'memories-collection' && CHIRI_ITEM_CENTERS.archive.map((center, index) =>
          itemSlot(
            `archive-${index}`,
            center,
            state.archiveGroup,
            state.archiveGroup === 'memories'
              ? CHIRI_ITEM_BACKGROUNDS.lavender
              : CHIRI_ITEM_BACKGROUNDS.orange,
            archiveVisible[index],
            state.archiveGroup === 'memories' ? 'never' : 'always'
          )
        )}

        {getChiriMode() === 'free-roam' && art('follow-me-state', CHIRI_UI_ART.followMe)}
        {isChiriStored() && art('show-chiri-state', CHIRI_UI_ART.showChiri)}

        {state.activeTab === 'cloth' && clothVisibleItems.map((itemId, index) =>
          itemId && (state.selectedClothSlot === index || hoveredOrPressed(`cloth-item-${index + 1}`))
            ? art(`glow-cloth-item-${index + 1}`, CHIRI_GLOW_ART.clothItems[index])
            : null
        )}
        {state.activeTab === 'cloth' && hoveredOrPressed('cloth-previous') &&
          art('glow-cloth-previous', CHIRI_GLOW_ART.clothPrevious)}
        {state.activeTab === 'cloth' && hoveredOrPressed('cloth-next') &&
          art('glow-cloth-next', CHIRI_GLOW_ART.clothNext)}
        {state.activeTab === 'cloth' && state.pressedControl === 'cloth-apply' &&
          art('active-cloth-apply', CHIRI_ACTIVE_ART.clothApply)}

        {state.activeTab === 'feed-play' &&
          (state.feedPlayGroup === 'feed' || hoveredOrPressed('feed-zone')) &&
          art('glow-feed-zone', CHIRI_GLOW_ART.feedZone)}
        {state.activeTab === 'feed-play' &&
          (state.feedPlayGroup === 'play' || hoveredOrPressed('play-zone')) &&
          art('glow-play-zone', CHIRI_GLOW_ART.playZone)}
        {state.activeTab === 'feed-play' && hoveredOrPressed('feed-play-previous') &&
          art('glow-feed-play-previous', CHIRI_GLOW_ART.feedPlayPrevious)}
        {state.activeTab === 'feed-play' && hoveredOrPressed('feed-play-next') &&
          art('glow-feed-play-next', CHIRI_GLOW_ART.feedPlayNext)}
        {state.activeTab === 'feed-play' && centerItem && hoveredOrPressed('feed-play-center') &&
          art('glow-feed-play-center', CHIRI_GLOW_ART.feedPlayCenter)}

        {state.activeTab === 'memories-collection' &&
          (state.archiveGroup === 'memories' || hoveredOrPressed('memories-zone')) &&
          art('glow-memories-zone', CHIRI_GLOW_ART.memoriesZone)}
        {state.activeTab === 'memories-collection' &&
          (state.archiveGroup === 'collection' || hoveredOrPressed('collection-zone')) &&
          art('glow-collection-zone', CHIRI_GLOW_ART.collectionZone)}
        {state.activeTab === 'memories-collection' && hoveredOrPressed('archive-previous') &&
          art('glow-archive-previous', CHIRI_GLOW_ART.archivePrevious)}
        {state.activeTab === 'memories-collection' && hoveredOrPressed('archive-next') &&
          art('glow-archive-next', CHIRI_GLOW_ART.archiveNext)}
        {state.activeTab === 'memories-collection' && archiveVisible.map((itemId, index) =>
          itemId && (state.selectedArchiveSlot === index || hoveredOrPressed(`archive-item-${index + 1}`))
            ? art(`glow-archive-item-${index + 1}`, CHIRI_GLOW_ART.archiveItems[index])
            : null
        )}

        {click('free-follow', CHIRI_MAIN_MASK_REGIONS.FREE_FOLLOW, toggleFreeFollow)}
        {click('talk', CHIRI_MAIN_MASK_REGIONS.TALK, talkToChiri)}
        {click('hide-show', CHIRI_MAIN_MASK_REGIONS.HIDE_SHOW, () => {
          setChiriStored(!isChiriStored())
        })}
        {click('toggle-tabs', CHIRI_MAIN_MASK_REGIONS.TOGGLE_TABS, toggleChiriTabs)}

        {state.tabsVisible && !state.activeTab && (
          <UiEntity uiTransform={{ width: size, height: size, positionType: 'absolute', pointerFilter: 'none' }}>
            {click('closed-cloth', CHIRI_MAIN_MASK_REGIONS.TAB_CLOTH_CLOSED, () => selectChiriTab('cloth'))}
            {click('closed-feed-play', CHIRI_MAIN_MASK_REGIONS.TAB_FEED_PLAY_CLOSED, () => selectChiriTab('feed-play'))}
            {click('closed-memories', CHIRI_MAIN_MASK_REGIONS.TAB_MEMORIES_CLOSED, () => selectChiriTab('memories-collection'))}
          </UiEntity>
        )}

        {state.tabsVisible && state.activeTab && (
          <UiEntity uiTransform={{ width: size, height: size, positionType: 'absolute', pointerFilter: 'none' }}>
            {(Object.keys(CHIRI_OPEN_TAB_MASK_REGIONS) as Array<keyof typeof CHIRI_OPEN_TAB_MASK_REGIONS>).map(key =>
              click(`open-${key}`, CHIRI_OPEN_TAB_MASK_REGIONS[key], () => selectChiriTab(tabForOpenButton(key)))
            )}
          </UiEntity>
        )}

        {state.activeTab === 'cloth' && (
          <UiEntity uiTransform={{ width: size, height: size, positionType: 'absolute', pointerFilter: 'none' }}>
            {click('cloth-apply', CHIRI_CLOTH_MASK_REGIONS.APPLY, applyCloth)}
            {click('cloth-previous', CHIRI_CLOTH_MASK_REGIONS.PREVIOUS, () => {
              const slot = state.selectedClothSlot
              pageCloth(-1, slot === null ? 0 : clothItems[slot].length)
            })}
            {click('cloth-next', CHIRI_CLOTH_MASK_REGIONS.NEXT, () => {
              const slot = state.selectedClothSlot
              pageCloth(1, slot === null ? 0 : clothItems[slot].length)
            })}
            {([1, 2, 3, 4, 5, 6] as const).map(number =>
              click(`cloth-item-${number}`, CHIRI_CLOTH_MASK_REGIONS[`ITEM_${number}`], () => {
                if (clothVisibleItems[number - 1]) selectClothSlot(number - 1)
              })
            )}
          </UiEntity>
        )}

        {state.activeTab === 'feed-play' && (
          <UiEntity uiTransform={{ width: size, height: size, positionType: 'absolute', pointerFilter: 'none' }}>
            {click('feed-zone', CHIRI_FEED_PLAY_MASK_REGIONS.FEED, () => activateFeedPlayGroup('feed'))}
            {click('feed-play-previous', CHIRI_FEED_PLAY_MASK_REGIONS.PREVIOUS, () =>
              pageActiveFeedPlayGroup(-1, state.feedPlayGroup === 'feed' ? preparedFoods.length : playItems.length)
            )}
            {releaseClick('feed-play-center', CHIRI_FEED_PLAY_MASK_REGIONS.CENTER_ITEM, () => {
              if (centerItem) giveItemToChiri(centerItem)
            })}
            {click('feed-play-next', CHIRI_FEED_PLAY_MASK_REGIONS.NEXT, () =>
              pageActiveFeedPlayGroup(1, state.feedPlayGroup === 'feed' ? preparedFoods.length : playItems.length)
            )}
            {click('play-zone', CHIRI_FEED_PLAY_MASK_REGIONS.PLAY, () => activateFeedPlayGroup('play'))}
          </UiEntity>
        )}

        {state.activeTab === 'memories-collection' && (
          <UiEntity uiTransform={{ width: size, height: size, positionType: 'absolute', pointerFilter: 'none' }}>
            {click('memories-zone', CHIRI_ARCHIVE_MASK_REGIONS.MEMORIES, () => selectArchiveGroup('memories'))}
            {click('collection-zone', CHIRI_ARCHIVE_MASK_REGIONS.COLLECTION, () => selectArchiveGroup('collection'))}
            {click('archive-previous', CHIRI_ARCHIVE_MASK_REGIONS.PREVIOUS, () => pageArchive(-1, archiveItems.length))}
            {click('archive-next', CHIRI_ARCHIVE_MASK_REGIONS.NEXT, () => pageArchive(1, archiveItems.length))}
            {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const).map(number =>
              click(`archive-item-${number}`, CHIRI_ARCHIVE_MASK_REGIONS[`ITEM_${number}`], () => {
                const itemId = archiveVisible[number - 1]
                selectArchiveSlot(number - 1, resolveItemIcon(itemId) ? itemId : null)
              })
            )}
          </UiEntity>
        )}
      </UiEntity>

      {state.archivePreviewItemId &&
        resolveItemIcon(state.archivePreviewItemId) &&
        (state.archiveGroup !== 'collection' || archiveItems.includes(state.archivePreviewItemId)) && (
        <UiEntity
          key="chiri-archive-preview"
          uiTransform={{
            width: '100%',
            height: '100%',
            positionType: 'absolute',
            position: { left: 0, top: 0 },
            zIndex: 2,
            justifyContent: 'center',
            alignItems: 'center'
          }}
          uiBackground={{ color: { r: 0, g: 0, b: 0, a: 0.78 } }}
          onMouseDown={closeArchivePreview}
        >
          <UiEntity
            key="chiri-archive-preview-item"
            uiTransform={{
              width: mobile ? 330 : 430,
              height: mobile ? 330 : 430,
              pointerFilter: 'none'
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: { src: resolveItemIcon(state.archivePreviewItemId)! }
            }}
          />
        </UiEntity>
      )}
    </UiEntity>
  )
}
