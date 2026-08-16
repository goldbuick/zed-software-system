const TRACKING_EXACT = new Set(['fbclid', 'gclid', 'si', 'feature'])

function istrackingparam(key: string): boolean {
  const lower = key.toLowerCase()
  if (TRACKING_EXACT.has(lower)) {
    return true
  }
  return lower.startsWith('utm_')
}

function youtubeidfromurl(parsed: URL): string | undefined {
  const host = parsed.hostname.toLowerCase()
  if (host === 'youtu.be') {
    const id = parsed.pathname.replace(/^\//, '').split('/')[0]
    return id || undefined
  }
  if (
    host === 'youtube.com' ||
    host === 'www.youtube.com' ||
    host === 'm.youtube.com' ||
    host.endsWith('.youtube.com')
  ) {
    const v = parsed.searchParams.get('v')
    if (v) {
      return v
    }
  }
  return undefined
}

function collapsewhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/** True when a #media arg should queue a URL (not bind a helper peer id). */
export function mediaisqueueurl(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) {
    return false
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return true
  }
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/** Dedupe key for queue entries. Helper still receives the original URL string. */
export function mediaqueuenormalizeurl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ''
  }
  try {
    const parsed = new URL(trimmed)
    const youtubeid = youtubeidfromurl(parsed)
    if (youtubeid) {
      return `youtube:${youtubeid}`
    }
    const host = parsed.hostname.toLowerCase()
    const keys = [...parsed.searchParams.keys()]
      .filter((key) => !istrackingparam(key))
      .sort()
    const query = keys
      .map((key) => `${key}=${parsed.searchParams.get(key) ?? ''}`)
      .join('&')
    const path = parsed.pathname.replace(/\/+$/, '') || '/'
    return `${parsed.protocol}//${host}${path}${query ? `?${query}` : ''}`
  } catch {
    return collapsewhitespace(trimmed).toLowerCase()
  }
}
