import * as THREE from 'three'
import type { KartBase } from '../kart/KartBase'
import { BANANA_RADIUS } from '../constants'
import { bus } from '../core/EventBus'

export class BananaPeel {
  readonly mesh: THREE.Mesh
  position: THREE.Vector3
  alive = true

  constructor(pos: THREE.Vector3, private readonly scene: THREE.Scene) {
    this.position = pos.clone()
    this.position.y = 0.3

    const geo = new THREE.SphereGeometry(0.6, 8, 6)
    const mat = new THREE.MeshPhongMaterial({ color: 0xffe000, emissive: 0x443300 })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.position.copy(this.position)
    this.mesh.scale.set(1.4, 0.4, 1.4)
    scene.add(this.mesh)
  }

  update(karts: KartBase[]): void {
    if (!this.alive) return
    for (const kart of karts) {
      if (kart.finished) continue
      if (kart.position.distanceTo(this.position) < BANANA_RADIUS) {
        kart.spinOut()
        bus.emit('kart:hit', { kartId: kart.id, by: 'banana' })
        this.destroy()
        break
      }
    }
  }

  destroy(): void {
    this.alive = false
    this.scene.remove(this.mesh)
  }
}

export function dropBanana(kart: KartBase, scene: THREE.Scene): BananaPeel {
  // Drop slightly behind kart
  const sin = Math.sin(kart.angle)
  const cos = Math.cos(kart.angle)
  const behindPos = kart.position.clone().addScaledVector(new THREE.Vector3(sin, 0, cos), 3)
  return new BananaPeel(behindPos, scene)
}
