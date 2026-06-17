import * as THREE from 'three'
import type { InputState } from '../core/InputManager'
import type { TrackPath } from '../track/TrackPath'
import {
  MAX_SPEED, MAX_REVERSE, ACCEL, BRAKE_FORCE, COAST_DECEL,
  STEER_RATE, STEER_RATE_LOW, WALL_BOUNCE, GRASS_DRAG,
  DRIFT_EXTRA_STEER, DRIFT_SIDE_SLIP, DRIFT_MIN_SPEED,
  BOOST_SPEED, TRACK_WIDTH, SPINOUT_DURATION,
} from '../constants'
import { lerp, clamp, lerpAngle } from '../utils/MathUtils'
import type { ItemType } from '../items/ItemSystem'

export const KART_COLORS = [
  0xe03030,  // Player: red
  0x3060e0,  // AI 1:  blue
  0x30a030,  // AI 2:  green
  0xe0b020,  // AI 3:  yellow
]

const _UP    = new THREE.Vector3(0, 1, 0)
const _RIGHT = new THREE.Vector3()
const _DIFF  = new THREE.Vector3()

export abstract class KartBase {
  readonly id: string

  // World state
  position   = new THREE.Vector3()
  speed      = 0          // signed, m/s (positive = forward)
  angle      = 0          // Y-rotation in radians
  sideSlip   = 0          // lateral drift velocity m/s

  // Timers
  spinTimer   = 0
  boostTimer  = 0
  boostSpeed  = BOOST_SPEED
  drifting    = false
  driftDir    = 0         // -1 or 1

  // Race state (filled by RaceManager)
  trackT      = 0
  lap         = 0
  finished    = false
  finishTime  = 0
  heldItem: ItemType | null = null

  // Rendering
  readonly mesh: THREE.Group
  private readonly wheelMeshes: THREE.Mesh[] = []
  private readonly bodyMesh: THREE.Mesh
  private wheelRoll = 0

  // Track reference
  protected trackPath: TrackPath

  // Speed multipliers (rubber band writes to speedMultiplier, AI sets baseSpeedFactor)
  speedMultiplier  = 1.0
  baseSpeedFactor  = 1.0

  constructor(id: string, color: number, trackPath: TrackPath) {
    this.id        = id
    this.trackPath = trackPath
    this.mesh      = buildKartMesh(color, this.wheelMeshes)
    this.bodyMesh  = this.mesh.children[0] as THREE.Mesh
  }

  protected applyInput(input: InputState, dt: number): void {
    // Spinning out — no control
    if (this.spinTimer > 0) {
      this.spinTimer -= dt
      this.angle += 5 * dt * (this.driftDir || 1)
      this.speed  *= (1 - 4 * dt)
      this.sideSlip *= (1 - 4 * dt)
      this.advancePosition(dt)
      return
    }

    const maxSpd = (this.boostTimer > 0 ? this.boostSpeed : MAX_SPEED) * this.speedMultiplier

    // Acceleration / braking
    if (input.accelerate) {
      this.speed = Math.min(this.speed + ACCEL * dt, maxSpd)
    } else if (input.brake) {
      if (this.speed > 0) {
        this.speed = Math.max(this.speed - BRAKE_FORCE * dt, 0)
      } else {
        this.speed = Math.max(this.speed - ACCEL * dt, -MAX_REVERSE)
      }
    } else {
      // Natural deceleration
      const decel = COAST_DECEL * dt
      if (Math.abs(this.speed) < decel) {
        this.speed = 0
      } else {
        this.speed -= Math.sign(this.speed) * decel
      }
    }

    if (this.boostTimer > 0) this.boostTimer -= dt

    // Steering — turn rate proportional to speed
    const absSpd    = Math.abs(this.speed)
    const speedRatio = clamp(absSpd / MAX_SPEED, 0, 1)
    const baseSteer  = lerp(STEER_RATE_LOW, STEER_RATE, speedRatio)

    let steer = 0
    if (input.steerLeft)  steer =  1
    if (input.steerRight) steer = -1

    // Drift
    if (input.drift && absSpd > DRIFT_MIN_SPEED) {
      this.drifting = true
      if (steer !== 0) this.driftDir = steer
      const driftSteer = (this.driftDir || steer) * (baseSteer + DRIFT_EXTRA_STEER)
      this.angle += driftSteer * dt
      // build up side-slip
      this.sideSlip = lerp(
        this.sideSlip,
        this.driftDir * this.speed * DRIFT_SIDE_SLIP,
        10 * dt,
      )
    } else {
      this.drifting = false
      this.angle += steer * baseSteer * dt * Math.sign(this.speed || 1)
      this.sideSlip = lerp(this.sideSlip, 0, 8 * dt)
    }

    this.advancePosition(dt)
    this.resolveTrackBoundary()
  }

  private advancePosition(dt: number): void {
    const fwd = new THREE.Vector3(-Math.sin(this.angle), 0, -Math.cos(this.angle))
    const right = new THREE.Vector3().crossVectors(fwd, _UP)

    this.position.addScaledVector(fwd,   this.speed   * dt)
    this.position.addScaledVector(right, this.sideSlip * dt)
    this.position.y = 0.4   // flat ground
  }

  private resolveTrackBoundary(): void {
    const t     = this.trackPath.getClosestT(this.position)
    const lateral = this.trackPath.getLateralOffset(this.position, t)
    const hw    = TRACK_WIDTH / 2

    if (Math.abs(lateral) > hw) {
      // Push back inside track
      const excess    = Math.abs(lateral) - hw
      const tang      = this.trackPath.getTangentAt(t)
      _RIGHT.crossVectors(tang, _UP).normalize()
      const pushSign  = lateral > 0 ? -1 : 1
      this.position.addScaledVector(_RIGHT, pushSign * (excess + 0.2))
      this.speed    *= WALL_BOUNCE
      this.sideSlip *= WALL_BOUNCE
    } else if (Math.abs(lateral) > hw * 0.85) {
      // Slowing on curb
      this.speed = lerp(this.speed, 0, GRASS_DRAG * 0.05)
    }
  }

  applyBoost(speed: number, duration: number): void {
    this.boostSpeed  = speed
    this.boostTimer  = duration
    this.speed       = Math.max(this.speed, speed * 0.6)
  }

  spinOut(): void {
    this.spinTimer = SPINOUT_DURATION
    this.speed    *= 0.3
  }

  syncMesh(): void {
    this.mesh.position.copy(this.position)
    this.mesh.rotation.y = this.angle

    // Body lean during drift/steer
    if (this.bodyMesh) {
      this.bodyMesh.rotation.z = lerp(
        this.bodyMesh.rotation.z,
        this.drifting ? -this.driftDir * 0.12 : 0,
        8 * 0.016,
      )
    }

    // Wheel roll
    this.wheelRoll += (this.speed / 0.35) * 0.016
    for (const w of this.wheelMeshes) {
      w.rotation.x = this.wheelRoll
    }
  }
}

// ─── Mesh factory ─────────────────────────────────────────────────────────────

function buildKartMesh(color: number, wheels: THREE.Mesh[]): THREE.Group {
  const group = new THREE.Group()

  // Body
  const bodyGeo = new THREE.BoxGeometry(1.4, 0.55, 2.4)
  const bodyMat = new THREE.MeshPhongMaterial({ color, shininess: 80 })
  const body    = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = 0.28
  body.castShadow = true
  group.add(body)

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.0, 0.45, 1.0)
  const cabinMat = new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 40 })
  const cabin    = new THREE.Mesh(cabinGeo, cabinMat)
  cabin.position.set(0, 0.73, -0.1)
  cabin.castShadow = true
  group.add(cabin)

  // Windscreen
  const wsGeo = new THREE.BoxGeometry(0.9, 0.35, 0.05)
  const wsMat = new THREE.MeshPhongMaterial({ color: 0x88ccff, opacity: 0.6, transparent: true })
  const ws    = new THREE.Mesh(wsGeo, wsMat)
  ws.position.set(0, 0.82, -0.62)
  ws.rotation.x = 0.35
  group.add(ws)

  // Wheels (4)
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 12)
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111 })
  const rimGeo   = new THREE.CylinderGeometry(0.18, 0.18, 0.30, 10)
  const rimMat   = new THREE.MeshPhongMaterial({ color: 0x888888 })

  const wheelPositions = [
    [ 0.84, 0, -0.75],   // front-right
    [-0.84, 0,  0.75],   // rear-left
    [-0.84, 0, -0.75],   // front-left
    [ 0.84, 0,  0.75],   // rear-right
  ]

  for (const wp of wheelPositions) {
    const wg  = new THREE.Group()
    const w   = new THREE.Mesh(wheelGeo, wheelMat)
    const rim = new THREE.Mesh(rimGeo, rimMat)
    w.rotation.z = Math.PI / 2
    rim.rotation.z = Math.PI / 2
    wg.add(w)
    wg.add(rim)
    wg.position.set(wp[0]!, wp[1]! + 0.35, wp[2]!)
    wg.castShadow = true
    group.add(wg)
    wheels.push(w)
  }

  return group
}
