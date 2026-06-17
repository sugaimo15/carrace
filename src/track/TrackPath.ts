import * as THREE from 'three'
import { TRACK_CONTROL_POINTS } from './TrackData'

export class TrackPath {
  readonly curve: THREE.CatmullRomCurve3
  private readonly COARSE_SAMPLES = 400

  // Pre-sampled points for fast closest-T lookup
  private samplePts: THREE.Vector3[] = []

  constructor() {
    this.curve = new THREE.CatmullRomCurve3(TRACK_CONTROL_POINTS, true, 'catmullrom', 0.5)
    this.precompute()
  }

  private precompute(): void {
    for (let i = 0; i < this.COARSE_SAMPLES; i++) {
      this.samplePts.push(this.curve.getPointAt(i / this.COARSE_SAMPLES))
    }
  }

  getPointAt(t: number): THREE.Vector3 {
    return this.curve.getPointAt(((t % 1) + 1) % 1)
  }

  getTangentAt(t: number): THREE.Vector3 {
    return this.curve.getTangentAt(((t % 1) + 1) % 1).normalize()
  }

  // Returns the track-T parameter (0–1) closest to worldPos
  getClosestT(worldPos: THREE.Vector3): number {
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < this.COARSE_SAMPLES; i++) {
      const d = this.samplePts[i]!.distanceToSquared(worldPos)
      if (d < bestDist) { bestDist = d; bestIdx = i }
    }

    // Refine with 3 Newton steps within ±2 coarse buckets
    const N = this.COARSE_SAMPLES
    let t = bestIdx / N
    for (let iter = 0; iter < 6; iter++) {
      const pt   = this.curve.getPointAt(t)
      const tang = this.curve.getTangentAt(t)
      const diff = new THREE.Vector3().subVectors(worldPos, pt)
      const dot  = diff.dot(tang)
      const step = dot / (this.curve.getLength() / N)
      t = ((t + step / N) % 1 + 1) % 1
    }
    return t
  }

  // Signed lateral offset from centerline (+ve = right of travel)
  getLateralOffset(worldPos: THREE.Vector3, t: number): number {
    const pt  = this.getPointAt(t)
    const tang = this.getTangentAt(t)
    const right = new THREE.Vector3().crossVectors(tang, new THREE.Vector3(0, 1, 0)).normalize()
    return new THREE.Vector3().subVectors(worldPos, pt).dot(right)
  }
}
