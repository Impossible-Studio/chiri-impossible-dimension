import { MapUI } from './mapUI'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { CookingUI } from './cooking/cookingUI'
import { CookingSupplyFeedbackUI } from './cooking/cookingSupplyFeedbackUI'
import { ScoreHud } from './gameplay/scoreHud'
import { ChiriUI } from './companion/chiriUI'
import { HouseEditorUI } from './house/houseEditorUI'
import { SharedZoneUI } from './multiplayer/sharedZoneUI'
import { GiftTargetUI } from './multiplayer/giftUI'
import { DimensionVisitUI } from './house/dimensionVisitUI'
import { isVisitingPlayerDimension, setDimensionVisitChangedListener } from './house/houseSystem'

export function ui() {
  const [, setVisitRevision] = ReactEcs.useState(0)
  setDimensionVisitChangedListener(() => setVisitRevision(value => value + 1))
  if (isVisitingPlayerDimension()) {
    return <UiEntity uiTransform={{ width: '100%', height: '100%', positionType: 'absolute', position: { left: 0, top: 0 }, pointerFilter: 'none' }}>
      {DimensionVisitUI()}
    </UiEntity>
  }
  return <UiEntity uiTransform={{ width: '100%', height: '100%', positionType: 'absolute', position: { left: 0, top: 0 }, pointerFilter: 'none' }}>
    {/* Render the Mini Chiri in the HUD layer before MapUI. Inventory and
        introduction overlays then cover it naturally, like the other minis. */}
    {ChiriUI()}
    {MapUI()}
    {ScoreHud()}
    {CookingUI()}
    {CookingSupplyFeedbackUI()}
    {HouseEditorUI()}
    {SharedZoneUI()}
    {GiftTargetUI()}
  </UiEntity>
}
