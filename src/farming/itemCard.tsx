import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { INVENTORY_SLOT_STYLE, INVENTORY_TEXT_STYLE } from './inventoryLayout'
import {
  ITEM_DATA,
  ITEM_METADATA_OVERLAYS_ENABLED,
  getItemDimensionIcon,
  getItemSlotCategory
} from './itemData'
import { ITEM_SLOT_BACKGROUNDS, type ItemSlotCategory } from './itemSlotCategories'

type CardPoint = { x: number; y: number }

export interface ItemCardProps {
  slot: { item: CardPoint; quantity: CardPoint; name: CardPoint }
  itemId: string | null
  quantity: number
  isHovered?: boolean
  // Position comes only from canvasScale; cardScale sizes every layer locally.
  // Increasing a card must never push its neighbours or move its own center.
  canvasScale: number
  cardScale?: number
  slotCategory?: ItemSlotCategory
  // Optional source-pixel sizes used by compact variants such as Cooking.
  // They are still multiplied by cardScale with every other card layer.
  nameFontSize?: number
  quantityFontSize?: number
  itemScale?: number
  quantityOffsetX?: number
  quantityOffsetY?: number
  nameOffsetY?: number
  showDimensionOverlay?: boolean
}

const QUANTITY_CIRCLE_TEXTURE =
  'assets/scene/ui/inventory/items/quantity circle/red_quantity.png'
const ITEM_BACKGROUND = 'assets/scene/ui/inventory/backgrounds/item_background.png'

// Shared by Inventory and Cooking. Complete artwork (e.g. mates) keeps its
// existing treatment: no duplicate background, labels or metadata on top.
export function ItemCard({
  slot,
  itemId,
  quantity,
  isHovered = false,
  canvasScale,
  cardScale,
  slotCategory,
  nameFontSize,
  quantityFontSize,
  itemScale = 1,
  quantityOffsetX = 0,
  quantityOffsetY = 0,
  nameOffsetY = 0,
  showDimensionOverlay = true
}: ItemCardProps) {
  const scale = cardScale ?? canvasScale

  const slotSize =
  INVENTORY_SLOT_STYLE.backgroundSize * scale

const itemSize =
  INVENTORY_SLOT_STYLE.itemSize * scale * itemScale

const hoverSize =
  INVENTORY_SLOT_STYLE.hoverSize * scale

const quantityWidth =
  INVENTORY_SLOT_STYLE.quantityWidth * scale

const quantityHeight =
  INVENTORY_SLOT_STYLE.quantityHeight * scale

const nameWidth =
  INVENTORY_SLOT_STYLE.nameWidth * scale

const nameHeight =
  INVENTORY_SLOT_STYLE.nameHeight * scale


  if (!itemId) {
    return null
  }

  const itemData = ITEM_DATA[itemId]

  const usesCompleteSlotArtwork =
    itemData?.completeSlotArtwork === true

  const renderedItemHeight =
    usesCompleteSlotArtwork ? slotSize : itemSize

  const renderedItemWidth =
    usesCompleteSlotArtwork
      ? renderedItemHeight * (itemData.completeSlotArtworkAspectRatio ?? 1)
      : itemSize

  const displayedSlotCategory = itemData
    ? slotCategory ?? getItemSlotCategory(itemData)
    : 'inventory'


  return (

    <UiEntity

      // A slot is reused when paging/filtering Inventory. Binding its UI
      // identity to the actual item prevents Explorer from displaying the
      // previous slot texture (commonly a seed) while a large collectible PNG
      // is decoded.
      key={`item-card-${itemId}`}

      uiTransform={{
        width: slotSize,
        height: slotSize,

        positionType: 'absolute',

        position: {

  left:
    slot.item.x * canvasScale -
    slotSize / 2,

  top:
    slot.item.y * canvasScale -
    slotSize / 2

}

      }}

      

    >

      {/* ITEM BACKGROUND */}

      {!usesCompleteSlotArtwork && (
      <UiEntity

        uiTransform={{
            width: slotSize,
            height: slotSize,

            positionType: 'absolute',

            position: {
              left: 0,
              top: 0
            }

        }}

        uiBackground={{
          textureMode: 'stretch',

          texture: {
            src: itemData
              ? ITEM_SLOT_BACKGROUNDS[displayedSlotCategory]
              : ITEM_BACKGROUND
          }

        }}

      />
      )}

      {isHovered && !usesCompleteSlotArtwork && (

        <UiEntity

          uiTransform={{
            width: hoverSize,
            height: hoverSize,
            positionType: 'absolute',
            position: {
              left: slotSize / 2 - hoverSize / 2,
              top: slotSize / 2 - hoverSize / 2
            }
          }}

          uiBackground={{
            textureMode: 'stretch',
            texture: {
              src: 'assets/scene/ui/inventory/layers/item_hover.png'
            }
          }}

        />

      )}


      {/* ITEM ICON */}

      {itemData?.icon && (

        <UiEntity

          uiTransform={{
            width: renderedItemWidth,
            height: renderedItemHeight,

            positionType: 'absolute',

            position: {

              left:
                slotSize / 2 -
                renderedItemWidth / 2,

              top:
                slotSize / 2 -
                renderedItemHeight / 2 +
                (usesCompleteSlotArtwork
                  ? 0
                  : INVENTORY_SLOT_STYLE.itemOffsetY * scale)

            }

          }}

          uiBackground={{

            textureMode: 'stretch',

            texture: {

              src:
                itemData.icon

            }

          }}

        />

      )}

      {isHovered && usesCompleteSlotArtwork && (

        <UiEntity

          uiTransform={{
            width: hoverSize,
            height: hoverSize,
            positionType: 'absolute',
            position: {
              left: slotSize / 2 - hoverSize / 2,
              top: slotSize / 2 - hoverSize / 2
            }
          }}

          uiBackground={{
            textureMode: 'stretch',
            texture: {
              src: 'assets/scene/ui/inventory/layers/item_hover.png'
            }
          }}

        />

      )}

      {showDimensionOverlay && ITEM_METADATA_OVERLAYS_ENABLED && itemData && !usesCompleteSlotArtwork && (
        <UiEntity
          uiTransform={{
            width: slotSize * INVENTORY_SLOT_STYLE.dimensionLayerScale,
            height: slotSize * INVENTORY_SLOT_STYLE.dimensionLayerScale,
            positionType: 'absolute',
            position: {
              left:
                slotSize / 2 -
                slotSize * INVENTORY_SLOT_STYLE.dimensionLayerScale / 2 +
                INVENTORY_SLOT_STYLE.dimensionLayerOffsetX * scale,
              top:
                slotSize / 2 -
                slotSize * INVENTORY_SLOT_STYLE.dimensionLayerScale / 2 +
                INVENTORY_SLOT_STYLE.dimensionLayerOffsetY * scale
            }
          }}
          uiBackground={{
            textureMode: 'stretch',
            texture: { src: getItemDimensionIcon(itemData.dimension) }
          }}
        />

      )}


      {/* QUANTITY */}

      {quantity > 0 && (
        !usesCompleteSlotArtwork || itemData?.showQuantityOnCompleteArtwork === true
      ) && (

        <UiEntity
          uiTransform={{
            width: slotSize,
            height: slotSize,
            positionType: 'absolute',
            position: { left: 0, top: 0 }
          }}
        >

        <UiEntity
          uiTransform={{
            width: slotSize,
            height: slotSize,
            positionType: 'absolute',
            position: {
              left: INVENTORY_SLOT_STYLE.quantityCircleOffsetX * scale,
              top: INVENTORY_SLOT_STYLE.quantityCircleOffsetY * scale
            }
          }}
          uiBackground={{
            textureMode: 'stretch',
            texture: { src: QUANTITY_CIRCLE_TEXTURE }
          }}
        />

        <Label

          value={String(quantity)}

          uiTransform={{

            width:
              quantityWidth,

            height:
              quantityHeight,

            positionType:
              'absolute',

            position: {

  left:
    (slot.quantity.x - slot.item.x) * scale -
    quantityWidth / 2 +
    slotSize / 2 +
    quantityOffsetX * scale,

  top:
    (slot.quantity.y - slot.item.y) * scale -
    quantityHeight / 2 +
    slotSize / 2 +
    (4 + quantityOffsetY) * scale

}

          }}

          font={
            INVENTORY_TEXT_STYLE.quantity.font
          }

          fontSize={
            (quantityFontSize ?? INVENTORY_TEXT_STYLE.quantity.fontSize) *
            scale
          }

          textAlign="middle-center"

        />

        </UiEntity>

      )}


      {/* ITEM NAME */}

      {ITEM_DATA[itemId]?.name && !usesCompleteSlotArtwork && (

        <Label

          value={ITEM_DATA[itemId].name}

          uiTransform={{

            width:
              nameWidth,

            height:
              nameHeight,

            positionType:
              'absolute',

            position: {

  left:
    (slot.name.x - slot.item.x) * scale -
    nameWidth / 2 +
    slotSize / 2,

  top:
    (slot.name.y - slot.item.y) * scale -
    nameHeight / 2 +
    slotSize / 2 +
    (INVENTORY_SLOT_STYLE.nameOffsetY + nameOffsetY) * scale

}

          }}

          font={
            INVENTORY_TEXT_STYLE.itemName.font
          }

          fontSize={
            (nameFontSize ?? INVENTORY_TEXT_STYLE.itemName.fontSize) *
            scale
          }

          textAlign="middle-center"

        />

      )}

    </UiEntity>

  )

}
