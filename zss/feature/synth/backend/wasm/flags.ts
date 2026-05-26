/** Phase 0 audible check — opt in with `ZSS_WASM_SPIKE=true`. */
export function iswasmspikeenabled(): boolean {
  return import.meta.env.ZSS_WASM_SPIKE === 'true'
}

/** Lighter DSP preset — on by default; set `ZSS_WASM_PERF=false` for full parity quality. */
export function iswasmperfmode(): boolean {
  return import.meta.env.ZSS_WASM_PERF !== 'false'
}
