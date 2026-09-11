import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import {
  getDimensionVisitRevision,
  isVisitingPlayerDimension,
  returnToOwnDimension
} from './houseSystem'

export function DimensionVisitUI() {
  getDimensionVisitRevision()
  if (!isVisitingPlayerDimension()) return <UiEntity uiTransform={{ width: 0, height: 0, pointerFilter: 'none' }} />
  return <UiEntity
    uiTransform={{
      width: 250,
      height: 52,
      positionType: 'absolute',
      position: { top: 24, left: '50%' },
      margin: { left: -125 },
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 18,
      pointerFilter: 'block'
    }}
    uiBackground={{ color: { r: .76, g: .57, b: 1, a: .98 } }}
    onMouseDown={returnToOwnDimension}
  >
    <Label value="BACK TO MY DIMENSION" color={{ r: .08, g: .08, b: .22, a: 1 }} fontSize={16} textAlign="middle-center" uiTransform={{ width: '100%', height: '100%', pointerFilter: 'none' }} />
  </UiEntity>
}
