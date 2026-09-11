import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import {
  clearSharedObjectSelection,
  getSharedEditorRevision,
  getSharedEditorSnapshot,
  moveSelectedSharedObject,
  rotateSelectedSharedObject,
  saveSelectedSharedObjectToInventory
} from './sharedZoneRuntime'

const WIDTH = 184

function button(key: string, text: string, width: number, color: { r: number; g: number; b: number; a: number }, action: () => void) {
  return <UiEntity key={key} uiTransform={{ width, height: 46, margin: { bottom: 8 }, justifyContent: 'center', alignItems: 'center', borderRadius: 14, pointerFilter: 'block' }} uiBackground={{ color }} onMouseDown={action}>
    <Label value={text} color={{ r: 1, g: 1, b: 1, a: 1 }} fontSize={14} textAlign="middle-center" uiTransform={{ width: '100%', height: '100%', pointerFilter: 'none' }} />
  </UiEntity>
}

export function SharedZoneUI() {
  getSharedEditorRevision()
  const state = getSharedEditorSnapshot()
  if (!state.visible) return <UiEntity uiTransform={{ width: 0, height: 0, pointerFilter: 'none' }} />
  return <UiEntity uiTransform={{ width: WIDTH, height: 360, positionType: 'absolute', position: { right: isMobile() ? 220 : 28, top: isMobile() ? '24%' : '35%' }, flexDirection: 'column', pointerFilter: 'none' }}>
    <Label value={state.itemName.toUpperCase()} color={{ r: 1, g: 1, b: 1, a: 1 }} fontSize={13} textAlign="middle-center" uiTransform={{ width: WIDTH, height: 28, pointerFilter: 'none' }} />
    {!state.locked && <Label value="SELECTED — TAP AGAIN" color={{ r: 1, g: .85, b: .3, a: 1 }} fontSize={11} textAlign="middle-center" uiTransform={{ width: WIDTH, height: 24, pointerFilter: 'none' }} />}
    <UiEntity uiTransform={{ width: WIDTH, height: 148, flexWrap: 'wrap', justifyContent: 'space-between', pointerFilter: 'none' }}>
      {(['x', 'y', 'z'] as const).flatMap(axis => ([-1, 1] as const).map(direction =>
        <UiEntity key={`${axis}-${direction}`} uiTransform={{ width: 86, height: 42, margin: { bottom: 6 }, justifyContent: 'center', alignItems: 'center', borderRadius: 12, pointerFilter: 'block' }} uiBackground={{ color: axis === 'x' ? { r: .95, g: .12, b: .18, a: .96 } : axis === 'y' ? { r: .16, g: .82, b: .25, a: .96 } : { r: .12, g: .38, b: 1, a: .96 } }} onMouseDown={() => moveSelectedSharedObject(axis, .25 * direction)}>
          <Label value={`${axis.toUpperCase()} ${direction > 0 ? '+' : '−'}`} color={{ r: 1, g: 1, b: 1, a: 1 }} fontSize={16} textAlign="middle-center" uiTransform={{ width: '100%', height: '100%', pointerFilter: 'none' }} />
        </UiEntity>
      ))}
    </UiEntity>
    <UiEntity uiTransform={{ width: WIDTH, height: 48, flexDirection: 'row', justifyContent: 'space-between', pointerFilter: 'none' }}>
      {button('rotate-left', '↶ 90°', 86, { r: .55, g: .35, b: .95, a: .98 }, () => rotateSelectedSharedObject(-1))}
      {button('rotate-right', '↷ 90°', 86, { r: .55, g: .35, b: .95, a: .98 }, () => rotateSelectedSharedObject(1))}
    </UiEntity>
    {state.canStore && button('shared-store', 'SAVE TO INVENTORY', WIDTH, { r: .96, g: .52, b: .76, a: .98 }, saveSelectedSharedObjectToInventory)}
    {button('shared-done', 'DONE', WIDTH, { r: .2, g: .65, b: .92, a: .98 }, clearSharedObjectSelection)}
  </UiEntity>
}
