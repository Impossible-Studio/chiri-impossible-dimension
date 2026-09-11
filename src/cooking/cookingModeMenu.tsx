import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { cookingSession } from './cookingRuntime'
import type { CookingSession } from './cookingSession'

type MenuRegion = { x: number; y: number; width: number; height: number }

export interface CookingModeMenuProps {
  background: string
  sourceWidth: number
  sourceHeight: number
  canvasScale: number
  regions: { COOK: MenuRegion; ARCADE: MenuRegion; CLOSE: MenuRegion }
  session?: CookingSession
  arcadeEnabled?: boolean
  mobile?: boolean
  glows?: Partial<Record<'COOK' | 'ARCADE' | 'CLOSE', string>>
  offsetX?: number
  offsetY?: number
}

// Render only once the final menu background and its mask regions are ready.
// The backdrop always covers the real viewport, independent of panel scale.
export function CookingModeMenu({
  background, sourceWidth, sourceHeight, canvasScale, regions,
  session = cookingSession, arcadeEnabled = false, mobile = false,
  glows = {}, offsetX = 0, offsetY = 0
}: CookingModeMenuProps) {
  const [hovered, setHovered] = ReactEcs.useState<keyof typeof regions | null>(null)
  const [pressed, setPressed] = ReactEcs.useState<keyof typeof regions | null>(null)
  if (session.getState().screen !== 'choose-mode') return null
  const button = (key: keyof typeof regions, onSelect: () => void) => {
    const region = regions[key]
    const enabled = key !== 'ARCADE' || arcadeEnabled
    return (
      <UiEntity
        key={key}
        uiTransform={{
          width: region.width * canvasScale, height: region.height * canvasScale,
          positionType: 'absolute',
          position: { left: region.x * canvasScale, top: region.y * canvasScale }
        }}
        onMouseEnter={() => { if (enabled && !mobile) setHovered(key) }}
        onMouseLeave={() => {
          if (!mobile) setHovered(value => value === key ? null : value)
          setPressed(value => value === key ? null : value)
        }}
        onMouseDown={() => { if (enabled) setPressed(key) }}
        onMouseUp={() => {
          if (!enabled) return
          setPressed(null)
          onSelect()
        }}
      />
    )
  }
  const visibleGlow = pressed ?? (!mobile ? hovered : null)
  return (
    <UiEntity
      uiTransform={{
        width: '100%', height: '100%', positionType: 'absolute',
        position: { left: 0, top: 0 }, zIndex: 40
      }}
      uiBackground={{ color: { r: 0, g: 0, b: 0, a: 0.5 } }}
    >
      {/* Keep outside-close as a sibling behind the panel. Pointer events can
          bubble through nested SDK UI entities on some Explorer builds; when
          close lived on this parent it closed on mouse-down before Cook's
          mouse-up could switch screens. */}
      <UiEntity key="mode-menu-outside-close"
        uiTransform={{ width: '100%', height: '100%', positionType: 'absolute',
          position: { left: 0, top: 0 }, zIndex: 0 }}
        onMouseDown={() => session.close()} />
      <UiEntity
        uiTransform={{
          width: sourceWidth * canvasScale, height: sourceHeight * canvasScale,
          positionType: 'absolute',
          position: { left: '50%', top: '50%' },
          margin: {
            left: -sourceWidth * canvasScale / 2 + offsetX,
            top: -sourceHeight * canvasScale / 2 + offsetY
          },
          zIndex: 1,
          pointerFilter: 'block'
        }}
        uiBackground={background ? { textureMode: 'stretch', texture: { src: background } } : { color: { r: 0.26, g: 0.12, b: 0.36, a: 1 } }}
      >
        {visibleGlow && glows[visibleGlow] && <UiEntity key={`mode-glow-${visibleGlow}`}
          uiTransform={{ width: sourceWidth * canvasScale, height: sourceHeight * canvasScale,
            positionType: 'absolute', position: { left: 0, top: 0 }, pointerFilter: 'none' }}
          uiBackground={{ textureMode: 'stretch', texture: { src: glows[visibleGlow] } }} />}
        {button('COOK', () => { session.chooseMode('cook') })}
        {button('ARCADE', () => { if (arcadeEnabled) session.chooseMode('arcade') })}
        {button('CLOSE', () => session.close())}
        {!background && (['COOK', 'ARCADE', 'CLOSE'] as const).map(key => (
          <Label key={`label-${key}`} value={key === 'CLOSE' ? 'X' : key === 'ARCADE' ? 'ARCADE · SOON' : 'COOK'}
            fontSize={28 * canvasScale} color={{ r: 1, g: 0.9, b: 0.7, a: 1 }}
            uiTransform={{ width: regions[key].width * canvasScale, height: regions[key].height * canvasScale,
              positionType: 'absolute', pointerFilter: 'none',
              position: { left: regions[key].x * canvasScale, top: regions[key].y * canvasScale } }} />
        ))}
      </UiEntity>
    </UiEntity>
  )
}
