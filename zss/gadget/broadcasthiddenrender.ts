import { addAfterEffect, advance } from '@react-three/fiber'

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

/**
 * While broadcasting with the page visible, run the compositor after R3F has
 * finished rendering rather than from the frame clock mid-render. Returns an
 * unsubscribe. Global after-effects only fire while the R3F loop runs, so this
 * is inert once the page is hidden.
 */
export function broadcastvisibleframesubscribe(
  run: (now: number) => void,
): () => void {
  return addAfterEffect(() => {
    if (typeof document !== 'undefined' && document.hidden) {
      return
    }
    run(performance.now())
  })
}
