import * as THREE from 'three'
import { TrackPath } from './TrackPath'
import { TRACK_WIDTH, TRACK_SEGMENTS } from '../constants'

const UP = new THREE.Vector3(0, 1, 0)

export function buildTrackScene(trackPath: TrackPath, scene: THREE.Scene): void {
  buildGround(scene)
  buildRoad(trackPath, scene)
  buildBarriers(trackPath, scene)
  buildStartFinishLine(trackPath, scene)
  buildScenery(trackPath, scene)
}

function buildGround(scene: THREE.Scene): void {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const tileSize = 32
  for (let row = 0; row < canvas.height / tileSize; row++) {
    for (let col = 0; col < canvas.width / tileSize; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#4a7c3f' : '#3a6230'
      ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(40, 40)

  const geo = new THREE.PlaneGeometry(800, 800)
  const mat = new THREE.MeshLambertMaterial({ map: tex })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = -0.05
  mesh.receiveShadow = true
  scene.add(mesh)
}

function buildRoad(trackPath: TrackPath, scene: THREE.Scene): void {
  const N = TRACK_SEGMENTS
  const hw = TRACK_WIDTH / 2

  const positions: number[] = []
  const normals:   number[] = []
  const uvs:       number[] = []
  const indices:   number[] = []

  for (let i = 0; i <= N; i++) {
    const t    = i / N
    const pt   = trackPath.getPointAt(t)
    const tang = trackPath.getTangentAt(t)
    const right = new THREE.Vector3().crossVectors(tang, UP).normalize()

    const L = pt.clone().addScaledVector(right, -hw)
    const R = pt.clone().addScaledVector(right,  hw)

    positions.push(L.x, 0, L.z, R.x, 0, R.z)
    normals.push(0, 1, 0, 0, 1, 0)
    uvs.push(0, t * 10, 1, t * 10)

    if (i < N) {
      const base = i * 2
      // Two triangles per quad
      indices.push(base, base + 2, base + 1)
      indices.push(base + 1, base + 2, base + 3)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,   3))
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,       2))
  geo.setIndex(indices)

  const roadCanvas = document.createElement('canvas')
  roadCanvas.width = 64
  roadCanvas.height = 64
  const rctx = roadCanvas.getContext('2d')!
  rctx.fillStyle = '#555555'
  rctx.fillRect(0, 0, 64, 64)
  // subtle asphalt grain
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 64
    const y = Math.random() * 64
    const v = Math.floor(Math.random() * 30 + 60)
    rctx.fillStyle = `rgb(${v},${v},${v})`
    rctx.fillRect(x, y, 1, 1)
  }
  const roadTex = new THREE.CanvasTexture(roadCanvas)
  roadTex.wrapS = THREE.RepeatWrapping
  roadTex.wrapT = THREE.RepeatWrapping
  roadTex.repeat.set(2, 30)

  const mat = new THREE.MeshLambertMaterial({ map: roadTex })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  scene.add(mesh)

  buildCenterLine(trackPath, scene)
  // Curb stripes (alternating red/white)
  buildCurbs(trackPath, scene, hw)
}

function buildCenterLine(trackPath: TrackPath, scene: THREE.Scene): void {
  const N   = TRACK_SEGMENTS
  const DW  = 0.4  // dashed line width

  for (let i = 0; i < N; i++) {
    // Draw only every other segment for a dashed effect
    if (i % 4 !== 0) continue

    const t0 = i / N
    const t1 = (i + 1.8) / N
    const p0 = trackPath.getPointAt(t0)
    const p1 = trackPath.getPointAt(Math.min(t1, 1))
    const tang = trackPath.getTangentAt(t0)
    const right = new THREE.Vector3().crossVectors(tang, UP).normalize()

    const len = p0.distanceTo(p1)
    const mid = p0.clone().lerp(p1, 0.5)

    const geo = new THREE.PlaneGeometry(DW, len)
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(mid.x, 0.02, mid.z)
    const angle = Math.atan2(tang.x, tang.z)
    mesh.rotation.z = -angle
    scene.add(mesh)
  }
}

function buildCurbs(trackPath: TrackPath, scene: THREE.Scene, hw: number): void {
  const N   = TRACK_SEGMENTS
  const CW  = 1.8   // curb width

  for (const side of [-1, 1]) {
    const positions: number[] = []
    const colors:    number[] = []
    const indices:   number[] = []

    for (let i = 0; i <= N; i++) {
      const t     = i / N
      const pt    = trackPath.getPointAt(t)
      const tang  = trackPath.getTangentAt(t)
      const right = new THREE.Vector3().crossVectors(tang, UP).normalize()

      const inner = pt.clone().addScaledVector(right, side * hw)
      const outer = pt.clone().addScaledVector(right, side * (hw + CW))

      positions.push(inner.x, 0.01, inner.z)
      positions.push(outer.x, 0.01, outer.z)

      const stripe = Math.floor(t * 80) % 2 === 0
      const r = stripe ? 1.0 : 1.0
      const g = stripe ? 0.1 : 1.0
      const b = stripe ? 0.1 : 1.0
      colors.push(r, g, b, r, g, b)

      if (i < N) {
        const base = i * 2
        indices.push(base, base + 2, base + 1)
        indices.push(base + 1, base + 2, base + 3)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    const mat  = new THREE.MeshLambertMaterial({ vertexColors: true })
    const mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
  }
}

function buildBarriers(trackPath: TrackPath, scene: THREE.Scene): void {
  const N  = 80
  const hw = TRACK_WIDTH / 2 + 2

  for (let i = 0; i < N; i++) {
    const t0 = i / N
    const t1 = (i + 1) / N
    const p0 = trackPath.getPointAt(t0)
    const p1 = trackPath.getPointAt(t1)

    const mid  = p0.clone().lerp(p1, 0.5)
    const tang = trackPath.getTangentAt((t0 + t1) / 2)
    const right = new THREE.Vector3().crossVectors(tang, UP).normalize()
    const len  = p0.distanceTo(p1) + 0.5

    for (const side of [-1, 1]) {
      const pos = mid.clone().addScaledVector(right, side * hw)
      const geo = new THREE.BoxGeometry(len, 2.0, 1.2)
      const mat = new THREE.MeshLambertMaterial({
        color: side === -1 ? 0xcccccc : 0xcccccc,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(pos.x, 1.0, pos.z)

      const angle = Math.atan2(tang.x, tang.z)
      mesh.rotation.y = angle

      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
    }
  }
}

function buildStartFinishLine(trackPath: TrackPath, scene: THREE.Scene): void {
  const pt    = trackPath.getPointAt(0)
  const tang  = trackPath.getTangentAt(0)
  const right = new THREE.Vector3().crossVectors(tang, UP).normalize()

  // Checkered pattern using canvas texture
  const canvas = document.createElement('canvas')
  canvas.width  = 128
  canvas.height = 32
  const ctx = canvas.getContext('2d')!
  const cols = 8, rows = 2
  const cw = canvas.width / cols
  const ch = canvas.height / rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#000000'
      ctx.fillRect(c * cw, r * ch, cw, ch)
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  const geo = new THREE.PlaneGeometry(TRACK_WIDTH, 4)
  const mat = new THREE.MeshLambertMaterial({ map: tex })
  const mesh = new THREE.Mesh(geo, mat)

  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(pt.x, 0.02, pt.z)
  const angle = Math.atan2(right.x, right.z)
  mesh.rotation.z = -angle + Math.PI / 2
  scene.add(mesh)
}

function buildScenery(trackPath: TrackPath, scene: THREE.Scene): void {
  const N = 60
  const RADIUS = TRACK_WIDTH / 2 + 6

  const treeGeo = new THREE.CylinderGeometry(0, 2.5, 8, 6)
  const treeMat = new THREE.MeshLambertMaterial({ color: 0x1a5c1a })
  const trunkGeo = new THREE.CylinderGeometry(0.4, 0.5, 2, 6)
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e })

  for (let i = 0; i < N; i++) {
    const t     = i / N
    const pt    = trackPath.getPointAt(t)
    const tang  = trackPath.getTangentAt(t)
    const right = new THREE.Vector3().crossVectors(tang, UP).normalize()

    // Alternate sides, offset by ½ segment
    const side   = i % 2 === 0 ? 1 : -1
    const jitter = (Math.random() - 0.5) * 4
    const dist   = RADIUS + Math.random() * 8

    const pos = pt.clone().addScaledVector(right, side * dist)
    pos.x += jitter
    pos.z += jitter

    const trunk = new THREE.Mesh(trunkGeo, trunkMat)
    trunk.position.set(pos.x, 1, pos.z)
    trunk.castShadow = true
    scene.add(trunk)

    const tree = new THREE.Mesh(treeGeo, treeMat)
    tree.position.set(pos.x, 2 + 4, pos.z)
    tree.castShadow = true
    scene.add(tree)
  }
}
