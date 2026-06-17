export type ItemType = 'mushroom' | 'banana' | 'redshell' | 'none'

// Weighted item table [position → weights {mushroom, banana, redshell}]
const ITEM_WEIGHTS: Record<number, [number, number, number]> = {
  1: [0.2, 0.6, 0.2],
  2: [0.3, 0.4, 0.3],
  3: [0.5, 0.2, 0.3],
  4: [0.6, 0.1, 0.3],
}

const ITEM_TYPES: ItemType[] = ['mushroom', 'banana', 'redshell']

export function rollItem(position: number): ItemType {
  const weights = ITEM_WEIGHTS[position] ?? ITEM_WEIGHTS[4]!
  const r = Math.random()
  let cumulative = 0
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i]!
    if (r < cumulative) return ITEM_TYPES[i]!
  }
  return 'mushroom'
}
