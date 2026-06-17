import type { KartBase } from '../kart/KartBase'

export interface StandingsEntry {
  kartId:     string
  position:   number   // 1-based
  lap:        number
  trackT:     number   // 0–1 within current lap
  finished:   boolean
  finishTime: number   // performance.now() when finished, 0 if not
}

export function computeStandings(karts: KartBase[]): StandingsEntry[] {
  const entries: StandingsEntry[] = karts.map(k => ({
    kartId:     k.id,
    position:   0,
    lap:        k.lap,
    trackT:     k.trackT,
    finished:   k.finished,
    finishTime: k.finishTime,
  }))

  // Sort: finished karts first (by finish time), then by lap+T
  entries.sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime
    if (a.finished) return -1
    if (b.finished) return  1
    const lapDiff = b.lap - a.lap
    if (lapDiff !== 0) return lapDiff
    return b.trackT - a.trackT
  })

  for (let i = 0; i < entries.length; i++) {
    entries[i]!.position = i + 1
  }
  return entries
}
