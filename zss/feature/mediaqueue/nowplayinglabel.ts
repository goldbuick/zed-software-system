import { vmmediaqueuenowplaying } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'

const MAX_LABEL_LEN = 120

function urlfallbacklabel(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) {
    return ''
  }
  try {
    const parsed = new URL(trimmed)
    const v = parsed.searchParams.get('v')
    if (v) {
      return `youtube:${v}`
    }
    const host = parsed.hostname.replace(/^www\./i, '')
    const path = parsed.pathname.replace(/\/+$/, '')
    const tail = path.split('/').filter(Boolean).pop()
    if (tail) {
      return `${host}/${tail}`
    }
    return host
  } catch {
    return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed
  }
}

/** Prefer helper detail (yt-dlp title); fall back to shortened queue URL. */
export function mediaqueueformatnowplayinglabel(
  detail?: string,
  url?: string,
): string {
  const trimmed = (detail ?? '').trim()
  if (trimmed) {
    return trimmed.slice(0, MAX_LABEL_LEN)
  }
  const fromurl = urlfallbacklabel(url ?? '')
  if (fromurl) {
    return fromurl.slice(0, MAX_LABEL_LEN)
  }
  return ''
}

export function mediaqueuesyncnowplayingboard(
  player: string,
  boardid: string,
  label: string | undefined,
) {
  const trimmedboard = boardid.trim()
  if (!trimmedboard) {
    return
  }
  const trimmedlabel = (label ?? '').trim()
  vmmediaqueuenowplaying(
    SOFTWARE,
    player,
    trimmedboard,
    trimmedlabel || undefined,
  )
}
