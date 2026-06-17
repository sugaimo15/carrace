import * as THREE from 'three'
import type { PlayerKart } from '../kart/PlayerKart'
import type { RaceManager } from '../race/RaceManager'
import { TOTAL_LAPS } from '../constants'

const ITEM_ICONS: Record<string, string> = {
  mushroom: '🍄',
  banana:   '🍌',
  redshell: '🔴',
}

const POS_SUFFIX = ['', 'st', 'nd', 'rd', 'th']

interface KartDot { id: string; x: number; z: number; angle: number }

export class HUD {
  private lapEl:  HTMLElement
  private posEl:  HTMLElement
  private spdEl:  HTMLElement
  private itemEl: HTMLElement
  private mapCanvas: HTMLCanvasElement
  private mapCtx:   CanvasRenderingContext2D
  private trackPoints2D: [number, number][] = []
  private mapMinX  = 0
  private mapMinZ  = 0
  private mapScale = 1

  constructor(private readonly trackPath: { getPointAt(t: number): THREE.Vector3 }) {
    const root = document.getElementById('hud')!
    root.innerHTML = `
      <div id="hud-lap"  style="position:absolute;top:16px;left:16px;
        font-size:clamp(16px,4vw,28px);text-shadow:0 2px 6px #000">LAP 1/${TOTAL_LAPS}</div>
      <div id="hud-pos"  style="position:absolute;top:16px;right:16px;
        font-size:clamp(16px,4vw,28px);text-shadow:0 2px 6px #000">1st</div>
      <div id="hud-item" style="position:absolute;bottom:160px;left:16px;
        font-size:clamp(32px,8vw,56px)"></div>
      <div id="hud-spd"  style="position:absolute;bottom:16px;left:16px;
        font-size:clamp(16px,3.5vw,24px);text-shadow:0 2px 6px #000">0 km/h</div>
      <canvas id="hud-map" width="160" height="160"
        style="position:absolute;bottom:16px;right:16px;border-radius:8px;
        border:2px solid rgba(255,255,255,0.5);background:rgba(0,0,0,0.4)"></canvas>
    `

    this.lapEl     = document.getElementById('hud-lap')!
    this.posEl     = document.getElementById('hud-pos')!
    this.spdEl     = document.getElementById('hud-spd')!
    this.itemEl    = document.getElementById('hud-item')!
    this.mapCanvas = document.getElementById('hud-map') as HTMLCanvasElement
    this.mapCtx    = this.mapCanvas.getContext('2d')!

    this.precomputeTrackPoints()
  }

  private precomputeTrackPoints(): void {
    const N = 120
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < N; i++) {
      pts.push(this.trackPath.getPointAt(i / N))
    }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const p of pts) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.z < minZ) minZ = p.z
      if (p.z > maxZ) maxZ = p.z
    }

    const W = this.mapCanvas.width  - 16
    const H = this.mapCanvas.height - 16
    const scaleX = W / (maxX - minX || 1)
    const scaleZ = H / (maxZ - minZ || 1)
    const scale  = Math.min(scaleX, scaleZ) * 0.9

    this.mapMinX  = minX
    this.mapMinZ  = minZ
    this.mapScale = scale

    this.trackPoints2D = pts.map(p => [
      8 + (p.x - minX) * scale,
      8 + (p.z - minZ) * scale,
    ])
  }

  update(player: PlayerKart, raceManager: RaceManager, allKarts: KartDot[]): void {
    const displayLap = Math.min(player.lap + 1, TOTAL_LAPS)
    this.lapEl.textContent = `LAP ${displayLap}/${TOTAL_LAPS}`

    const pos    = raceManager.getPositionOf('player')
    const suffix = POS_SUFFIX[Math.min(pos, 4)] ?? 'th'
    this.posEl.textContent = `${pos}${suffix}`

    const kmh = Math.round(Math.abs(player.speed) * 3.6)
    this.spdEl.textContent = `${kmh} km/h`

    this.itemEl.textContent = player.heldItem ? (ITEM_ICONS[player.heldItem] ?? '') : ''

    this.drawMinimap(allKarts)
  }

  private drawMinimap(karts: KartDot[]): void {
    const ctx = this.mapCtx
    const W   = this.mapCanvas.width
    const H   = this.mapCanvas.height

    ctx.clearRect(0, 0, W, H)

    // Track outline
    ctx.beginPath()
    for (let i = 0; i < this.trackPoints2D.length; i++) {
      const pt = this.trackPoints2D[i]!
      i === 0 ? ctx.moveTo(pt[0], pt[1]) : ctx.lineTo(pt[0], pt[1])
    }
    ctx.closePath()
    ctx.strokeStyle = '#555555'
    ctx.lineWidth   = 7
    ctx.stroke()
    ctx.strokeStyle = '#bbbbbb'
    ctx.lineWidth   = 4
    ctx.stroke()

    // Kart dots
    const COLORS: Record<string, string> = {
      player: '#ff3333',
      ai_0:   '#4488ff',
      ai_1:   '#44cc44',
      ai_2:   '#ffcc00',
    }

    for (const kart of karts) {
      const mx = 8 + (kart.x - this.mapMinX) * this.mapScale
      const my = 8 + (kart.z - this.mapMinZ) * this.mapScale
      const r  = kart.id === 'player' ? 6 : 4

      ctx.beginPath()
      ctx.arc(mx, my, r, 0, Math.PI * 2)
      ctx.fillStyle   = COLORS[kart.id] ?? '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#000000'
      ctx.lineWidth   = 1.5
      ctx.stroke()
    }
  }
}
