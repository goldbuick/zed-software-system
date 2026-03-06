/**
 * Deterministic fingerprint for the current browser/device.
 * Used to key permissions by device (playertotoken, rolebytoken) so the same
 * device keeps the same permissions across sessions and reconnects.
 * Same inputs → same token every time; recomputing on load survives localStorage clear.
 */

function hashstring(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h = (h << 5) - h + c
    h = h & h
  }
  return h >>> 0
}

/**
 * Compute a deterministic fingerprint token from stable browser/device attributes.
 * Safe to call from browser only; returns a placeholder when navigator/screen are absent (e.g. SSR).
 */
export function getfingerprint(): string {
  if (typeof navigator === 'undefined' || typeof screen === 'undefined') {
    return 'none'
  }
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    String(new Date().getTimezoneOffset()),
    String(navigator.hardwareConcurrency ?? 0),
    navigator.platform ?? '',
  ]
  const combined = parts.join('|')
  const h = hashstring(combined)
  return h.toString(36)
}
