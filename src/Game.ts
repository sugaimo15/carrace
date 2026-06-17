import * as THREE from 'three'
import { TrackPath } from './track/TrackPath'
import { buildTrackScene } from './track/TrackGeometry'
import { PlayerKart } from './kart/PlayerKart'
import { AIKart } from './kart/AIKart'
import type { KartBase } from './kart/KartBase'
import { ChaseCamera } from './camera/ChaseCamera'
import { CheckpointSystem } from './race/CheckpointSystem'
import { RaceManager } from './race/RaceManager'
import { ItemBox } from './items/ItemBox'
import { BananaPeel, dropBanana } from './items/Banana'
import { RedShell, launchShell } from './items/RedShell'
import { useMushroom } from './items/Mushroom'
import { HUD } from './hud/HUD'
import { bus } from './core/EventBus'
import { inputState } from './core/InputManager'
import { GRID_POSITIONS, ITEM_BOX_T_VALUES } from './track/TrackData'
import { TOTAL_LAPS } from './constants'

export class Game {
  private scene:    THREE.Scene
  private renderer: THREE.WebGLRenderer
  private trackPath: TrackPath
  private player:   PlayerKart
  private aiKarts:  AIKart[]
  private allKarts: KartBase[]
  private camera:   ChaseCamera
  private checkpoints: CheckpointSystem
  private raceManager: RaceManager
  private itemBoxes: ItemBox[] = []
  private bananas:   BananaPeel[] = []
  private shells:    RedShell[] = []
  private hud: HUD

  private lastTime = 0
  private itemKeyWasDown = false

  constructor() {
    // Renderer
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87CEEB)
    this.scene.fog = new THREE.Fog(0x87CEEB, 200, 600)

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.55)
    this.scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xfff8e0, 1.1)
    sun.position.set(80, 160, 80)
    sun.castShadow = true
    sun.shadow.mapSize.width  = 2048
    sun.shadow.mapSize.height = 2048
    sun.shadow.camera.near = 10
    sun.shadow.camera.far  = 500
    sun.shadow.camera.left   = -200
    sun.shadow.camera.right  =  200
    sun.shadow.camera.top    =  200
    sun.shadow.camera.bottom = -200
    this.scene.add(sun)

    const fill = new THREE.DirectionalLight(0xaaccff, 0.3)
    fill.position.set(-80, 60, -80)
    this.scene.add(fill)

    // Track
    this.trackPath = new TrackPath()
    buildTrackScene(this.trackPath, this.scene)

    // Karts
    this.player  = new PlayerKart(this.trackPath)
    this.aiKarts = [0, 1, 2].map(i => new AIKart(i, this.trackPath))
    this.allKarts = [this.player, ...this.aiKarts]

    // Place karts on starting grid
    for (let i = 0; i < this.allKarts.length; i++) {
      const grid = GRID_POSITIONS[i]!
      this.allKarts[i]!.position.copy(grid.pos)
      this.allKarts[i]!.angle = grid.angle
      // Pre-compute trackT so CheckpointSystem.register() gets the correct lastT,
      // preventing all checkpoints from being "crossed" on the first update frame.
      this.allKarts[i]!.trackT = this.trackPath.getClosestT(this.allKarts[i]!.position)
    }

    for (const k of this.allKarts) {
      k.syncMesh()
      this.scene.add(k.mesh)
    }

    // Camera
    this.camera = new ChaseCamera()

    // Race management
    this.checkpoints = new CheckpointSystem()
    for (const k of this.allKarts) this.checkpoints.register(k)

    this.raceManager = new RaceManager(this.allKarts, this.trackPath)

    // Item boxes
    for (const t of ITEM_BOX_T_VALUES) {
      const pt = this.trackPath.getPointAt(t)
      pt.y = 0
      this.itemBoxes.push(new ItemBox(pt, this.scene))
    }

    // HUD
    this.hud = new HUD(this.trackPath)

    this.initEvents()

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight)
      this.camera.onResize()
    })
  }

  private initEvents(): void {
    bus.on('race:countdown', ({ count }) => {
      const el = document.getElementById('countdown')!
      el.style.opacity = '1'
      el.textContent = count > 0 ? `${count}` : 'GO!'
      el.style.color = count > 0 ? '#FFD700' : '#00FF88'
      setTimeout(() => { el.style.opacity = '0' }, 800)
    })

    bus.on('kart:lapComplete', ({ kartId, lap }) => {
      if (kartId === 'player') this.showLapFlash(lap)
    })

    bus.on('race:finished', ({ order }) => {
      this.showResults(order)
    })
  }

  private showLapFlash(lap: number): void {
    const el = document.getElementById('countdown')!
    el.style.opacity = '1'
    el.style.fontSize = 'clamp(30px,8vw,60px)'
    el.textContent = lap >= TOTAL_LAPS ? 'FINAL LAP!' : `LAP ${lap + 1}`
    el.style.color = '#FFD700'
    setTimeout(() => {
      el.style.opacity = '0'
      el.style.fontSize = ''
    }, 1500)
  }

  private showResults(order: string[]): void {
    const el = document.getElementById('results')!
    const names: Record<string, string> = {
      player: '🏎 YOU',
      ai_0:   '🔵 Racer 1',
      ai_1:   '🟢 Racer 2',
      ai_2:   '🟡 Racer 3',
    }
    const suffixes = ['st', 'nd', 'rd', 'th']
    const rows = order.map((id, i) => {
      const suf = suffixes[i] ?? 'th'
      return `<tr><td>${i + 1}${suf}</td><td>${names[id] ?? id}</td></tr>`
    }).join('')

    el.innerHTML = `
      <h2>🏆 Race Results</h2>
      <table>${rows}</table>
      <button onclick="location.reload()">Play Again</button>
    `
    el.style.display = 'flex'
  }

  start(): void {
    const overlay = document.getElementById('overlay')!

    const startRace = () => {
      overlay.classList.add('hidden')
      this.raceManager.startCountdown()
    }

    overlay.addEventListener('click',    startRace, { once: true })
    overlay.addEventListener('touchend', startRace, { once: true, passive: true })

    this.loop()
  }

  private loop = (): void => {
    requestAnimationFrame(this.loop)

    const now = performance.now()
    if (this.lastTime === 0) this.lastTime = now
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now

    this.update(dt, now)
    this.renderer.render(this.scene, this.camera.camera)
  }

  private update(dt: number, now: number): void {
    const state = this.raceManager.state

    if (state === 'racing') {
      this.player.update(dt)
      this.handlePlayerItem()

      for (const ai of this.aiKarts) {
        ai.update(dt)
        this.handleAIItem(ai)
      }

      this.checkpoints.update(this.allKarts, now)

      for (const box of this.itemBoxes) {
        box.update(dt, this.allKarts, this.raceManager, now)
      }

      this.bananas = this.bananas.filter(b => b.alive)
      for (const b of this.bananas) b.update(this.allKarts)

      this.shells = this.shells.filter(s => s.alive)
      for (const s of this.shells) s.update(dt, this.allKarts)
    }

    this.raceManager.update(dt, now)
    this.camera.update(dt, this.player)

    if (state === 'racing' || state === 'finished') {
      this.hud.update(
        this.player,
        this.raceManager,
        this.allKarts.map(k => ({ id: k.id, x: k.position.x, z: k.position.z, angle: k.angle })),
      )
    }
  }

  private handlePlayerItem(): void {
    if (inputState.useItem && !this.itemKeyWasDown) {
      this.itemKeyWasDown = true
      this.fireItem(this.player)
    }
    if (!inputState.useItem) this.itemKeyWasDown = false
  }

  private handleAIItem(ai: AIKart): void {
    if (ai.heldItem && Math.random() < 0.003) {
      this.fireItem(ai)
    }
  }

  private fireItem(kart: KartBase): void {
    if (!kart.heldItem) return
    const item = kart.heldItem
    kart.heldItem = null

    if (item === 'mushroom') {
      useMushroom(kart)
    } else if (item === 'banana') {
      this.bananas.push(dropBanana(kart, this.scene))
    } else if (item === 'redshell') {
      const shell = launchShell(kart, this.allKarts, this.scene, this.trackPath)
      if (shell) this.shells.push(shell)
    }
  }
}
