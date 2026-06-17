import * as THREE from 'three'
import type { KartBase } from '../kart/KartBase'
import { ITEM_BOX_RADIUS, ITEM_BOX_RESPAWN } from '../constants'
import { bus } from '../core/EventBus'
import { rollItem } from './ItemSystem'
import type { RaceManager } from '../race/RaceManager'

export class ItemBox {
  readonly mesh: THREE.Group
  private active = true
  private respawnAt = 0

  constructor(
    readonly position: THREE.Vector3,
    private readonly scene: THREE.Scene,
  ) {
    this.mesh = buildItemBoxMesh()
    this.mesh.position.copy(position)
    scene.add(this.mesh)
  }

  update(dt: number, karts: KartBase[], raceManager: RaceManager, now: number): void {
    // Respawn
    if (!this.active) {
      if (now >= this.respawnAt) {
        this.active = true
        this.mesh.visible = true
      }
      return
    }

    // Spin animation
    this.mesh.rotation.y += 2 * dt

    // Collision check with karts
    for (const kart of karts) {
      if (kart.finished) continue
      if (kart.heldItem !== null) continue

      const d = kart.position.distanceTo(this.position)
      if (d < ITEM_BOX_RADIUS) {
        const position = raceManager.getPositionOf(kart.id)
        kart.heldItem = rollItem(position)
        this.collect(now)

        bus.emit('kart:itemPickup', { kartId: kart.id })
        break
      }
    }
  }

  private collect(now: number): void {
    this.active      = false
    this.mesh.visible = false
    this.respawnAt   = now + ITEM_BOX_RESPAWN
  }
}

function buildItemBoxMesh(): THREE.Group {
  const group = new THREE.Group()

  const geo = new THREE.BoxGeometry(2.2, 2.2, 2.2)
  const mat = new THREE.MeshPhongMaterial({
    color:     0xffd700,
    emissive:  0x886600,
    shininess: 100,
    wireframe: false,
    opacity:   0.9,
    transparent: true,
  })
  const box = new THREE.Mesh(geo, mat)
  box.castShadow = true

  // Question mark face (canvas texture)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffd700'
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 90px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('?', 64, 64)

  const tex = new THREE.CanvasTexture(canvas)
  const faceMat = new THREE.MeshPhongMaterial({ map: tex, emissive: 0x443300 })

  const faceGeo = new THREE.PlaneGeometry(2.0, 2.0)
  const offsets = [
    [0, 0,  1.12, 0],
    [0, 0, -1.12, Math.PI],
    [ 1.12, 0, 0, Math.PI / 2],
    [-1.12, 0, 0, -Math.PI / 2],
  ]
  for (const [x, y, z, ry] of offsets) {
    const face = new THREE.Mesh(faceGeo, faceMat)
    face.position.set(x!, y!, z!)
    face.rotation.y = ry!
    group.add(face)
  }

  group.add(box)
  group.position.y = 1.4
  return group
}
