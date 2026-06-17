import * as THREE from 'three'
import { KartBase, KART_COLORS } from './KartBase'
import type { TrackPath } from '../track/TrackPath'
import { AI_LOOKAHEAD, AI_SPEED_FACTOR } from '../constants'
import type { InputState } from '../core/InputManager'
import { clamp } from '../utils/MathUtils'

const _FWD  = new THREE.Vector3()
const _TO   = new THREE.Vector3()

export class AIKart extends KartBase {
  private readonly lookahead: number
  private readonly baseFactor: number

  constructor(index: number, trackPath: TrackPath) {
    super(`ai_${index}`, KART_COLORS[index + 1]!, trackPath)
    this.lookahead       = AI_LOOKAHEAD * (0.8 + Math.random() * 0.4)
    this.baseFactor      = AI_SPEED_FACTOR[index] ?? 0.92
    this.baseSpeedFactor = this.baseFactor
    this.speedMultiplier = this.baseFactor
  }

  update(dt: number): void {
    if (this.finished) { this.syncMesh(); return }

    const currentT  = this.trackPath.getClosestT(this.position)
    const targetT   = (currentT + this.lookahead) % 1
    const target    = this.trackPath.getPointAt(targetT)

    // Forward vector in XZ plane
    _FWD.set(-Math.sin(this.angle), 0, -Math.cos(this.angle))

    // Direction to target
    _TO.subVectors(target, this.position)
    _TO.y = 0
    const dist = _TO.length()
    if (dist > 0.001) _TO.divideScalar(dist)

    // Cross product Y component = steering signal
    const cross = _FWD.x * _TO.z - _FWD.z * _TO.x  // sin of angle between

    const input: InputState = {
      accelerate: true,
      brake:      false,
      steerLeft:  cross > 0.08,
      steerRight: cross < -0.08,
      drift:      false,
      useItem:    false,
    }

    // Brake before tight corners (large cross product = sharp turn)
    const sharpness = Math.abs(cross)
    if (sharpness > 0.5) {
      input.accelerate = false
      input.brake      = true
    }

    this.applyInput(input, dt)
    this.syncMesh()
  }
}
