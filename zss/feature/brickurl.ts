import { utf8tobase64url } from 'zss/mapping/encode'

/** brick proxy: remote http(s) URLs reach upstream via BRICK_BASE/?brick=base64url */

export const BRICK_BASE = 'https://brick.zed.cafe'

/** Load remote http(s) resources via brick `?brick=`; safe for web workers. */
export function brickproxiedurl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) {
    return trimmed
  }
  if (trimmed.startsWith(`${BRICK_BASE}/`)) {
    return trimmed
  }
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed
  }
  let absolute = trimmed
  if (typeof location !== 'undefined') {
    try {
      absolute = new URL(trimmed, location.href).href
    } catch {
      return trimmed
    }
  }
  let parsed: URL
  try {
    parsed = new URL(absolute)
  } catch {
    return trimmed
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return trimmed
  }
  return `${BRICK_BASE}/?brick=${utf8tobase64url(absolute)}`
}
