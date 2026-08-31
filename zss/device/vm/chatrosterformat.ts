/** Shared chat roster line formatting (`name:seconds`). */

export type CHAT_ROSTER_ENTRY = {
  name: string
  /** Last activity timestamp in ms (epoch). */
  lastseenms: number
}

const CHAT_ROSTER_PRUNE_IDLE_SEC = 3600

/** Strip characters that would break `name:seconds` lines or chat `name|voice:text`. */
export function sanitizechatrostername(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return 'player'
  }
  return trimmed.replace(/[:|\r\n]+/g, '')
}

/**
 * Format roster lines: most recently active first.
 * Drops entries idle longer than 3600s.
 */
export function formatchatrosterlines(
  entries: CHAT_ROSTER_ENTRY[],
  nowms: number,
): string {
  const rows: { name: string; idle: number; lastseenms: number }[] = []
  for (let i = 0; i < entries.length; ++i) {
    const entry = entries[i]
    const name = sanitizechatrostername(entry.name)
    const last = entry.lastseenms
    const idle = Math.max(0, Math.floor((nowms - last) / 1000))
    if (idle > CHAT_ROSTER_PRUNE_IDLE_SEC) {
      continue
    }
    rows.push({ name, idle, lastseenms: last })
  }
  rows.sort((a, b) => {
    if (a.lastseenms !== b.lastseenms) {
      return b.lastseenms - a.lastseenms
    }
    return a.name.localeCompare(b.name)
  })
  const lines: string[] = []
  for (let i = 0; i < rows.length; ++i) {
    lines.push(`${rows[i].name}:${rows[i].idle}`)
  }
  return lines.join('\n')
}

export const CHAT_ROSTER_THROTTLE_MS = 1000
