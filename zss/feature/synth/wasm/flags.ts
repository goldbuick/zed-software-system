/** Phase 0 audible check — opt in with `ZSS_WASM_SPIKE=true`. */
export function iswasmspikeenabled(): boolean {
  return import.meta.env.ZSS_WASM_SPIKE === 'true'
}

/** Dev-only: Maximilian WASM audio (`ZSS_WASM_SYNTH=true`, or spike-only). */
export function iswasmsynthenabled(): boolean {
  return (
    import.meta.env.ZSS_WASM_SYNTH === 'true' || iswasmspikeenabled()
  )
}
