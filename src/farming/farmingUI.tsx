import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'

import {
  isInventoryOpen,
  openInventory,
  closeInventory
} from './inventoryUI'

import {
  getInventoryItems
} from './inventory'

import {
  INVENTORY_LAYOUT,
  INVENTORY_TEXT_STYLE
} from './inventoryLayout'

import {
  INVENTORY_SCALE
} from '../uiLayout'


const ITEM_ICONS: Record<string, string> = {

  seed_eggplant:
    'assets/scene/ui/inventory/items/seed_eggplant.png'

}


const ITEM_NAMES: Record<string, string> = {

  seed_eggplant:
    'Eggplant Seeds'

}


const ITEM_BACKGROUND =
  'assets/scene/ui/inventory/backgrounds/item_background.png'


function renderInventorySlot(
  slot: typeof INVENTORY_LAYOUT.slots[number],
  itemId: string | null,
  quantity: number
) {

  const scale = INVENTORY_SCALE

  const itemBackgroundSize = 170 * scale
  const itemSize = 120 * scale

  const quantityWidth = 70 * scale
  const quantityHeight = 50 * scale

  const nameWidth = 180 * scale
  const nameHeight = 40 * scale

  return (

    <UiEntity

      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',

        position: {
          left: 0,
          top: 0
        }
      }}

    >

      {/* ITEM BACKGROUND */}

      <UiEntity

        uiTransform={{
          width: itemBackgroundSize,
          height: itemBackgroundSize,

          positionType: 'absolute',

          position: {
            left:
              slot.item.x * scale -
              itemBackgroundSize / 2,

            top:
              slot.item.y * scale -
              itemBackgroundSize / 2
          }
        }}

        uiBackground={{
          textureMode: 'stretch',

          texture: {
            src: ITEM_BACKGROUND
          }
        }}

      />


      {/* ITEM ICON */}

      {itemId && ITEM_ICONS[itemId] && (

        <UiEntity

          uiTransform={{
            width: itemSize,
            height: itemSize,

            positionType: 'absolute',

            position: {
              left:
                slot.item.x * scale -
                itemSize / 2,

              top:
                slot.item.y * scale -
                itemSize / 2
            }
          }}

          uiBackground={{
            textureMode: 'stretch',

            texture: {
              src: ITEM_ICONS[itemId]
            }
          }}

        />

      )}


      {/* QUANTITY */}

      {itemId && quantity > 0 && (

        <Label

          value={String(quantity)}

          uiTransform={{
            width: quantityWidth,
            height: quantityHeight,

            positionType: 'absolute',

            position: {
              left:
                slot.quantity.x * scale -
                quantityWidth / 2,

              top:
                slot.quantity.y * scale -
                quantityHeight / 2
            }
          }}

          font={
            INVENTORY_TEXT_STYLE.quantity.font
          }

          fontSize={
            INVENTORY_TEXT_STYLE.quantity.fontSize *
            scale
          }

          textAlign="middle-center"

        />

      )}


      {/* ITEM NAME */}

      {itemId && ITEM_NAMES[itemId] && (

        <Label

          value={ITEM_NAMES[itemId]}

          uiTransform={{
            width: nameWidth,
            height: nameHeight,

            positionType: 'absolute',

            position: {
              left:
                slot.name.x * scale -
                nameWidth / 2,

              top:
                slot.name.y * scale -
                nameHeight / 2
            }
          }}

          font={
            INVENTORY_TEXT_STYLE.itemName.font
          }

          fontSize={
            INVENTORY_TEXT_STYLE.itemName.fontSize *
            scale
          }

          textAlign="middle-center"

        />

      )}

    </UiEntity>

  )
}


export function FarmingUI() {

  const inventoryItems = getInventoryItems()

  const inventoryEntries =
    Object.entries(inventoryItems)

  return (

    <UiEntity

      uiTransform={{
        width: '100%',
        height: '100%'
      }}

    >

      {/* MINI INVENTORY */}

      {!isInventoryOpen() && (

        <UiEntity

          uiTransform={{
            width: 140,
            height: 140,

            positionType: 'absolute',

            position: {
              top: '20px',
              right: isMobile()
                ? '620px'
                : '240px'
            }
          }}

          uiBackground={{
            textureMode: 'stretch',

            texture: {
              src:
                'assets/scene/ui/inventory/miniInventory.png'
            }
          }}

          onMouseDown={() => {
            openInventory()
          }}

        />

      )}


      {/* INVENTORY */}

      {isInventoryOpen() && (

        <UiEntity

          uiTransform={{
            width: '100%',
            height: '100%'
          }}

        >

          {/* DARK OVERLAY */}

          <UiEntity

            uiTransform={{
              width: '100%',
              height: '100%',
              positionType: 'absolute'
            }}

            uiBackground={{
              color: {
                r: 0,
                g: 0,
                b: 0,
                a: 0.5
              }
            }}

          />


          {/* CLOSE OUTSIDE */}

          <UiEntity

            uiTransform={{
              width: '100%',
              height: '100%'
            }}

            onMouseDown={() => {
              closeInventory()
            }}

          />


          {/* INVENTORY CANVAS */}

          <UiEntity

            uiTransform={{
              width:
                1536 * INVENTORY_SCALE,

              height:
                1024 * INVENTORY_SCALE,

              positionType: 'absolute',

              position: {
                left: '50%',
                top: '50%'
              },

              margin: {
                left:
                  -(1536 * INVENTORY_SCALE) / 2,

                top:
                  -(1024 * INVENTORY_SCALE) / 2
              }
            }}

          >

            {/* INVENTORY BACKGROUND */}

            <UiEntity

              uiTransform={{
                width:
                  1536 * INVENTORY_SCALE,

                height:
                  1024 * INVENTORY_SCALE,

                positionType: 'absolute',

                position: {
                  left: 0,
                  top: 0
                }
              }}

              uiBackground={{
                textureMode: 'stretch',

                texture: {
                  src:
                    'assets/scene/ui/inventory/inventory_background.png'
                }
              }}

            />


            {/* ALL 10 SLOTS */}

            {INVENTORY_LAYOUT.slots.map(
              (slot, index) => {

                const entry =
                  inventoryEntries[index]

                const itemId =
                  entry
                    ? entry[0]
                    : null

                const quantity =
                  entry
                    ? Number(entry[1])
                    : 0

                return renderInventorySlot(
                  slot,
                  itemId,
                  quantity
                )

              }
            )}

          </UiEntity>

        </UiEntity>

      )}

    </UiEntity>

  )
}