/** Dev-only trace for empty #play / stopplay pipeline (set window.__ZSS_SYNTH_DEBUG__ = true). */
export function synthdebugtrace(
  checkpoint: string,
  detail?: Record<string, unknown>,
) {
  void checkpoint
  void detail
}
