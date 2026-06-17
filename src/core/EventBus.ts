import type { ItemType } from '../items/ItemSystem'

export interface GameEvents {
  'kart:lapComplete': { kartId: string; lap: number; time: number }
  'kart:itemPickup':  { kartId: string }
  'kart:hit':         { kartId: string; by: ItemType }
  'kart:boost':       { kartId: string }
  'race:countdown':   { count: number }
  'race:started':     Record<string, never>
  'race:finished':    { order: string[] }
}

type Listener<T> = (data: T) => void

class EventBus {
  private listeners: { [K in keyof GameEvents]?: Array<Listener<GameEvents[K]>> } = {}

  on<K extends keyof GameEvents>(event: K, fn: Listener<GameEvents[K]>): void {
    if (!this.listeners[event]) this.listeners[event] = []
    ;(this.listeners[event] as Array<Listener<GameEvents[K]>>).push(fn)
  }

  off<K extends keyof GameEvents>(event: K, fn: Listener<GameEvents[K]>): void {
    const arr = this.listeners[event] as Array<Listener<GameEvents[K]>> | undefined
    if (!arr) return
    const idx = arr.indexOf(fn)
    if (idx >= 0) arr.splice(idx, 1)
  }

  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    const arr = this.listeners[event] as Array<Listener<GameEvents[K]>> | undefined
    if (!arr) return
    for (const fn of arr) fn(data)
  }
}

export const bus = new EventBus()
