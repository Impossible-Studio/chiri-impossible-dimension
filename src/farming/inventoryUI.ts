let inventoryOpen = false

export function openInventory() {

  inventoryOpen = true

}

export function closeInventory() {

  inventoryOpen = false

}

export function toggleInventory() {

  inventoryOpen = !inventoryOpen

}

export function isInventoryOpen() {

  return inventoryOpen

}

export function initializeInventoryUI() {

}