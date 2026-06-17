import type { KartBase } from '../kart/KartBase'
import { NUM_CHECKPOINTS, TOTAL_LAPS } from '../constants'
import { bus } from '../core/EventBus'

interface KartProgress {
  lastT:              number
  nextCheckpoint:     number   // 0..NUM_CHECKPOINTS-1
  checkpointsThisLap: Set<number>
}

// Checkpoint T-values evenly spaced 0..1
const CP_INTERVALS = Array.from({ length: NUM_CHECKPOINTS }, (_, i) => i / NUM_CHECKPOINTS)

export class CheckpointSystem {
  private progress = new Map<string, KartProgress>()

  register(kart: KartBase): void {
    this.progress.set(kart.id, {
      lastT:              kart.trackT,
      nextCheckpoint:     1,   // expect cp=1 first (kart starts at/near cp=0)
      checkpointsThisLap: new Set(),
    })
  }

  update(karts: KartBase[], now: number): void {
    for (const kart of karts) {
      if (kart.finished) continue
      const prog = this.progress.get(kart.id)
      if (!prog) continue

      const t    = kart.trackT
      const last = prog.lastT

      // Collect checkpoints in order
      for (let cp = 0; cp < NUM_CHECKPOINTS; cp++) {
        const cpT = CP_INTERVALS[cp]!
        if (this.crossed(last, t, cpT) && cp === prog.nextCheckpoint) {
          prog.checkpointsThisLap.add(cp)
          prog.nextCheckpoint = (cp + 1) % NUM_CHECKPOINTS
        }
      }

      // Lap complete: crossed finish line (cp=0 / t=0) coming from second half
      if (this.crossed(last, t, 0) && last > 0.5) {
        if (prog.checkpointsThisLap.size >= NUM_CHECKPOINTS) {
          kart.lap++
          prog.checkpointsThisLap.clear()
          prog.nextCheckpoint = 1

          bus.emit('kart:lapComplete', { kartId: kart.id, lap: kart.lap, time: now })

          if (kart.lap >= TOTAL_LAPS) {
            kart.finished   = true
            kart.finishTime = now
          }
        }
      }

      prog.lastT = t
    }
  }

  // Returns true if the track-T parameter crossed cpT going forward
  private crossed(last: number, cur: number, cpT: number): boolean {
    if (last <= cur) {
      // No wrap-around
      return last < cpT && cpT <= cur
    } else {
      // Wrapped past 1→0 boundary
      return cpT > last || cpT <= cur
    }
  }
}
