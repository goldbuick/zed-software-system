import { advance } from '@react-three/fiber'

/**
 * While broadcasting with the page hidden, manually advance the R3F root so
 * the game canvas keeps updating for the compositor (rAF is suspended).
 */
export function broadcasthiddenrendertick() {
  if (typeof document === 'undefined' || !document.hidden) {
    return
  }
  advance(performance.now())
}
