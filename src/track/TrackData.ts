import * as THREE from 'three'

// Hand-crafted control points for a winding race circuit.
// Viewed from above: starts heading south (-Z), wide right hairpin,
// S-curve section, left hairpin, long straight back to start.
// Scale: ~1 unit ≈ 1 metre. Total circumference ≈ 780 m.
export const TRACK_CONTROL_POINTS: THREE.Vector3[] = [
  new THREE.Vector3(   0,  0,    0),   //  0 Start/Finish
  new THREE.Vector3(  20,  0,  -50),   //  1
  new THREE.Vector3(  10,  0, -110),   //  2 entry right hairpin
  new THREE.Vector3(  40,  0, -160),   //  3
  new THREE.Vector3(  90,  0, -175),   //  4 hairpin apex
  new THREE.Vector3( 140,  0, -155),   //  5
  new THREE.Vector3( 155,  0, -110),   //  6 exit
  new THREE.Vector3( 145,  0,  -60),   //  7
  new THREE.Vector3( 120,  0,  -20),   //  8 S-curve entry
  new THREE.Vector3(  90,  0,   10),   //  9
  new THREE.Vector3(  50,  0,   20),   // 10 S mid
  new THREE.Vector3(  20,  0,   10),   // 11
  new THREE.Vector3(  -5,  0,  -20),   // 12
  new THREE.Vector3( -30,  0,  -60),   // 13 long left straight
  new THREE.Vector3( -40,  0, -120),   // 14
  new THREE.Vector3( -50,  0, -160),   // 15 entry left hairpin
  new THREE.Vector3( -40,  0, -200),   // 16
  new THREE.Vector3(   0,  0, -215),   // 17 hairpin apex
  new THREE.Vector3(  40,  0, -205),   // 18
  new THREE.Vector3(  55,  0, -175),   // 19 exit hairpin
  new THREE.Vector3(  40,  0, -145),   // 20 (reuse mid section differently)
  new THREE.Vector3(  10,  0, -130),   // 21
  new THREE.Vector3( -20,  0, -125),   // 22
  new THREE.Vector3( -50,  0, -100),   // 23
  new THREE.Vector3( -60,  0,  -60),   // 24
  new THREE.Vector3( -55,  0,  -20),   // 25 chicane
  new THREE.Vector3( -40,  0,   10),   // 26
  new THREE.Vector3( -20,  0,   20),   // 27
  new THREE.Vector3(  -5,  0,   15),   // 28 back toward start
]

// Starting grid positions just after the start/finish line (t≈0.01).
// Placing karts here gives correct standings from the first frame and ensures
// getClosestT returns low t-values, which the standings sort handles correctly.
// angle=0 → forward is -Z, matching the track's first segment (0,0,0)→(20,0,-50).
export const GRID_POSITIONS = [
  { pos: new THREE.Vector3(  1, 0.4,  -6), angle: 0 },  // player (P1) - left front
  { pos: new THREE.Vector3(  7, 0.4,  -6), angle: 0 },  // AI 1  - right front
  { pos: new THREE.Vector3(  1, 0.4, -16), angle: 0 },  // AI 2  - left rear
  { pos: new THREE.Vector3(  7, 0.4, -16), angle: 0 },  // AI 3  - right rear
] as const

// Positions for item boxes along the track (track-T values)
export const ITEM_BOX_T_VALUES = [
  0.10, 0.18, 0.28, 0.38,
  0.48, 0.58, 0.68, 0.78,
  0.88, 0.94,
]
