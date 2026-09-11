import { CONFIG } from './config'

export interface Notification {

  text: string

  createdAt: number

  duration: number

}

let currentNotification: Notification | null = null

export function showNotification(

  text: string,

  duration: number = CONFIG.NOTIFICATION_DURATION

) {

  currentNotification = {

    text,

    createdAt: Date.now(),

    duration

  }

  

}

export function getNotification(): Notification | null {

  if (!currentNotification) {

    return null

  }

  const elapsed = Date.now() - currentNotification.createdAt

  if (elapsed >= currentNotification.duration) {

    currentNotification = null

    return null

  }

  return currentNotification

}

export function updateNotifications() {

  if (!currentNotification) {

    return

  }

  const elapsed = Date.now() - currentNotification.createdAt

  if (elapsed >= currentNotification.duration) {

    currentNotification = null

  }

}