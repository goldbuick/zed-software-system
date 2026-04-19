import FingerprintJS from '@fingerprintjs/fingerprintjs'

let fingerprint: string | undefined

/**
 * Compute a deterministic fingerprint token from stable browser/device attributes.
 * Safe to call from browser only; returns a placeholder when `window` is absent (headless CLI, SSR).
 */
export async function getfingerprint(): Promise<string> {
  if (fingerprint) {
    return fingerprint
  }
  if (typeof window === 'undefined') {
    fingerprint = 'headless'
    return fingerprint
  }
  const fp = await FingerprintJS.load()
  const result = await fp.get()
  fingerprint = result.visitorId
  return fingerprint
}
