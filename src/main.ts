import { initInputManager } from './core/InputManager'
import { initTouchControls } from './core/TouchControls'
import { Game } from './Game'

initInputManager()
initTouchControls(document.getElementById('touch-controls')!)

const game = new Game()
game.start()
