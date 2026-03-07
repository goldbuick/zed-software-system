import FingerprintJS from '@fingerprintjs/fingerprintjs'

// Initialize an agent at application startup.
const fpref = FingerprintJS.load()

let fingerprint: string | undefined

/**
 * Compute a deterministic fingerprint token from stable browser/device attributes.
 * Safe to call from browser only; returns a placeholder when navigator/screen are absent (e.g. SSR).
 */
export async function getfingerprint(): Promise<string> {
  if (!fingerprint) {
    // Get the visitor identifier when you need it.
    const fp = await fpref
    const result = await fp.get()
    fingerprint = result.visitorId
  }
  return fingerprint
}
