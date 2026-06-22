import type { RootState } from '@react-three/fiber'
import type { StoreApi } from 'zustand'

/** Bumped after a forced GL resize so EffectComposer resets throttled `setSize`. */
export let canvassyncgeneration = 0

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
