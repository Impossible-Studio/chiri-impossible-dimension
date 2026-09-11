import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import {
  getCookingSupplyFeedback,
  closeCookingSupplyFeedback,
  setCookingSupplyFeedbackListener
} from './cookingSupplyFeedback'
import {
  COOKING_SUPPLY_FEEDBACK_STYLE,
  COOKING_SUPPLY_LIMIT_STYLE
} from './cookingSupplyConfig'

export function CookingSupplyFeedbackUI() {
  const [, setRevision] = ReactEcs.useState(0)
  setCookingSupplyFeedbackListener(() => setRevision(value => value + 1))
  const feedback = getCookingSupplyFeedback()
  if (!feedback) return null

  if (feedback.message) {
    const style = COOKING_SUPPLY_LIMIT_STYLE[isMobile() ? 'mobile' : 'desktop']
    return <UiEntity
      key={`cooking-supply-limit-${feedback.id}`}
      uiTransform={{
        width: style.width,
        height: style.height,
        positionType: 'absolute',
        position: { left: '50%', top: '50%' },
        margin: {
          left: -style.width / 2 + style.offsetX,
          top: -style.height / 2 + style.offsetY
        },
        borderRadius: 18,
        zIndex: 76
      }}
      uiBackground={{ color: { r: 0.23, g: 0.08, b: 0.30, a: 0.94 } }}
      onMouseDown={closeCookingSupplyFeedback}
    >
      <Label
        value={feedback.message}
        fontSize={style.fontSize}
        color={{ r: 1, g: 1, b: 1, a: 1 }}
        textAlign="middle-center"
        uiTransform={{ width: '100%', height: '100%', pointerFilter: 'none' }}
      />
    </UiEntity>
  }

  const style = COOKING_SUPPLY_FEEDBACK_STYLE[isMobile() ? 'mobile' : 'desktop']
  return <UiEntity
    key={`cooking-supply-feedback-${feedback.id}`}
    uiTransform={{
      width: style.size,
      height: style.size,
      positionType: 'absolute',
      position: { left: '50%', top: '50%' },
      margin: {
        left: -style.size / 2 + style.offsetX,
        top: -style.size / 2 + style.offsetY
      },
      borderRadius: style.size / 2,
      zIndex: 75,
      pointerFilter: 'none'
    }}
    uiBackground={{ color: { r: 0.2, g: 0.82, b: 0.36, a: 0.94 } }}
  >
    <Label
      value={`+${feedback.amount}`}
      fontSize={style.fontSize}
      color={{ r: 1, g: 1, b: 1, a: 1 }}
      textAlign="middle-center"
      uiTransform={{ width: '100%', height: '100%', pointerFilter: 'none' }}
    />
  </UiEntity>
}
