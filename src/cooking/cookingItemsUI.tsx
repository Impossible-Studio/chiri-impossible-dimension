import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { ItemCard } from '../farming/itemCard'
import { ITEM_DATA } from '../farming/itemData'
import { INVENTORY_LAYOUT, INVENTORY_SLOT_STYLE } from '../farming/inventoryLayout'
import { ITEM_SLOT_BACKGROUNDS, type ItemSlotCategory } from '../farming/itemSlotCategories'
import { COOKING_ITEM_TEXT_STYLE, getCookingItemLayout, type CookingItemGroup } from './cookingLayout'
import { cookingSession } from './cookingRuntime'
import { createCookingHoldHandlers, type CookingSession } from './cookingSession'

interface CookingItemCardProps {
  group: CookingItemGroup
  // Zero-based position in the VISIBLE slots, not the inventory index.
  slotIndex: number
  itemId: string
  quantity: number
  canvasScale: number
  isHovered?: boolean
  onSelect?: (itemId: string) => void
  session?: CookingSession
  interactive?: boolean
  allowEmpty?: boolean
}

const COOKING_SLOT_CATEGORIES: Record<CookingItemGroup, ItemSlotCategory> = {
  bases: 'oven-base',
  ingredients: 'oven-ingredient',
  orders: 'oven-order'
}

export function getCookingSlotCategory(group: CookingItemGroup) {
  return COOKING_SLOT_CATEGORIES[group]
}

export function CookingEmptySlot({ group, slotIndex, canvasScale }: {
  group: CookingItemGroup
  slotIndex: number
  canvasScale: number
}) {
  const layout = getCookingItemLayout(
    group, slotIndex, isMobile() ? 'mobile' : 'desktop', canvasScale
  )
  return <UiEntity
    key={`empty-${group}-${slotIndex}`}
    uiTransform={{
      width: layout.height, height: layout.height,
      positionType: 'absolute',
      position: { left: layout.left, top: layout.top },
      pointerFilter: 'none'
    }}
    uiBackground={{
      textureMode: 'stretch',
      texture: { src: ITEM_SLOT_BACKGROUNDS[getCookingSlotCategory(group)] }
    }}
  />
}

export function CookingItemCard({
  group, slotIndex, itemId, quantity, canvasScale,
  isHovered = false, onSelect, session = cookingSession, interactive = true, allowEmpty = false
}: CookingItemCardProps) {
  const item = ITEM_DATA[itemId]
  if (!item || (quantity <= 0 && !allowEmpty)) return null
  const layout = getCookingItemLayout(
    group, slotIndex, isMobile() ? 'mobile' : 'desktop', canvasScale
  )
  const sourceKey = `${group}:${slotIndex}:${itemId}`
  const holdToPourYerba = group === 'ingredients' &&
    item.cooking?.group === 'ingredients' &&
    item.cooking.interaction === 'hold-yerba'
  const input = holdToPourYerba
    ? createCookingHoldHandlers(session, { key: sourceKey, kind: 'yerba', itemId })
    : {
      onMouseDown: () => {
        if (session.getState().screen !== 'cooking') return
        session.cancelPour()
        onSelect?.(itemId)
      }
    }

  // Preserve the existing item's internal offsets. Only its local size is
  // changed; the slot's center always comes from the 1536 x 1024 canvas.
  const reference = INVENTORY_LAYOUT.slots[0]
  const center = { x: layout.height / 2, y: layout.height / 2 }
  const slot = {
    item: center,
    quantity: {
      x: center.x + reference.quantity.x - reference.item.x,
      y: center.y + reference.quantity.y - reference.item.y
    },
    name: {
      x: center.x + reference.name.x - reference.item.x,
      y: center.y + reference.name.y - reference.item.y
    }
  }

  return (
    <UiEntity
      key={sourceKey}
      uiTransform={{
        width: layout.height, height: layout.height,
        positionType: 'absolute',
        position: { left: layout.left, top: layout.top },
        overflow: 'visible', pointerFilter: 'none'
      }}
    >
      {ItemCard({
        slot, itemId, quantity,
        isHovered: isHovered || session.isPouring(sourceKey),
        canvasScale: 1,
        cardScale: layout.height / INVENTORY_SLOT_STYLE.backgroundSize,
        // Regular items keep their icon, quantity and metadata, but each
        // oven group has its own slot artwork. Complete mate cards ignore it.
        slotCategory: getCookingSlotCategory(group),
        nameFontSize: COOKING_ITEM_TEXT_STYLE[group].nameFontSize,
        quantityFontSize: COOKING_ITEM_TEXT_STYLE[group].quantityFontSize,
        itemScale: COOKING_ITEM_TEXT_STYLE[group].itemScale,
        quantityOffsetX: COOKING_ITEM_TEXT_STYLE[group].quantityOffsetX,
        quantityOffsetY: COOKING_ITEM_TEXT_STYLE[group].quantityOffsetY,
        nameOffsetY: COOKING_ITEM_TEXT_STYLE[group].nameOffsetY,
        showDimensionOverlay: false
      })}
      {interactive && <UiEntity
        uiTransform={{
          width: layout.height, height: layout.height,
          positionType: 'absolute', position: { left: 0, top: 0 }
        }}
        {...input}
      />}
    </UiEntity>
  )
}

// Bind the final water-button mask region here. No visual mockup is shipped:
// its normal/active images will come from the final cooking artwork.
export function CookingWaterButton({ region, canvasScale, session = cookingSession }: {
  region: { x: number; y: number; width: number; height: number }
  canvasScale: number
  session?: CookingSession
}) {
  return (
    <UiEntity
      uiTransform={{
        width: region.width * canvasScale,
        height: region.height * canvasScale,
        positionType: 'absolute',
        position: { left: region.x * canvasScale, top: region.y * canvasScale }
      }}
      {...createCookingHoldHandlers(session, { key: 'mate-water', kind: 'water' })}
    />
  )
}
