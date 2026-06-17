export interface InputState {
  accelerate: boolean
  brake:      boolean
  steerLeft:  boolean
  steerRight: boolean
  drift:      boolean
  useItem:    boolean
}

export const inputState: InputState = {
  accelerate: false,
  brake:      false,
  steerLeft:  false,
  steerRight: false,
  drift:      false,
  useItem:    false,
}

const KEY_MAP: Record<string, keyof InputState> = {
  ArrowUp:    'accelerate',
  KeyW:       'accelerate',
  ArrowDown:  'brake',
  KeyS:       'brake',
  ArrowLeft:  'steerLeft',
  KeyA:       'steerLeft',
  ArrowRight: 'steerRight',
  KeyD:       'steerRight',
  Space:      'drift',
  ShiftLeft:  'drift',
  ShiftRight: 'drift',
  KeyL:       'useItem',
  KeyZ:       'useItem',
}

export function initInputManager(): void {
  document.addEventListener('keydown', (e) => {
    const key = KEY_MAP[e.code]
    if (key) {
      inputState[key] = true
      e.preventDefault()
    }
  })
  document.addEventListener('keyup', (e) => {
    const key = KEY_MAP[e.code]
    if (key) {
      inputState[key] = false
      e.preventDefault()
    }
  })
}
