const TRACKING_EXACT = new Set(['fbclid', 'gclid', 'si', 'feature'])

function istrackingparam(key: string): boolean {
  const lower = key.toLowerCase()
  if (TRACKING_EXACT.has(lower)) {
    return true
  }
  return lower.startsWith('utm_')
}

export function mqismusicyoutubeurl(raw: string): boolean {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase()
    return host === 'music.youtube.com' || host.endsWith('.music.youtube.com')
  } catch {
    return false
  }
}

function isyoutubehost(host: string): boolean {
  return (
    host === 'youtu.be' ||
    host === 'youtube.com' ||
    host === 'www.youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host.endsWith('.youtube.com')
  )
}

function issoundcloudhost(host: string): boolean {
  return host === 'soundcloud.com' || host.endsWith('.soundcloud.com')
}

/**
 * Whether browser cookies should be attached for this url.
 *
 * Only YouTube: it is the site that needs a signed-in session, and it is what
 * the helper's cookie picker offers. Sending cookies everywhere costs real
 * audio on SoundCloud -- an authenticated request drops the unencrypted
 * preview transcoding and leaves only the DRM stream, which yt-dlp cannot
 * decrypt, so a track that played logged out fails logged in.
 */
export function mqurlwantscookies(raw: string): boolean {
  try {
    return isyoutubehost(new URL(raw.trim()).hostname.toLowerCase())
  } catch {
    return false
  }
}

function youtubeidfromurl(parsed: URL): string | undefined {
  const host = parsed.hostname.toLowerCase()
  if (host === 'youtu.be') {
    const id = parsed.pathname.replace(/^\//, '').split('/')[0]
    return id || undefined
  }
  if (isyoutubehost(host)) {
    const v = parsed.searchParams.get('v')
    if (v) {
      return v
    }
    const shorts = parsed.pathname.match(/^\/shorts\/([^/]+)/)
    if (shorts?.[1]) {
      return shorts[1]
    }
  }
  return undefined
}

/** True when the URL already points at one discrete media item. */
export function mqurlhasdiscretemediaid(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim())
    if (youtubeidfromurl(parsed)) {
      return true
    }
    const host = parsed.hostname.toLowerCase()
    if (issoundcloudhost(host)) {
      const path = parsed.pathname.replace(/\/+$/, '')
      // /user/sets/name is a set; /user/track is a track (no /sets/).
      if (path.includes('/sets/')) {
        return false
      }
      const parts = path.split('/').filter(Boolean)
      return parts.length >= 2
    }
    return false
  } catch {
    return false
  }
}

/**
 * True when the URL is a playlist/set container (expand), not a single item.
 * Watch URLs with list= stay single because YouTube appends list while browsing.
 */
export function mqurlisplaylistcontainer(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) {
    return false
  }
  if (mqurlhasdiscretemediaid(trimmed)) {
    return false
  }
  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.toLowerCase()
    const path = parsed.pathname.replace(/\/+$/, '') || '/'
    if (isyoutubehost(host)) {
      if (path.includes('/playlist') && parsed.searchParams.get('list')) {
        return true
      }
      if (parsed.searchParams.get('list') && !parsed.searchParams.get('v')) {
        return true
      }
      return false
    }
    if (issoundcloudhost(host)) {
      return path.includes('/sets/')
    }
    return false
  } catch {
    return false
  }
}

function collapsewhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function ishttpurl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function isusableflatfield(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }
  const lower = trimmed.toLowerCase()
  return lower !== 'na' && lower !== 'null' && lower !== 'none'
}

/** Build a playable https URL from yt-dlp flat-playlist fields. */
export function mqplaylistentryurl(
  webpageurl: string,
  urlfield: string,
  id: string,
  playlisturl: string,
): string {
  for (const candidate of [webpageurl, urlfield]) {
    if (isusableflatfield(candidate) && ishttpurl(candidate)) {
      return candidate.trim()
    }
  }
  const videoid = isusableflatfield(id) ? id.trim() : ''
  if (!videoid || !/^[\w-]{6,}$/.test(videoid)) {
    return ''
  }
  try {
    const host = new URL(playlisturl.trim()).hostname.toLowerCase()
    if (isyoutubehost(host)) {
      return `https://www.youtube.com/watch?v=${videoid}`
    }
  } catch {
    /* ignore */
  }
  if (ishttpurl(urlfield)) {
    return urlfield.trim()
  }
  return ''
}

export type MQ_PLAYLIST_FLAT_ENTRY = {
  id: string
  url: string
  title: string
  durationsec: number
}

/**
 * Parse yt-dlp flat --print lines:
 * webpage_url \\t url \\t id \\t title \\t duration
 */
export function mqparseplaylistflatstdout(
  stdout: string,
  playlisturl: string,
): MQ_PLAYLIST_FLAT_ENTRY[] {
  const out: MQ_PLAYLIST_FLAT_ENTRY[] = []
  const lines = stdout.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }
    const parts = trimmed.split('\t')
    const webpageurl = parts[0] ?? ''
    const urlfield = parts[1] ?? ''
    const id = parts[2] ?? ''
    const title = parts[3] ?? ''
    const durationraw = parts[4] ?? ''
    const url = mqplaylistentryurl(webpageurl, urlfield, id, playlisturl)
    if (!url) {
      continue
    }
    const durationsec = Number(durationraw)
    out.push({
      id: isusableflatfield(id) ? id.trim() : '',
      url,
      title: isusableflatfield(title) ? title.trim() : '',
      durationsec: Number.isFinite(durationsec) ? durationsec : 0,
    })
  }
  return out
}

/** Dedupe key for queue entries. Same rules as cafe mediaqueuenormalizeurl. */
export function mqqueuenormalizeurl(raw: string): string {
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

/** yt-dlp prints NA for fields a source does not carry (audio-only hosts). */
function flatnumber(raw: string | undefined): number {
  if (!isusableflatfield(raw ?? '')) {
    return 0
  }
  const value = Number(raw)
  return Number.isFinite(value) ? value : 0
}

export type MQ_PROBE_BATCH_LINE = {
  id: string
  url: string
  title: string
  durationsec: number
  width: number
  height: number
  vbrkbps: number
}

/**
 * Parse yt-dlp batch metadata --print lines:
 * id \\t webpage_url \\t title \\t duration \\t width \\t height \\t vbr
 *
 * Entries yt-dlp could not extract print no line at all, so the caller treats
 * a missing entry as unplayable rather than expecting a placeholder row.
 */
export function mqparseprobebatchstdout(stdout: string): MQ_PROBE_BATCH_LINE[] {
  const out: MQ_PROBE_BATCH_LINE[] = []
  const lines = stdout.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }
    const parts = trimmed.split('\t')
    const id = isusableflatfield(parts[0] ?? '') ? (parts[0] ?? '').trim() : ''
    const urlfield = parts[1] ?? ''
    const url = ishttpurl(urlfield) ? urlfield.trim() : ''
    if (!id && !url) {
      continue
    }
    const title = parts[2] ?? ''
    const durationsec = Number(parts[3] ?? '')
    out.push({
      id,
      url,
      title: isusableflatfield(title) ? title.trim() : '',
      durationsec: Number.isFinite(durationsec) ? durationsec : 0,
      width: flatnumber(parts[4]),
      height: flatnumber(parts[5]),
      vbrkbps: flatnumber(parts[6]),
    })
  }
  return out
}
