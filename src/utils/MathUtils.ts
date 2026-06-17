export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

export function lerpAngle(a: number, b: number, t: number): number {
  return a + wrapAngle(b - a) * t
}

export function sign(v: number): number {
  return v >= 0 ? 1 : -1
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}
