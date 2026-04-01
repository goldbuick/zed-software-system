/** Registered by cafe boot — reapplies window size to the R3F root (mirrors resize). */
let canvassyncfn: (() => void) | undefined

/** Bumped after a forced GL resize so EffectComposer resets throttled `setSize`. */
export let canvassyncgeneration = 0

export function registercanvassync(fn: () => void) {
  canvassyncfn = fn
}

export function bumpcanvassyncgeneration() {
  canvassyncgeneration += 1
}

/** Forces `configure` from current `innerWidth` / `innerHeight` (not debounced). */
export function requestcanvassync() {
  canvassyncfn?.()
}
