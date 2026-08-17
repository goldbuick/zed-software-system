import { mqqueuenormalizeurl } from './urlnormalize'

export const MQ_DEFAULT_PER_PLAYER_LIMIT = 5
export const MQ_MIN_PER_PLAYER_LIMIT = 1
export const MQ_MAX_PER_PLAYER_LIMIT = 20

export type MQ_QUEUE_ENTRY = {
  url: string
  player: string
  name: string
  key: string
}

export type MQ_QUEUE_SNAPSHOT = {
  urls: string[]
  names: string[]
  index: number
  limit: number
}

export type MQ_QUEUE_DISK = {
  urls: string[]
  names: string[]
  players: string[]
  index: number
  limit: number
}

export type MQ_QUEUE_ADD_RESULT =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'duplicate' | 'limit' }

export type MQ_QUEUE = {
  entries: MQ_QUEUE_ENTRY[]
  limit: number
}

export function mqqueueclamplimit(limit: number): number {
  return Math.max(
    MQ_MIN_PER_PLAYER_LIMIT,
    Math.min(MQ_MAX_PER_PLAYER_LIMIT, Math.floor(limit)),
  )
}

export function mqqueuedefault(): MQ_QUEUE_DISK {
  return {
    urls: [],
    names: [],
    players: [],
    index: 0,
    limit: MQ_DEFAULT_PER_PLAYER_LIMIT,
  }
}

function asstringarray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((item) => String(item))
}

export function mqqueueparsedisk(raw: unknown): MQ_QUEUE_DISK {
  if (!raw || typeof raw !== 'object') {
    throw new Error('queue.json must be an object')
  }
  const data = raw as {
    urls?: unknown
    names?: unknown
    players?: unknown
    index?: unknown
    limit?: unknown
  }
  const urls = asstringarray(data.urls)
  const names = asstringarray(data.names)
  const players = asstringarray(data.players)
  while (names.length < urls.length) {
    names.push('')
  }
  while (players.length < urls.length) {
    players.push('')
  }
  const indexraw = Number(data.index)
  const index = Number.isFinite(indexraw)
    ? Math.max(0, Math.floor(indexraw))
    : 0
  const limitraw = Number(data.limit)
  const limit = Number.isFinite(limitraw)
    ? mqqueueclamplimit(limitraw)
    : MQ_DEFAULT_PER_PLAYER_LIMIT
  return {
    urls,
    names: names.slice(0, urls.length),
    players: players.slice(0, urls.length),
    index: urls.length === 0 ? 0 : Math.min(index, urls.length - 1),
    limit,
  }
}

export function mqqueuecreate(): MQ_QUEUE {
  return {
    entries: [],
    limit: MQ_DEFAULT_PER_PLAYER_LIMIT,
  }
}

export function mqqueueapplydisk(queue: MQ_QUEUE, disk: MQ_QUEUE_DISK): void {
  const entries: MQ_QUEUE_ENTRY[] = []
  for (let i = disk.index; i < disk.urls.length; ++i) {
    const url = disk.urls[i]
    if (!url) {
      continue
    }
    entries.push({
      url,
      player: disk.players[i] || '',
      name: disk.names[i] || '',
      key: mqqueuenormalizeurl(url),
    })
  }
  queue.entries = entries
  queue.limit = mqqueueclamplimit(disk.limit)
}

export function mqqueuereaddisk(queue: MQ_QUEUE): MQ_QUEUE_DISK {
  return {
    urls: queue.entries.map((entry) => entry.url),
    names: queue.entries.map((entry) => entry.name),
    players: queue.entries.map((entry) => entry.player),
    index: 0,
    limit: queue.limit,
  }
}

export function mqqueuereadsnapshot(queue: MQ_QUEUE): MQ_QUEUE_SNAPSHOT {
  const disk = mqqueuereaddisk(queue)
  return {
    urls: disk.urls,
    names: disk.names,
    index: disk.index,
    limit: disk.limit,
  }
}

export function mqqueuecurrenturl(queue: MQ_QUEUE): string | undefined {
  return queue.entries[0]?.url
}

export function mqqueueurls(queue: MQ_QUEUE): string[] {
  return queue.entries.map((entry) => entry.url)
}

function mqqueuecountforplayer(queue: MQ_QUEUE, player: string): number {
  return queue.entries.filter((entry) => entry.player === player).length
}

export function mqqueueadd(
  queue: MQ_QUEUE,
  player: string,
  name: string,
  url: string,
): MQ_QUEUE_ADD_RESULT {
  const trimmed = url.trim()
  if (!trimmed) {
    return { ok: false, reason: 'empty' }
  }
  const key = mqqueuenormalizeurl(trimmed)
  if (queue.entries.some((entry) => entry.key === key)) {
    return { ok: false, reason: 'duplicate' }
  }
  if (mqqueuecountforplayer(queue, player) >= queue.limit) {
    return { ok: false, reason: 'limit' }
  }
  queue.entries = [...queue.entries, { url: trimmed, player, name, key }]
  return { ok: true }
}

export function mqqueueshift(queue: MQ_QUEUE): MQ_QUEUE_ENTRY | undefined {
  if (queue.entries.length === 0) {
    return undefined
  }
  const [removed, ...rest] = queue.entries
  queue.entries = rest
  return removed
}

export function mqqueueskip(queue: MQ_QUEUE): string | undefined {
  mqqueueshift(queue)
  return mqqueuecurrenturl(queue)
}

export function mqqueueclear(queue: MQ_QUEUE): void {
  queue.entries = []
}

export function mqqueuesetlimit(queue: MQ_QUEUE, limit: number): number {
  queue.limit = mqqueueclamplimit(limit)
  return queue.limit
}

export function mqqueuecountplayer(queue: MQ_QUEUE, player: string): number {
  return mqqueuecountforplayer(queue, player)
}
