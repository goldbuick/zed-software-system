/** Destination + encode prefs stored in Electron userData. */

export type MS_DEST_KIND = 'twitch' | 'youtube' | 'tiktok' | 'custom'

export type MS_DESTINATION = {
  id: string
  kind: MS_DEST_KIND
  label: string
  /** RTMP/RTMPS base URL (YouTube / TikTok / custom). Empty for Twitch key-only. */
  rtmpurl: string
  /** Stream key. Never logged to tape. */
  streamkey: string
  enabled: boolean
}

export type MS_ENCODE_PREFS = {
  enhanced: boolean
  dualformat: boolean
  /** Horizontal crop offset for 9:16 frame, 0 = left, 1 = right. */
  cropoffsetx: number
}

export type MS_DESTINATIONS_DISK = {
  destinations: MS_DESTINATION[]
  encode: MS_ENCODE_PREFS
}

export function msencodedefault(): MS_ENCODE_PREFS {
  return {
    enhanced: true,
    dualformat: false,
    cropoffsetx: 0.5,
  }
}

export function msdestinationsdefault(): MS_DESTINATIONS_DISK {
  return {
    destinations: [
      {
        id: 'twitch',
        kind: 'twitch',
        label: 'Twitch',
        rtmpurl: '',
        streamkey: '',
        enabled: false,
      },
      {
        id: 'youtube',
        kind: 'youtube',
        label: 'YouTube',
        rtmpurl: 'rtmps://a.rtmp.youtube.com/live2',
        streamkey: '',
        enabled: false,
      },
      {
        id: 'tiktok',
        kind: 'tiktok',
        label: 'TikTok',
        rtmpurl: 'rtmp://live.tiktok.com/live/',
        streamkey: '',
        enabled: false,
      },
    ],
    encode: msencodedefault(),
  }
}

function isdestkind(value: unknown): value is MS_DEST_KIND {
  return (
    value === 'twitch' ||
    value === 'youtube' ||
    value === 'tiktok' ||
    value === 'custom'
  )
}

export function msdestinationsanitize(raw: unknown): MS_DESTINATIONS_DISK {
  const fallback = msdestinationsdefault()
  if (!raw || typeof raw !== 'object') {
    return fallback
  }
  const obj = raw as Record<string, unknown>
  const encodein =
    obj.encode && typeof obj.encode === 'object'
      ? (obj.encode as Record<string, unknown>)
      : {}
  const crop = Number(encodein.cropoffsetx)
  const encode: MS_ENCODE_PREFS = {
    enhanced: encodein.enhanced !== false,
    dualformat: encodein.dualformat === true,
    cropoffsetx: Number.isFinite(crop) ? Math.min(1, Math.max(0, crop)) : 0.5,
  }
  const list = Array.isArray(obj.destinations) ? obj.destinations : []
  const destinations: MS_DESTINATION[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const row = item as Record<string, unknown>
    if (!isdestkind(row.kind)) {
      continue
    }
    const id = String(row.id || row.kind || '').trim()
    if (!id) {
      continue
    }
    destinations.push({
      id,
      kind: row.kind,
      label: String(row.label || id).trim() || id,
      rtmpurl: String(row.rtmpurl || '').trim(),
      streamkey: String(row.streamkey || '').trim(),
      enabled: row.enabled === true,
    })
  }
  if (destinations.length === 0) {
    return { destinations: fallback.destinations, encode }
  }
  return { destinations, encode }
}

/** Public status without stream keys. */
export function msdestinationspublic(disk: MS_DESTINATIONS_DISK) {
  return {
    encode: disk.encode,
    destinations: disk.destinations.map((d) => ({
      id: d.id,
      kind: d.kind,
      label: d.label,
      rtmpurl: d.rtmpurl,
      enabled: d.enabled,
      haskey: Boolean(d.streamkey),
    })),
  }
}
