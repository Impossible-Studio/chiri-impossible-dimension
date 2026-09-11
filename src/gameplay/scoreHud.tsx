import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { isPlayerReady } from '../farming/player'
import { getTotalPoints } from './points'
import {
  SCORE_HUD_IMAGE,
  SCORE_HUD_LAYOUT,
  SCORE_HUD_NUMBER_COLOR,
  SCORE_HUD_SOURCE
} from './scoreHudConfig'
import { setPointsChangeListener } from './pointsConfig'

export function formatScore(points: number): string {
  return Math.max(0, Math.floor(Number.isFinite(points) ? points : 0))
    .toLocaleString('en-US')
}

export function ScoreHud() {
  const [, setRevision] = ReactEcs.useState<number>(0)
  setPointsChangeListener(() => setRevision(revision => revision + 1))

  const layout = isMobile()
    ? SCORE_HUD_LAYOUT.mobile
    : SCORE_HUD_LAYOUT.desktop
  const imageScale = layout.totalWidth / SCORE_HUD_SOURCE.width
  const totalHeight = SCORE_HUD_SOURCE.height * imageScale
  const area = SCORE_HUD_SOURCE.scoreArea
  const score = isPlayerReady() ? getTotalPoints() : 0

  return (
    <UiEntity
      key="score-hud"
      uiTransform={{
        width: layout.totalWidth,
        height: totalHeight,
        positionType: 'absolute',
        position: { left: layout.left, top: layout.top },
        zIndex: 25,
        pointerFilter: 'none'
      }}
      uiBackground={{
        textureMode: 'stretch',
        texture: { src: SCORE_HUD_IMAGE }
      }}
    >
      <Label
        value={formatScore(score)}
        uiTransform={{
          width: area.width * imageScale,
          height: area.height * imageScale,
          positionType: 'absolute',
          position: {
            left: area.x * imageScale + layout.numberOffsetX,
            top: area.y * imageScale + layout.numberOffsetY
          },
          pointerFilter: 'none'
        }}
        font="sans-serif"
        fontSize={layout.numberFontSize}
        color={SCORE_HUD_NUMBER_COLOR}
        textAlign="middle-left"
      />
    </UiEntity>
  )
}
