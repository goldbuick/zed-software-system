/** Host-owned media URL queue (cafe side). */

import { mediaqueuenormalizeurl } from 'zss/feature/mediaqueue/urlnormalize'

export type MEDIAQUEUE_ENTRY = {
  url: string
  player: string
  key: string
}

export type MEDIAQUEUE_STATE = {
  urls: string[]
  players: string[]
  index: number
  perplayerlimit: number
}

export type MEDIAQUEUE_ADD_RESULT =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'duplicate' | 'limit' }

const DEFAULT_PER_PLAYER_LIMIT = 3
const MIN_PER_PLAYER_LIMIT = 1
const MAX_PER_PLAYER_LIMIT = 20

let entries: MEDIAQUEUE_ENTRY[] = []
let perplayerlimit = DEFAULT_PER_PLAYER_LIMIT

export function mediaqueuereadstate(): MEDIAQUEUE_STATE {
  return {
    urls: entries.map((entry) => entry.url),
    players: entries.map((entry) => entry.player),
    index: 0,
    perplayerlimit: perplayerlimit,
  }
}

export function mediaqueueclear() {
  entries = []
}

export function mediaqueuereadperplayerlimit(): number {
  return perplayerlimit
}

export function mediaqueuesetperplayerlimit(limit: number) {
  perplayerlimit = Math.max(
    MIN_PER_PLAYER_LIMIT,
    Math.min(MAX_PER_PLAYER_LIMIT, Math.floor(limit)),
  )
}

export function mediaqueuecountforplayer(player: string): number {
  return entries.filter((entry) => entry.player === player).length
}

export function mediaqueueadd(
  player: string,
  url: string,
): MEDIAQUEUE_ADD_RESULT {
  const trimmed = url.trim()
  if (!trimmed) {
    return { ok: false, reason: 'empty' }
  }
  const key = mediaqueuenormalizeurl(trimmed)
  if (entries.some((entry) => entry.key === key)) {
    return { ok: false, reason: 'duplicate' }
  }
  if (mediaqueuecountforplayer(player) >= perplayerlimit) {
    return { ok: false, reason: 'limit' }
  }
  entries = [...entries, { url: trimmed, player, key }]
  return { ok: true }
}

export function mediaqueueshiftcurrent(): MEDIAQUEUE_ENTRY | undefined {
  if (entries.length === 0) {
    return undefined
  }
  const [removed, ...rest] = entries
  entries = rest
  return removed
}

export function mediaqueueskip(): string | undefined {
  mediaqueueshiftcurrent()
  return mediaqueuecurrenturl()
}

export function mediaqueuecurrenturl(): string | undefined {
  return entries[0]?.url
}
