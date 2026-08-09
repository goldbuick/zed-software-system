import { base64tobase64url, base64urltobase64 } from 'zss/mapping/encode'

/** Convert compressed MEMORY base64url string to raw zip bytes. */
export function airsharebase64urltobytes(base64url: string): Uint8Array {
  const base64 = base64urltobase64(base64url)
  const binary =
    typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary')
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; ++i) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

/** Convert raw zip bytes back to base64url for vm:books. */
export function airsharebytestobase64url(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode(...slice)
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64')
  return base64tobase64url(base64)
}

export const AIRSHARE_RECEIVE_PARAM = 'airshare'
export const AIRSHARE_RECEIVE_VALUE = 'receive'

/** Invite URL that boots cafe into `#airshare receive`. */
export function airshareinviteurl(origin = location.origin): string {
  const url = new URL(origin.endsWith('/') ? origin : `${origin}/`)
  url.searchParams.set(AIRSHARE_RECEIVE_PARAM, AIRSHARE_RECEIVE_VALUE)
  return url.toString()
}

export function readairsharereceivefromurl(): boolean {
  try {
    const url = new URL(location.href)
    return url.searchParams.get(AIRSHARE_RECEIVE_PARAM) === AIRSHARE_RECEIVE_VALUE
  } catch {
    return false
  }
}
