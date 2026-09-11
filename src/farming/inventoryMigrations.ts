import type { Inventory } from './types'

const LEGACY_PREPARED_MATE_ID = 'prepared_mate'
const PREPARED_INFINITE_MATE_ID = 'prepared_mate_infinite'

// Early kitchen builds saved Infinite Mate under a generic id. Fold that old
// stock into the specific cooked item so it is displayed as one inventory card
// without affecting the collectible Mate picked up in the world.
export function migrateLegacyPreparedMate(inventory: Inventory): boolean {
  const legacyAmount = Number(inventory.items[LEGACY_PREPARED_MATE_ID] ?? 0)
  const hasLegacyItem = LEGACY_PREPARED_MATE_ID in inventory.items
  const hasLegacyOrder = inventory.itemOrder.includes(LEGACY_PREPARED_MATE_ID)

  if (!hasLegacyItem && !hasLegacyOrder) return false

  if (Number.isFinite(legacyAmount) && legacyAmount > 0) {
    const currentAmount = Number(
      inventory.items[PREPARED_INFINITE_MATE_ID] ?? 0
    )
    inventory.items[PREPARED_INFINITE_MATE_ID] =
      (Number.isFinite(currentAmount) && currentAmount > 0 ? currentAmount : 0) +
      legacyAmount
  }

  delete inventory.items[LEGACY_PREPARED_MATE_ID]

  const migratedOrder: string[] = []
  for (const itemId of inventory.itemOrder) {
    const migratedId = itemId === LEGACY_PREPARED_MATE_ID
      ? PREPARED_INFINITE_MATE_ID
      : itemId
    if (!migratedOrder.includes(migratedId)) migratedOrder.push(migratedId)
  }
  if (
    (inventory.items[PREPARED_INFINITE_MATE_ID] ?? 0) > 0 &&
    !migratedOrder.includes(PREPARED_INFINITE_MATE_ID)
  ) {
    migratedOrder.push(PREPARED_INFINITE_MATE_ID)
  }
  inventory.itemOrder = migratedOrder

  return true
}
