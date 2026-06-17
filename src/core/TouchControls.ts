import { inputState } from './InputManager'

interface ButtonDef {
  key: keyof typeof inputState
  label: string
  style: Partial<CSSStyleDeclaration>
}

const BUTTONS: ButtonDef[] = [
  // Left side: steering only
  {
    key: 'steerLeft',
    label: '◀',
    style: { width: '90px', height: '90px', left: '16px', bottom: '130px' },
  },
  {
    key: 'steerRight',
    label: '▶',
    style: { width: '90px', height: '90px', left: '120px', bottom: '130px' },
  },
  // Right side: accelerate, brake, drift, item
  {
    key: 'accelerate',
    label: '▲',
    style: { width: '90px', height: '110px', right: '120px', bottom: '140px' },
  },
  {
    key: 'brake',
    label: '▼',
    style: { width: '90px', height: '80px', right: '120px', bottom: '50px' },
  },
  {
    key: 'drift',
    label: '⚡',
    style: { width: '90px', height: '90px', right: '16px', bottom: '140px' },
  },
  {
    key: 'useItem',
    label: '🍄',
    style: { width: '80px', height: '80px', right: '16px', bottom: '50px' },
  },
]

export function initTouchControls(container: HTMLElement): void {
  // Only show on touch devices
  if (!window.matchMedia('(pointer: coarse)').matches && !('ontouchstart' in window)) {
    return
  }

  for (const def of BUTTONS) {
    const el = document.createElement('div')
    el.className = 'touch-btn'
    el.textContent = def.label

    // Apply positioning styles
    Object.assign(el.style, def.style)

    container.appendChild(el)

    el.addEventListener('touchstart', (e) => {
      e.preventDefault()
      inputState[def.key] = true
      el.classList.add('active')
    }, { passive: false })

    el.addEventListener('touchend', (e) => {
      e.preventDefault()
      inputState[def.key] = false
      el.classList.remove('active')
    }, { passive: false })

    el.addEventListener('touchcancel', () => {
      inputState[def.key] = false
      el.classList.remove('active')
    })
  }
}
