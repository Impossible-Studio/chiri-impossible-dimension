export enum InventoryMask {

  NONE = 0,

  TAB_INVENTORY,

  TAB_FARMING,

  TAB_COOKING,

  TAB_QUESTS,

  CLOSE,

  LEFT,

  RIGHT,

  INFO,

  SLOT

}

export function getSlotFromMask(
  mask: InventoryMask
): number | null {

  switch (mask) {

    case InventoryMask.SLOT:

    default:
      return null

  }

}