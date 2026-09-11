import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { engine, UiCanvasInformation } from '@dcl/sdk/ecs'
import { isMobile } from '@dcl/sdk/platform'
import { ITEM_DATA } from '../farming/itemData'
import { getItemAmount } from '../farming/inventory'
import {
  cookingGame as game, cookingSession as session, setCookingUiListener,
  visibleCookingItems, getCookingOrders, pageCookingItems, cookingUiAction, openCookingOven
} from './cookingRuntime'
import { CookingEmptySlot, CookingItemCard } from './cookingItemsUI'
import { CookingModeMenu } from './cookingModeMenu'
import { createCookingHeatHandlers, createCookingHoldHandlers } from './cookingSession'
import { COOKING_MASK_REGIONS as regions } from './cookingMaskRegions'
import { COOKING_ACTIVE_ART, COOKING_ART, COOKING_GLOW_ART, COOKING_MATE_BASE_ART, COOKING_MODE_MENU_ART, COOKING_MODE_MENU_CONFIG, COOKING_OVEN_BASE_ART, COOKING_OVEN_INGREDIENT_ART, COOKING_TEXTURES_TO_PRELOAD, COOKING_UI_CONFIG as config, cookingBarPaths, cookingModeMenuScale, cookingPanelScale, type CookingMaskRegionKey } from './cookingConfig'
import { getHoveredCookingControl, getPressedCookingControl, leaveCookingControl, releaseCookingControl, setCookingInteractionListener, setHoveredCookingControl, setPressedCookingControl } from './cookingInteractionState'
import { COOKING_TIMER_CENTER, getCookingItemLayout } from './cookingLayout'

type Rect = { x: number; y: number; width: number; height: number }
const white = { r: 1, g: 1, b: 1, a: 1 }
const purple = { r: 0.4, g: 0.02, b: 0.4, a: 1 }

function CookingTexturePreloader() {
  return <UiEntity key="cooking-texture-preloader" uiTransform={{ width: 2, height: 2,
    positionType: 'absolute', position: { left: 0, top: 0 }, pointerFilter: 'none' }}>
    {COOKING_TEXTURES_TO_PRELOAD.map((src, index) => <UiEntity key={`cooking-preload-${index}`}
      // A 1x1 almost-zero-alpha element can be culled before its texture is
      // decoded, especially on mobile. These tiny overlapping previews remain
      // practically invisible but force every first-use state into the cache.
      uiTransform={{ width: 2, height: 2, positionType: 'absolute', position: { left: 0, top: 0 }, pointerFilter: 'none' }}
      uiBackground={{ textureMode: 'stretch', texture: { src }, color: { r: 1, g: 1, b: 1, a: 0.01 } }} />)}
  </UiEntity>
}

export function CookingUI() {
  const [, setRevision] = ReactEcs.useState(0)
  setCookingUiListener(() => setRevision(n => n + 1))
  setCookingInteractionListener(() => setRevision(n => n + 1))
  const screen = session.getState().screen
  if (screen === 'closed') return <UiEntity key="cooking-closed-cache"
    uiTransform={{ width: '100%', height: '100%', positionType: 'absolute',
      position: { left: 0, top: 0 }, pointerFilter: 'none' }}>
    {CookingTexturePreloader()}
    {config.showTestButton && <Label value="Test kitchen" fontSize={18}
      uiTransform={{ width: 130, height: 42, positionType: 'absolute', pointerFilter: 'block',
        position: { left: '50%', bottom: 8 }, zIndex: 45 }}
      uiBackground={{ color: { r: 0.35, g: 0.1, b: 0.45, a: 1 } }}
      onMouseDown={openCookingOven} />}
  </UiEntity>
  const mobile = isMobile()
  const viewport = UiCanvasInformation.getOrNull(engine.RootEntity)
  const scale = cookingPanelScale(mobile, viewport?.width, viewport?.height)
  const device = config[mobile ? 'mobile' : 'desktop']
  const modeScale = cookingModeMenuScale(mobile, viewport?.width, viewport?.height)
  const modeDevice = COOKING_MODE_MENU_CONFIG[mobile ? 'mobile' : 'desktop']
  if (screen === 'choose-mode') return <UiEntity key="cooking-mode-with-cache"
    uiTransform={{ width: '100%', height: '100%', positionType: 'absolute',
      position: { left: 0, top: 0 }, pointerFilter: 'none' }}>
    {CookingTexturePreloader()}
    <CookingModeMenu
      background={COOKING_MODE_MENU_ART.background}
      sourceWidth={COOKING_MODE_MENU_CONFIG.sourceWidth}
      sourceHeight={COOKING_MODE_MENU_CONFIG.sourceHeight}
      canvasScale={modeScale}
      regions={COOKING_MODE_MENU_CONFIG.regions}
      glows={COOKING_MODE_MENU_ART.glows}
      mobile={mobile}
      offsetX={modeDevice.offsetX}
      offsetY={modeDevice.offsetY}
      arcadeEnabled={false}
    />
  </UiEntity>

  const transform = (rect: Rect) => ({
    width: rect.width * scale, height: rect.height * scale,
    positionType: 'absolute' as const, position: { left: rect.x * scale, top: rect.y * scale }
  })
  const art = (key: string, src: string) => src ? <UiEntity key={key}
    uiTransform={{ ...transform({ x: 0, y: 0, width: 1536, height: 1024 }), pointerFilter: 'none' }}
    uiBackground={{ textureMode: 'stretch', texture: { src } }} /> : null
  const text = (key: string, value: string, rect: Rect, fontSize = 24, color = white) => <Label key={key}
    value={value} fontSize={fontSize * scale} color={color} textAlign="middle-center"
    uiTransform={{ ...transform(rect), pointerFilter: 'none' }} />
  const statusPanel = (key: string, value: string, zone: 'oven' | 'mate', color = white) => {
    const area = regions[zone === 'oven' ? 'OVEN' : 'MATE']
    const width = zone === 'oven' ? 390 : 310
    const height = zone === 'oven' ? 112 : 92
    const rect = { x: area.x + (area.width - width) / 2, y: area.y + (area.height - height) / 2, width, height }
    return <UiEntity key={key} uiTransform={{ ...transform(rect), pointerFilter: 'none',
      justifyContent: 'center', alignItems: 'center', borderRadius: 28 * scale }}
      uiBackground={{ color: { r: 0.15, g: 0.015, b: 0.2, a: 0.9 } }}>
      <Label value={value} fontSize={(zone === 'oven' ? 38 : 29) * scale} color={color}
        textAlign="middle-center" uiTransform={{ width: '94%', height: '90%', pointerFilter: 'none' }} />
    </UiEntity>
  }
  const failurePanel = (key: string, value: string, zone: 'oven' | 'mate') => {
    const area = regions[zone === 'oven' ? 'OVEN' : 'MATE']
    const insetX = zone === 'oven' ? 20 : 8
    const insetTop = zone === 'oven' ? 20 : 30
    const insetBottom = zone === 'oven' ? 20 : 8
    const rect = {
      x: area.x + insetX,
      y: area.y + insetTop,
      width: area.width - insetX * 2,
      height: area.height - insetTop - insetBottom
    }
    return <UiEntity key={key} uiTransform={{ ...transform(rect), pointerFilter: 'none',
      justifyContent: 'center', alignItems: 'center', borderRadius: 24 * scale }}
      uiBackground={{ color: { r: 1, g: 1, b: 1, a: 0.82 } }}>
      <Label value={value} fontSize={(zone === 'oven' ? 42 : 30) * scale} color={purple}
        textAlign="middle-center" uiTransform={{ width: '94%', height: '88%', pointerFilter: 'none' }} />
    </UiEntity>
  }
  const click = (key: CookingMaskRegionKey, action: () => void) => <UiEntity key={`input-${key}`}
    uiTransform={transform(regions[key])}
    onMouseEnter={() => setHoveredCookingControl(key)}
    onMouseLeave={() => leaveCookingControl(key)}
    onMouseDown={() => { setPressedCookingControl(key); cookingUiAction(action) }}
    onMouseUp={() => releaseCookingControl(key)} />
  const bases = visibleCookingItems('bases')
  const ingredients = visibleCookingItems('ingredients')
  const orders = getCookingOrders().slice(0, 3)
  const held = session.getState().held?.source
  const seconds = game.readyInSeconds
  const timer = seconds === null ? '--:--' : `${Math.floor(seconds / 60) < 10 ? '0' : ''}${Math.floor(seconds / 60)}:${seconds % 60 < 10 ? '0' : ''}${seconds % 60}`
  const mateStatus = game.invalidMate ? '' : game.overflow ? `${game.overflow === 'water' ? 'Water' : 'Yerba'} spilled` : game.mateReady ? 'Mate ready!' :
    held?.kind === 'water' ? 'Pouring water…' : game.yerbaReady ? 'Yerba OK! Add water.' : held?.kind === 'yerba' ? 'Adding yerba…' : ''
  const selectedControls = new Set<CookingMaskRegionKey>()
  if (game.selectedArea) selectedControls.add(game.selectedArea === 'oven' ? 'OVEN' : 'MATE')
  // Base and ingredient clicks apply/remove their layer immediately; their
  // slot glow is hover/press feedback only and never remains selected.
  const hoveredControl = getHoveredCookingControl()
  const visibleSlotForControl = (control: CookingMaskRegionKey) => {
    const base = /^BASE_([1-4])$/.exec(control)
    if (base) return Number(base[1]) <= bases.length
    const ingredient = /^INGREDIENT_([1-4])$/.exec(control)
    if (ingredient) return Number(ingredient[1]) <= ingredients.length
    return true
  }
  // A slot can disappear while the pointer is still over it (for example,
  // after Ready removes an order). Never keep/render its orphaned glow.
  if (hoveredControl && !hoveredControl.startsWith('ORDER_') && visibleSlotForControl(hoveredControl)) selectedControls.add(hoveredControl)
  if (held?.kind === 'yerba') {
    const index = ingredients.indexOf(held.itemId)
    if (index >= 0) selectedControls.add(`INGREDIENT_${index + 1}` as CookingMaskRegionKey)
  }
  // Glow communicates the persistent ON state. Active is press-only.
  if (game.ovenOn) selectedControls.add('FLAME')
  if (game.ready) selectedControls.add('READY')
  const pressedControl = getPressedCookingControl()
  const activeControls = new Set<CookingMaskRegionKey>()
  if (pressedControl) activeControls.add(pressedControl)

  return <UiEntity key="cooking-modal" uiTransform={{ width: '100%', height: '100%', positionType: 'absolute',
      position: { left: 0, top: 0 }, zIndex: 40, pointerFilter: 'none' }}
      uiBackground={{ color: { r: 0, g: 0, b: 0, a: 0.5 } }}>
    <UiEntity key="cooking-outside-close" uiTransform={{ width: '100%', height: '100%',
      positionType: 'absolute', position: { left: 0, top: 0 }, zIndex: 0 }}
      onMouseDown={() => session.close()} />
    <UiEntity key="cooking-canvas" uiTransform={{ width: 1536 * scale, height: 1024 * scale,
      positionType: 'absolute', position: { left: '50%', top: '50%' },
      margin: { left: -768 * scale + device.offsetX, top: -512 * scale + device.offsetY },
      zIndex: 1, pointerFilter: 'block' }}>
      {art('background', COOKING_ART.background)}
      {(['bases', 'ingredients'] as const).map(group => {
        const items = group === 'bases' ? bases : ingredients
        return [0, 1, 2, 3].map(index => {
          const id = items[index]
          return id ? CookingItemCard({
            group, slotIndex: index, itemId: id, quantity: getItemAmount(id), canvasScale: scale,
            interactive: false, allowEmpty: group === 'ingredients' && game.yerbaPaid && game.yerbaItem === id,
            isHovered: false
          }) : CookingEmptySlot({ group, slotIndex: index, canvasScale: scale })
        })
      })}
      {orders.map((order, index) => CookingItemCard({
        group: 'orders', slotIndex: index, itemId: order.itemId, quantity: order.quantity,
        canvasScale: scale, interactive: false
      }))}
      {/* Mate designs already include their final position on a 1536x1024 canvas. */}
      {game.mateBase && COOKING_MATE_BASE_ART[game.mateBase]
        ? art(`mate-base-${game.mateBase}`, COOKING_MATE_BASE_ART[game.mateBase])
        : null}
      {game.ovenBase && COOKING_OVEN_BASE_ART[game.ovenBase]
        ? art(`oven-base-${game.ovenBase}`, COOKING_OVEN_BASE_ART[game.ovenBase])
        : null}
      {game.ovenBase && game.ovenIngredients.map(id => {
        const quantity = game.getOvenIngredientQuantity(id)
        const variants = COOKING_OVEN_INGREDIENT_ART[game.ovenBase!]?.[id] ?? []
        const src = variants[Math.min(quantity, variants.length) - 1]
        return src ? art(`oven-ingredient-${id}-${quantity}`, src) : null
      })}
      {/* Foreground lip must cover the lower edges of BOTH orders and mate art. */}
      {art('frame', COOKING_ART.frame)}
      {cookingBarPaths(game.stage).map(src => art(src, src))}
      {game.yerbaReady && art('yerba-state', game.yerbaSpilled ? COOKING_ART.yerbaSpilled : COOKING_ART.yerbaOk)}
      {game.mateBase && game.waterReady && art('water-state', game.waterSpilled ? COOKING_ART.waterSpilled : COOKING_ART.waterOk)}
      {held?.kind === 'water' && art('water-active', COOKING_ART.waterActive)}
      {held?.kind === 'yerba' && art('yerba-active', COOKING_ART.yerbaActive)}
      {text('timer', timer, { x: COOKING_TIMER_CENTER.x - 150, y: COOKING_TIMER_CENTER.y - 50, width: 300, height: 100 }, config.timerFontSize, purple)}
      {text('heat', `${game.heat}/10`, config.heatLabel, config.heatLabel.fontSize)}
      {mateStatus && text('mate-status', mateStatus, { x: 812, y: 178, width: 292, height: 48 }, 22, white)}
      {[...selectedControls].map(key => COOKING_GLOW_ART[key] ? art(`glow-${key}`, COOKING_GLOW_ART[key]!) : null)}
      {[...activeControls].map(key => COOKING_ACTIVE_ART[key] ? art(`active-${key}`, COOKING_ACTIVE_ART[key]!) : null)}
      {game.burnt && (COOKING_ART.overcooked ? art('overcooked', COOKING_ART.overcooked) :
        failurePanel('overcooked', 'OVERCOOKED!\nTap the oven to clear', 'oven'))}
      {game.invalidMate && (COOKING_ART.invalidMate ? art('invalid-mate', COOKING_ART.invalidMate) :
        failurePanel('invalid-mate', 'MATE FAILED\nTap to start again', 'mate'))}
      {game.readyFeedbackZone && statusPanel(`food-ready-${game.readyFeedbackZone}`, 'FOOD READY!', game.readyFeedbackZone,
        { r: 0.9, g: 1, b: 0.68, a: 1 })}
      {/* Inputs are last: transparent artwork can never intercept a held button. */}
      {click('CLOSE', () => session.close())}
      {click('BASE_PREVIOUS', () => pageCookingItems('bases', -1))}
      {click('BASE_NEXT', () => pageCookingItems('bases', 1))}
      {click('INGREDIENT_PREVIOUS', () => pageCookingItems('ingredients', -1))}
      {click('INGREDIENT_NEXT', () => pageCookingItems('ingredients', 1))}
      {click('FLAME', () => { game.igniteOven() })}
      {click('OVEN', () => game.selectArea('oven'))}
      {click('MATE', () => game.selectArea('mate'))}
      {click('READY', () => { game.serve() })}
      {([['HEAT_MINUS', -1], ['HEAT_PLUS', 1]] as const).map(([key, direction]) => {
        const handler = createCookingHeatHandlers(session, direction)
        return <UiEntity key={`heat-${direction}`} uiTransform={transform(regions[key])}
          onMouseEnter={() => setHoveredCookingControl(key)}
          onMouseLeave={() => { handler.onMouseLeave(); leaveCookingControl(key) }}
          onMouseDown={() => { setPressedCookingControl(key); handler.onMouseDown() }}
          onMouseUp={() => { handler.onMouseUp(); releaseCookingControl(key) }} />
      })}
      {(() => {
        const key: CookingMaskRegionKey = 'MATE_WATER'
        const handler = createCookingHoldHandlers(session, { key: 'mate-water', kind: 'water' })
        return <UiEntity key="water" uiTransform={transform(regions.MATE_WATER)}
          onMouseEnter={() => setHoveredCookingControl(key)}
          onMouseLeave={() => { handler.onMouseLeave(); leaveCookingControl(key) }}
          onMouseDown={() => { setPressedCookingControl(key); handler.onMouseDown() }}
          onMouseUp={() => { handler.onMouseUp(); releaseCookingControl(key) }} />
      })()}
      {(['bases', 'ingredients'] as const).map(group => (group === 'bases' ? bases : ingredients).map((id, index) => {
        const slot = getCookingItemLayout(group, index, mobile ? 'mobile' : 'desktop', scale)
        const handlers: { onMouseDown: () => void; onMouseUp?: () => void; onMouseLeave?: () => void } = ITEM_DATA[id]?.cooking?.interaction === 'hold-yerba'
          ? createCookingHoldHandlers(session, { key: `${group}:${id}`, kind: 'yerba', itemId: id })
          : { onMouseDown: () => cookingUiAction(() => group === 'bases' ? game.selectBase(id, id.startsWith('mate_')) : game.selectIngredient(id)) }
        const key = `${group === 'bases' ? 'BASE' : 'INGREDIENT'}_${index + 1}` as CookingMaskRegionKey
        return <UiEntity key={`input-${group}-${id}`} uiTransform={{ width: slot.height, height: slot.height,
          positionType: 'absolute', position: { left: slot.left, top: slot.top } }}
          onMouseEnter={() => setHoveredCookingControl(key)}
          onMouseLeave={() => { handlers.onMouseLeave?.(); leaveCookingControl(key) }}
          onMouseDown={() => { setPressedCookingControl(key); handlers.onMouseDown() }}
          onMouseUp={() => { handlers.onMouseUp?.(); releaseCookingControl(key) }} />
      }))}
    </UiEntity>
  </UiEntity>
}
