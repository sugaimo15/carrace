import type { KartBase } from '../kart/KartBase'
import { BOOST_SPEED, BOOST_DURATION } from '../constants'

export function useMushroom(kart: KartBase): void {
  kart.applyBoost(BOOST_SPEED, BOOST_DURATION)
}
