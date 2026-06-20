import type { RootState } from '@react-three/fiber'
import type { StoreApi } from 'zustand'

/** Bumped after a forced GL resize so EffectComposer resets throttled `setSize`. */
export let canvassyncgeneration = 0

let r3fstore: StoreApi<RootState> | undefined

export function registerr3fstore(store: StoreApi<RootState> | undefined) {
  r3fstore = store
  if (typeof window !== 'undefined') {
    ;(window as Window & { __zss_r3f_ready?: boolean }).__zss_r3f_ready =
      store != null
  }
}

/** Pause gadget render loop while v86/gojs boots (does not destroy WebGL). */
export function pausegadgetframeloop() {
  r3fstore?.getState().setFrameloop('never')
}

export function resumegadgetframeloop() {
  r3fstore?.getState().setFrameloop('always')
}

function bumpcanvassyncgeneration() {
  canvassyncgeneration += 1
}

/**
 * R3F skips `setSize` when `configure` size equals current state, so `gl.setSize`
 * never runs (see pmndrs/react-three-fiber store subscription). Nudge dimensions
 * so the subscriber refreshes canvas + camera after graphics-mode swaps.
 */
export function forcer3fglresize(store: StoreApi<RootState> | undefined) {
  if (!store) {
    return
  }
  const s = store.getState()
  const { width, height, top, left } = s.size
  if (width < 2 || height < 1) {
    return
  }
  s.setSize(width - 1, height, top, left)
  s.setSize(width, height, top, left)
  bumpcanvassyncgeneration()
}
