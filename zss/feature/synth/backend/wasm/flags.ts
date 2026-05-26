/** Phase 0 audible check — opt in with `ZSS_WASM_SPIKE=true`. */
export function iswasmspikeenabled(): boolean {
  return import.meta.env.ZSS_WASM_SPIKE === 'true'
}
