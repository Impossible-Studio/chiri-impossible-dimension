import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import {
  beginGiftSelection,
  clearGiftTarget,
  getGiftRevision,
  getGiftTarget,
  isChoosingGift
} from './giftState'
import { isInventoryOpen } from '../farming/inventoryUI'

export function GiftTargetUI() {
  getGiftRevision()
  const target = getGiftTarget()
  if (!target || isChoosingGift() || isInventoryOpen()) {
    return <UiEntity uiTransform={{ width: 0, height: 0, pointerFilter: 'none' }} />
  }
  return <UiEntity uiTransform={{ width: 180, height: 106, positionType: 'absolute', position: { right: isMobile() ? 220 : 28, top: '38%' }, flexDirection: 'column', pointerFilter: 'none' }}>
    <Label value={target.name} color={{ r: 1, g: 1, b: 1, a: 1 }} fontSize={14} textAlign="middle-center" uiTransform={{ width: 180, height: 26, pointerFilter: 'none' }} />
    <UiEntity uiTransform={{ width: 180, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 16, pointerFilter: 'block' }} uiBackground={{ color: { r: .95, g: .48, b: .76, a: .98 } }} onMouseDown={beginGiftSelection}>
      <Label value="SEND GIFT" color={{ r: 1, g: 1, b: 1, a: 1 }} fontSize={17} textAlign="middle-center" uiTransform={{ width: '100%', height: '100%', pointerFilter: 'none' }} />
    </UiEntity>
    <UiEntity uiTransform={{ width: 180, height: 25, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }} onMouseDown={clearGiftTarget}>
      <Label value="CANCEL" color={{ r: 1, g: 1, b: 1, a: .85 }} fontSize={11} textAlign="middle-center" uiTransform={{ width: '100%', height: '100%', pointerFilter: 'none' }} />
    </UiEntity>
  </UiEntity>
}
