import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import {
  getHouseEditorRevision,
  getHouseEditorSnapshot,
  moveSelectedHouseFurniture,
  rotateSelectedHouseFurniture,
  saveSelectedHouseFurnitureToInventory,
  toggleHouseEditorMode
} from './houseSystem'

const BUTTON_WIDTH = 184
const BUTTON_HEIGHT = 48

function editorButton(
  key: string,
  text: string,
  background: { r: number; g: number; b: number; a: number },
  onMouseDown: () => void
) {
  return <UiEntity
    key={key}
    uiTransform={{
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      margin: { bottom: 10 },
      pointerFilter: 'block'
    }}
    uiBackground={{ color: background }}
    onMouseDown={onMouseDown}
  >
    <Label
      value={text}
      color={{ r: 0.12, g: 0.08, b: 0.22, a: 1 }}
      fontSize={15}
      textAlign="middle-center"
      uiTransform={{ width: '100%', height: '100%', pointerFilter: 'none' }}
    />
  </UiEntity>
}

export function HouseEditorUI() {
  // Reading the revision keeps this renderer synchronized with world clicks.
  getHouseEditorRevision()
  const editor = getHouseEditorSnapshot()
  if (!editor.visible) {
    return <UiEntity uiTransform={{ width: 0, height: 0, pointerFilter: 'none' }} />
  }

  return <UiEntity
    uiTransform={{
      width: BUTTON_WIDTH,
      height: 340,
      positionType: 'absolute',
      position: { right: isMobile() ? 220 : 28, top: isMobile() ? '26%' : '36%' },
      flexDirection: 'column',
      pointerFilter: 'none'
    }}
  >
    <Label
      value={editor.selectedName.toUpperCase()}
      color={{ r: 1, g: 1, b: 1, a: 1 }}
      fontSize={13}
      textAlign="middle-center"
      uiTransform={{ width: BUTTON_WIDTH, height: 26, margin: { bottom: 7 }, pointerFilter: 'none' }}
    />
    {editorButton(
      'house-store',
      'SAVE TO INVENTORY',
      { r: 0.96, g: 0.68, b: 0.84, a: 0.98 },
      saveSelectedHouseFurnitureToInventory
    )}
    {editorButton(
      'house-mode',
      editor.mode === 'move' ? 'ROTATE' : 'MOVE',
      { r: 0.73, g: 0.62, b: 1, a: 0.98 },
      toggleHouseEditorMode
    )}
    <UiEntity uiTransform={{ width: BUTTON_WIDTH, height: 150, flexWrap: 'wrap', justifyContent: 'space-between', pointerFilter: 'none' }}>
      {(['x', 'y', 'z'] as const).flatMap(axis => ([-1, 1] as const).map(direction =>
        <UiEntity
          key={`${axis}-${direction}`}
          uiTransform={{ width: 86, height: 42, margin: { bottom: 6 }, justifyContent: 'center', alignItems: 'center', borderRadius: 12, pointerFilter: 'block' }}
          uiBackground={{ color: axis === 'x'
            ? { r: .95, g: .12, b: .18, a: .96 }
            : axis === 'y'
              ? { r: .16, g: .82, b: .25, a: .96 }
              : { r: .12, g: .38, b: 1, a: .96 } }}
          onMouseDown={() => editor.mode === 'move'
            ? moveSelectedHouseFurniture({
                x: axis === 'x' ? .25 * direction : 0,
                y: axis === 'y' ? .25 * direction : 0,
                z: axis === 'z' ? .25 * direction : 0
              })
            : rotateSelectedHouseFurniture(axis, 90 * direction)}
        >
          <Label value={`${axis.toUpperCase()} ${direction > 0 ? '+' : '−'}`} color={{ r: 1, g: 1, b: 1, a: 1 }} fontSize={16} textAlign="middle-center" uiTransform={{ width: '100%', height: '100%', pointerFilter: 'none' }} />
        </UiEntity>
      ))}
    </UiEntity>
  </UiEntity>
}
