/** Dev trace for wanix term I/O (set `window.__ZSS_WANIX_TRACE__ = true` in console). */
export function wanixtrace(
  checkpoint: string,
  detail?: Record<string, unknown>,
) {
  if (typeof window === 'undefined') {
    return
  }
  const win = window as Window & { __ZSS_WANIX_TRACE__?: boolean }
  if (!win.__ZSS_WANIX_TRACE__) {
    return
  }
  if (detail) {
    console.debug(`[wanix] ${checkpoint}`, detail)
  } else {
    console.debug(`[wanix] ${checkpoint}`)
  }
}
