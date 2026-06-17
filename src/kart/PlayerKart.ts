import { KartBase } from './KartBase'
import { inputState } from '../core/InputManager'
import type { TrackPath } from '../track/TrackPath'
import { KART_COLORS } from './KartBase'

export class PlayerKart extends KartBase {
  constructor(trackPath: TrackPath) {
    super('player', KART_COLORS[0]!, trackPath)
  }

  update(dt: number): void {
    this.applyInput(inputState, dt)
    this.syncMesh()
  }
}
