import { getInventory } from './player'


// ======================================================
// ITEM AMOUNT
// ======================================================

export function getItemAmount(
  itemId: string
): number {

  const inventory = getInventory()

  return inventory.items[itemId] ?? 0

}


// ======================================================
// HAS ITEM
// ======================================================

export function hasItem(
  itemId: string,
  amount: number = 1
): boolean {

  return getItemAmount(itemId) >= amount

}


// ======================================================
// ITEM ORDER
// ======================================================

export function getInventoryOrder(): string[] {

  const inventory = getInventory()

  return inventory.itemOrder ?? []

}


// ======================================================
// ADD ITEM
// ======================================================

export function addItem(
  itemId: string,
  amount: number = 1
) {

  const inventory = getInventory()

  const currentAmount =
    getItemAmount(itemId)

  inventory.items[itemId] =
    currentAmount + amount


  // ==============================================
  // FIRST TIME DISCOVERED
  // ==============================================

  if (
    currentAmount <= 0 &&
    !inventory.itemOrder.includes(itemId)
  ) {

    inventory.itemOrder.push(itemId)

  }

}

export function discoverItem(itemId: string): boolean {
  const inventory = getInventory()
  if (inventory.itemOrder.includes(itemId)) return false
  inventory.itemOrder.push(itemId)
  return true
}


// ======================================================
// REMOVE ITEM
// ======================================================

export function removeItem(
  itemId: string,
  amount: number = 1
): boolean {

  if (!hasItem(itemId, amount)) {

    return false

  }


  const inventory = getInventory()

  inventory.items[itemId] -= amount


  // ==============================================
  // ITEM REACHED ZERO
  // ==============================================

  if (
    inventory.items[itemId] <= 0
  ) {

    delete inventory.items[itemId]

    // itemOrder is also the permanent discovery history used by Chiri's
    // Collection. Inventory already filters zero-amount entries, so retaining
    // this id does not leave an empty card in the backpack.

  }


  return true

}


// ======================================================
// INVENTORY ITEMS
// ======================================================

export function getInventoryItems() {

  return getInventory().items

}
