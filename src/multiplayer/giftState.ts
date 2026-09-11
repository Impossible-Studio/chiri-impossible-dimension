import { getPlayer } from '@dcl/sdk/players'
import { addItem, getItemAmount, removeItem } from '../farming/inventory'
import { ITEM_DATA } from '../farming/itemData'
import { closeInventory, openInventory } from '../farming/inventoryUI'
import { syncInventory } from '../farming/player'
import { showNotification } from '../farming/notifications'
import {
  giveStoredHouseFurniture,
  receiveHouseFurnitureGift
} from '../house/houseSystem'
import { sharedZoneRoom } from './sharedZoneProtocol'
import { canModifyCurrentDimension } from '../house/houseSystem'

type GiftTarget = { ownerId: string; name: string }
type PendingGift = { itemId: string }

let target: GiftTarget | null = null
let choosing = false
let revision = 0
const pending = new Map<string, PendingGift>()
const received = new Set<string>()

function changed(): void { revision++ }
export function getGiftRevision(): number { return revision }
export function getGiftTarget(): GiftTarget | null { return target }
export function isChoosingGift(): boolean { return choosing && target !== null }

export function selectGiftTarget(ownerId: string, name?: string): void {
  if (!canModifyCurrentDimension()) return
  const self = getPlayer()?.userId.trim().toLowerCase()
  ownerId = ownerId.trim().toLowerCase()
  if (!ownerId || ownerId === self) return
  target = { ownerId, name: name?.trim() || 'Another Chiri' }
  choosing = false
  changed()
}

export function clearGiftTarget(): void {
  target = null
  choosing = false
  changed()
}

export function beginGiftSelection(): void {
  if (!target || !canModifyCurrentDimension()) return
  choosing = true
  openInventory()
  changed()
}

export function cancelGiftSelection(): void {
  choosing = false
  changed()
}

export function isGiftableItem(itemId: string): boolean {
  const item = ITEM_DATA[itemId]
  return getItemAmount(itemId) > 0 && Boolean(
    itemId.startsWith('house_furniture:') ||
    item?.type === 'food' ||
    itemId.startsWith('prepared_mate_')
  )
}

function consumeGift(itemId: string): boolean {
  if (itemId.startsWith('house_furniture:')) return giveStoredHouseFurniture(itemId) !== null
  if (!removeItem(itemId, 1)) return false
  void syncInventory()
  return true
}

function refundGift(itemId: string): void {
  if (itemId.startsWith('house_furniture:')) receiveHouseFurnitureGift(itemId)
  else {
    addItem(itemId, 1)
    void syncInventory()
  }
}

export function sendSelectedGift(itemId: string): boolean {
  if (!target || !isGiftableItem(itemId) || !consumeGift(itemId)) return false
  const self = getPlayer()?.userId.trim().toLowerCase() ?? ''
  const giftId = `${self}:${Date.now()}:${Math.floor(Math.random() * 1_000_000)}`
  pending.set(giftId, { itemId })
  void sharedZoneRoom.send('giftRequest', {
    giftId,
    targetId: target.ownerId,
    itemId
  })
  choosing = false
  closeInventory()
  changed()
  return true
}

export function initializeGiftSystem(): void {
  sharedZoneRoom.onMessage('giftDelivered', data => {
    if (data.targetId.trim().toLowerCase() !== getPlayer()?.userId.trim().toLowerCase()) return
    if (received.has(data.giftId) || !ITEM_DATA[data.itemId] || !isGiftableDefinition(data.itemId)) return
    received.add(data.giftId)
    if (data.itemId.startsWith('house_furniture:')) receiveHouseFurnitureGift(data.itemId)
    else {
      addItem(data.itemId, 1)
      void syncInventory()
    }
    const senderName = getPlayer({ userId: data.senderId })?.name || 'A player'
    showNotification(`${senderName} sent you a gift!`)
  })

  sharedZoneRoom.onMessage('giftResult', data => {
    const gift = pending.get(data.giftId)
    if (!gift) return
    pending.delete(data.giftId)
    if (!data.accepted) refundGift(gift.itemId)
    showNotification(data.message)
  })
}

function isGiftableDefinition(itemId: string): boolean {
  const item = ITEM_DATA[itemId]
  return Boolean(itemId.startsWith('house_furniture:') || item?.type === 'food' || itemId.startsWith('prepared_mate_'))
}
