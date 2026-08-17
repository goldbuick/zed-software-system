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

/** Hosts that turn a bare chat-line URL into `#media` (exact or subdomain). */
export const MEDIA_QUEUE_CHAT_HOSTS = [
  'youtube.com',
  'youtu.be',
  'soundcloud.com',
  'bandcamp.com',
  'twitch.tv',
  'vimeo.com',
  'tiktok.com',
  'mixcloud.com',
  'audiomack.com',
  'hearthis.at',
  'archive.org',
] as const

function mediaischathost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  for (const allowed of MEDIA_QUEUE_CHAT_HOSTS) {
    if (host === allowed || host.endsWith(`.${allowed}`)) {
      return true
    }
  }
  return false
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

/**
 * True when the whole trimmed message is one http(s) URL on an allowlisted host.
 * Used for chat → `#media` shortcut; explicit `#media` still uses mediaisqueueurl.
 */
export function mediaischatqueueurl(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed || /\s/.test(trimmed)) {
    return false
  }
  if (!mediaisqueueurl(trimmed)) {
    return false
  }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false
    }
    return mediaischathost(parsed.hostname)
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
