import * as THREE from 'three'
import type { KartBase } from '../kart/KartBase'
import { lerp, clamp } from '../utils/MathUtils'

const _DESIRED = new THREE.Vector3()
const _LOOK    = new THREE.Vector3()
const _OFFSET  = new THREE.Vector3(0, 5, 12)

export class ChaseCamera {
  readonly camera: THREE.PerspectiveCamera
  private smoothPos = new THREE.Vector3()
  private initialized = false

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.5,
      2000,
    )
  }

  update(dt: number, kart: KartBase): void {
    const sin = Math.sin(kart.angle)
    const cos = Math.cos(kart.angle)

    // Camera sits behind and above the kart (in kart-local space)
    const offsetX = _OFFSET.x * cos - _OFFSET.z * sin
    const offsetZ = _OFFSET.x * sin + _OFFSET.z * cos

    _DESIRED.set(
      kart.position.x + offsetX,
      kart.position.y + _OFFSET.y,
      kart.position.z + offsetZ,
    )

    // Look target: slightly ahead of the kart
    const aheadX = -sin * 4
    const aheadZ = -cos * 4
    _LOOK.set(
      kart.position.x + aheadX,
      kart.position.y + 1.5,
      kart.position.z + aheadZ,
    )

    if (!this.initialized) {
      this.smoothPos.copy(_DESIRED)
      this.initialized = true
    }

    // Spring damping: stiffness 6 → critical damped feel
    const alpha = 1 - Math.exp(-6 * dt)
    this.smoothPos.lerp(_DESIRED, alpha)

    this.camera.position.copy(this.smoothPos)
    this.camera.lookAt(_LOOK)

    // Slight FOV increase with speed (feel of velocity)
    const speedRatio = clamp(Math.abs(kart.speed) / 28, 0, 1)
    this.camera.fov  = lerp(68, 85, speedRatio)
    this.camera.updateProjectionMatrix()
  }

  onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
  }
}
