/** Dev-only trace for empty #play / stopplay pipeline (set window.__ZSS_SYNTH_DEBUG__ = true). */
export function synthdebugtrace(
  checkpoint: string,
  detail?: Record<string, unknown>,
) {
  if (typeof window === 'undefined') {
    return
  }
  const win = window as Window & { __ZSS_SYNTH_DEBUG__?: boolean }
  if (!win.__ZSS_SYNTH_DEBUG__) {
    return
  }
  if (detail) {
    console.info(`[synth debug ${checkpoint}]`, detail)
  } else {
    console.info(`[synth debug ${checkpoint}]`)
  }
}
