import * as THREE from 'three'
import type { KartBase } from '../kart/KartBase'
import { SHELL_SPEED, SHELL_RADIUS, TRACK_WIDTH } from '../constants'
import { bus } from '../core/EventBus'
import type { TrackPath } from '../track/TrackPath'

export class RedShell {
  readonly mesh: THREE.Mesh
  position: THREE.Vector3
  alive  = true
  private angle: number
  private lifetime = 8   // seconds

  constructor(
    startPos: THREE.Vector3,
    startAngle: number,
    private readonly target: KartBase,
    private readonly scene: THREE.Scene,
    private readonly trackPath: TrackPath,
  ) {
    this.position = startPos.clone()
    this.position.y = 0.6
    this.angle = startAngle

    const geo = new THREE.SphereGeometry(0.55, 10, 8)
    const mat = new THREE.MeshPhongMaterial({ color: 0xff2020, emissive: 0x660000, shininess: 120 })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.position.copy(this.position)
    scene.add(this.mesh)
  }

  update(dt: number, allKarts: KartBase[]): void {
    if (!this.alive) return

    this.lifetime -= dt
    if (this.lifetime <= 0) { this.destroy(); return }

    // Steer toward target
    const toTarget = new THREE.Vector3()
      .subVectors(this.target.position, this.position)
    toTarget.y = 0
    const dist = toTarget.length()

    if (dist > 1) {
      toTarget.divideScalar(dist)
      const targetAngle = Math.atan2(-toTarget.x, -toTarget.z)
      const diff = targetAngle - this.angle
      const wrapped = Math.atan2(Math.sin(diff), Math.cos(diff))
      this.angle += Math.sign(wrapped) * Math.min(Math.abs(wrapped), 4 * dt)
    }

    // Move forward
    this.position.x -= Math.sin(this.angle) * SHELL_SPEED * dt
    this.position.z -= Math.cos(this.angle) * SHELL_SPEED * dt
    this.position.y  = 0.6

    // Stay on track (soft)
    const t = this.trackPath.getClosestT(this.position)
    const lateral = this.trackPath.getLateralOffset(this.position, t)
    if (Math.abs(lateral) > TRACK_WIDTH / 2 + 2) {
      this.destroy()
      return
    }

    this.mesh.position.copy(this.position)
    this.mesh.rotation.y += 6 * dt

    // Hit check
    for (const kart of allKarts) {
      if (kart === this.target || kart.finished) continue
      // shells only hit their assigned target
    }
    // Hit the target
    if (this.target.position.distanceTo(this.position) < SHELL_RADIUS) {
      this.target.spinOut()
      bus.emit('kart:hit', { kartId: this.target.id, by: 'redshell' })
      this.destroy()
    }
  }

  destroy(): void {
    this.alive = false
    this.scene.remove(this.mesh)
  }
}

export function launchShell(
  kart: KartBase,
  allKarts: KartBase[],
  scene: THREE.Scene,
  trackPath: TrackPath,
): RedShell | null {
  // Find nearest kart ahead
  const myT = kart.trackT
  let best: KartBase | null = null
  let bestGap = Infinity

  for (const other of allKarts) {
    if (other.id === kart.id || other.finished) continue
    const gap = ((other.trackT - myT + 1) % 1)  // 0..1, small = just ahead
    if (gap < 0.5 && gap < bestGap) {
      bestGap = gap
      best = other
    }
  }

  if (!best) {
    // If no one ahead, target nearest
    let nearest: KartBase | null = null
    let nearDist = Infinity
    for (const other of allKarts) {
      if (other.id === kart.id) continue
      const d = kart.position.distanceTo(other.position)
      if (d < nearDist) { nearDist = d; nearest = other }
    }
    best = nearest
  }

  if (!best) return null

  const startPos = kart.position.clone()
  startPos.x -= Math.sin(kart.angle) * 3
  startPos.z -= Math.cos(kart.angle) * 3

  return new RedShell(startPos, kart.angle, best, scene, trackPath)
}
