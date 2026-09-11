import { getPlayer } from '@dcl/sdk/players'

import {
  PlayerData,
  Inventory,
  PlotData,
  PlayerProgress,
  PlayerHouse
} from './types'

import {
  getOrCreatePlayer,
  saveInventory,
  savePlots,
  saveCollected,
  saveProgress,
  saveCookingState,
  saveHouse
} from './storage'

export let playerData: PlayerData | null = null

export async function initializePlayer() {

  const player = getPlayer()

  if (!player) {
    throw new Error('Player not found')
  }

  playerData = await getOrCreatePlayer(player.userId)

  

}

export function isPlayerReady(): boolean {

  return playerData !== null

}

export function getInventory(): Inventory {

  if (!playerData) {
    throw new Error('Player not initialized')
  }

  return playerData.inventory

}

export function getPlots(): Record<number, PlotData | null> {

  if (!playerData) {
    throw new Error('Player not initialized')
  }

  return playerData.plots

}

export function getCollected(): Record<string, number[]> {
  if (!playerData) {
    throw new Error('Player not initialized')
  }
  return playerData.collected
}

export function getProgress(): PlayerProgress {

  if (!playerData) {
    throw new Error('Player not initialized')
  }

  return playerData.progress

}

export function getHouse(): PlayerHouse {
  if (!playerData) {
    throw new Error('Player not initialized')
  }

  return playerData.house
}

export function addCollected(
  cropId: string,
  seedId: number
) {

  if (!playerData) return

  if (!playerData.collected[cropId]) {

    playerData.collected[cropId] = []

  }

  if (
    !playerData.collected[cropId].includes(seedId)
  ) {

    playerData.collected[cropId].push(seedId)

  }

}

export function wasCollected(
  cropId: string,
  seedId: number
): boolean {

  if (!playerData) return false

  return (
    playerData.collected[cropId]?.includes(seedId)
    ?? false
  )

}

export async function syncInventory() {

  if (!playerData) return

  await saveInventory(

    playerData.wallet,

    playerData.inventory

  )

}

export async function syncPlots() {

  if (!playerData) return

  await savePlots(

    playerData.wallet,

    playerData.plots

  )

}

export async function syncCollected() {

  if (!playerData) return

  await saveCollected(

    playerData.wallet,

    playerData.collected

  )

}

export async function syncProgress() {

  if (!playerData) return

  await saveProgress(

    playerData.wallet,

    playerData.progress

  )

}

export async function syncHouse() {
  if (!playerData) return

  await saveHouse(
    playerData.wallet,
    playerData.house
  )
}

export async function syncCookingState() {
  if (!playerData) return
  await saveCookingState(playerData.wallet, playerData.inventory, playerData.progress)
}
