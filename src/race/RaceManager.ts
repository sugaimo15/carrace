import type { KartBase } from '../kart/KartBase'
import type { TrackPath } from '../track/TrackPath'
import { computeStandings, type StandingsEntry } from './Standings'
import { RUBBER_BAND_BEHIND, RUBBER_BAND_AHEAD, TOTAL_LAPS } from '../constants'
import { bus } from '../core/EventBus'

export type RaceState = 'waiting' | 'countdown' | 'racing' | 'finished'

export class RaceManager {
  state: RaceState = 'waiting'
  standings: StandingsEntry[] = []
  raceTime   = 0
  startTime  = 0

  private countdown      = 3
  private countdownTimer = 0

  constructor(private readonly karts: KartBase[], private readonly trackPath: TrackPath) {}

  startCountdown(): void {
    this.state = 'countdown'
    this.countdown = 3
    this.countdownTimer = 0
    // Show "3" immediately
    bus.emit('race:countdown', { count: 3 })
  }

  update(dt: number, now: number): void {
    if (this.state === 'countdown') {
      this.countdownTimer += dt
      if (this.countdownTimer >= 1) {
        this.countdownTimer -= 1
        this.countdown--
        bus.emit('race:countdown', { count: this.countdown })
        if (this.countdown <= 0) {
          this.state     = 'racing'
          this.startTime = now
          bus.emit('race:started', {})
        }
      }
      return
    }

    if (this.state !== 'racing') return

    this.raceTime = now - this.startTime

    // Update each kart's trackT
    for (const kart of this.karts) {
      kart.trackT = this.trackPath.getClosestT(kart.position)
    }

    this.standings = computeStandings(this.karts)

    // Rubber banding for AI
    const playerEntry = this.standings.find(s => s.kartId === 'player')
    if (playerEntry) {
      for (const kart of this.karts) {
        if (kart.id === 'player' || kart.finished) continue
        const entry = this.standings.find(s => s.kartId === kart.id)
        if (!entry) continue
        const posDiff = entry.position - playerEntry.position
        if (posDiff > 1) {
          // AI is behind — give a boost
          kart.speedMultiplier = kart.baseSpeedFactor * RUBBER_BAND_BEHIND
        } else if (posDiff < -1) {
          // AI is comfortably ahead — slow down
          kart.speedMultiplier = kart.baseSpeedFactor * RUBBER_BAND_AHEAD
        } else {
          kart.speedMultiplier = kart.baseSpeedFactor
        }
      }
    }

    if (this.karts.every(k => k.finished)) {
      this.state = 'finished'
      bus.emit('race:finished', { order: this.standings.map(s => s.kartId) })
    }
  }

  getPositionOf(kartId: string): number {
    return this.standings.find(s => s.kartId === kartId)?.position ?? 1
  }
}
