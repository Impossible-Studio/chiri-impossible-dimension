let menuOpen = false

let selectedPlot: number | null = null

export function initializePlantMenu() {

}

export function showPlantMenu(
  plotId: number
) {

  selectedPlot = plotId

  menuOpen = true

}

export function hidePlantMenu() {

  selectedPlot = null

  menuOpen = false

}

export function isPlantMenuOpen() {

  return menuOpen

}

export function getSelectedPlot() {

  return selectedPlot

}