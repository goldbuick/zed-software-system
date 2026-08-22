import { mqqueuenormalizeurl } from './urlnormalize'

export const MQ_DEFAULT_PER_PLAYER_LIMIT = 5
export const MQ_MIN_PER_PLAYER_LIMIT = 1
export const MQ_MAX_PER_PLAYER_LIMIT = 50
export const MQ_MAX_DURATION_SEC = 10 * 60
export const MQ_PLAYED_CAP = 100

export type MQ_QUEUE_ENTRY = {
  url: string
  player: string
  name: string
  key: string
  title: string
  durationsec: number
  submittedat: number
  allowlong: boolean
  /** Video track is a still frame, so fetch audio only. */
  audioonly: boolean
}

export type MQ_QUEUE_META = {
  title?: string
  durationsec?: number
  submittedat?: number
  allowlong?: boolean
  audioonly?: boolean
}

export type MQ_QUEUE_SNAPSHOT = {
  urls: string[]
  names: string[]
  titles: string[]
  submittedats: number[]
  index: number
  limit: number
  pendingurls: string[]
  pendingnames: string[]
  pendingtitles: string[]
  pendingdurations: number[]
  playedurls: string[]
  playednames: string[]
  playedtitles: string[]
  playedsubmittedats: number[]
}

export type MQ_QUEUE_DISK = {
  urls: string[]
  names: string[]
  players: string[]
  titles: string[]
  durations: number[]
  submittedats: number[]
  allowlongs: boolean[]
  audioonlys: boolean[]
  index: number
  limit: number
  pendingurls: string[]
  pendingnames: string[]
  pendingplayers: string[]
  pendingtitles: string[]
  pendingdurations: number[]
  pendingsubmittedats: number[]
  playedurls: string[]
  playednames: string[]
  playedtitles: string[]
  playedsubmittedats: number[]
}

export type MQ_QUEUE_ADD_RESULT =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'duplicate' | 'limit' }

export type MQ_QUEUE = {
  entries: MQ_QUEUE_ENTRY[]
  pending: MQ_QUEUE_ENTRY[]
  played: MQ_QUEUE_ENTRY[]
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
    titles: [],
    durations: [],
    submittedats: [],
    allowlongs: [],
    audioonlys: [],
    index: 0,
    limit: MQ_DEFAULT_PER_PLAYER_LIMIT,
    pendingurls: [],
    pendingnames: [],
    pendingplayers: [],
    pendingtitles: [],
    pendingdurations: [],
    pendingsubmittedats: [],
    playedurls: [],
    playednames: [],
    playedtitles: [],
    playedsubmittedats: [],
  }
}

function asstringarray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((item) => String(item))
}

function asnumberarray(value: unknown, length: number): number[] {
  const raw = Array.isArray(value) ? value : []
  const out: number[] = []
  for (let i = 0; i < length; ++i) {
    const n = Number(raw[i])
    out.push(Number.isFinite(n) ? n : 0)
  }
  return out
}

function asbooleanarray(value: unknown, length: number): boolean[] {
  const raw = Array.isArray(value) ? value : []
  const out: boolean[] = []
  for (let i = 0; i < length; ++i) {
    out.push(raw[i] === true)
  }
  return out
}

function padstrings(values: string[], length: number): string[] {
  const out = values.slice(0, length)
  while (out.length < length) {
    out.push('')
  }
  return out
}

function mqqueuedurationneedspending(durationsec: number): boolean {
  return (
    !Number.isFinite(durationsec) ||
    durationsec <= 0 ||
    durationsec > MQ_MAX_DURATION_SEC
  )
}

export function mqqueueneedspending(durationsec: number): boolean {
  return mqqueuedurationneedspending(durationsec)
}

function mqqueueentry(
  url: string,
  player: string,
  name: string,
  meta?: MQ_QUEUE_META,
): MQ_QUEUE_ENTRY {
  const submittedat = Number(meta?.submittedat)
  return {
    url,
    player,
    name,
    key: mqqueuenormalizeurl(url),
    title: String(meta?.title || ''),
    durationsec: Number.isFinite(Number(meta?.durationsec))
      ? Number(meta?.durationsec)
      : 0,
    submittedat:
      Number.isFinite(submittedat) && submittedat > 0
        ? Math.floor(submittedat)
        : Date.now(),
    allowlong: meta?.allowlong === true,
    audioonly: meta?.audioonly === true,
  }
}

function mqqueueentriesfromdisk(
  urls: string[],
  names: string[],
  players: string[],
  titles: string[],
  durations: number[],
  submittedats: number[],
  allowlongs: boolean[],
  audioonlys: boolean[],
  startindex: number,
): MQ_QUEUE_ENTRY[] {
  const entries: MQ_QUEUE_ENTRY[] = []
  for (let i = startindex; i < urls.length; ++i) {
    const url = urls[i]
    if (!url) {
      continue
    }
    entries.push(
      mqqueueentry(url, players[i] || '', names[i] || '', {
        title: titles[i] || '',
        durationsec: durations[i],
        submittedat: submittedats[i],
        allowlong: allowlongs[i] === true,
        audioonly: audioonlys[i] === true,
      }),
    )
  }
  return entries
}

export function mqqueueparsedisk(raw: unknown): MQ_QUEUE_DISK {
  if (!raw || typeof raw !== 'object') {
    throw new Error('queue.json must be an object')
  }
  const data = raw as Record<string, unknown>
  const urls = asstringarray(data.urls)
  const names = padstrings(asstringarray(data.names), urls.length)
  const players = padstrings(asstringarray(data.players), urls.length)
  const titles = padstrings(asstringarray(data.titles), urls.length)
  const durations = asnumberarray(data.durations, urls.length)
  const submittedats = asnumberarray(data.submittedats, urls.length)
  const allowlongs = asbooleanarray(data.allowlongs, urls.length)
  const audioonlys = asbooleanarray(data.audioonlys, urls.length)
  const pendingurls = asstringarray(data.pendingurls)
  const pendingnames = padstrings(
    asstringarray(data.pendingnames),
    pendingurls.length,
  )
  const pendingplayers = padstrings(
    asstringarray(data.pendingplayers),
    pendingurls.length,
  )
  const pendingtitles = padstrings(
    asstringarray(data.pendingtitles),
    pendingurls.length,
  )
  const pendingdurations = asnumberarray(
    data.pendingdurations,
    pendingurls.length,
  )
  const pendingsubmittedats = asnumberarray(
    data.pendingsubmittedats,
    pendingurls.length,
  )
  const playedurls = asstringarray(data.playedurls)
  const playednames = padstrings(
    asstringarray(data.playednames),
    playedurls.length,
  )
  const playedtitles = padstrings(
    asstringarray(data.playedtitles),
    playedurls.length,
  )
  const playedsubmittedats = asnumberarray(
    data.playedsubmittedats,
    playedurls.length,
  )
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
    names,
    players,
    titles,
    durations,
    submittedats,
    allowlongs,
    audioonlys,
    index: urls.length === 0 ? 0 : Math.min(index, urls.length - 1),
    limit,
    pendingurls,
    pendingnames,
    pendingplayers,
    pendingtitles,
    pendingdurations,
    pendingsubmittedats,
    playedurls: playedurls.slice(-MQ_PLAYED_CAP),
    playednames: playednames.slice(-MQ_PLAYED_CAP),
    playedtitles: playedtitles.slice(-MQ_PLAYED_CAP),
    playedsubmittedats: playedsubmittedats.slice(-MQ_PLAYED_CAP),
  }
}

export function mqqueuecreate(): MQ_QUEUE {
  return {
    entries: [],
    pending: [],
    played: [],
    limit: MQ_DEFAULT_PER_PLAYER_LIMIT,
  }
}

export function mqqueueapplydisk(queue: MQ_QUEUE, disk: MQ_QUEUE_DISK): void {
  queue.entries = mqqueueentriesfromdisk(
    disk.urls,
    disk.names,
    disk.players,
    disk.titles,
    disk.durations,
    disk.submittedats,
    disk.allowlongs,
    disk.audioonlys,
    disk.index,
  )
  queue.pending = mqqueueentriesfromdisk(
    disk.pendingurls,
    disk.pendingnames,
    disk.pendingplayers,
    disk.pendingtitles,
    disk.pendingdurations,
    disk.pendingsubmittedats,
    disk.pendingurls.map(() => false),
    disk.pendingurls.map(() => false),
    0,
  )
  queue.played = mqqueueentriesfromdisk(
    disk.playedurls,
    disk.playednames,
    disk.playedurls.map(() => ''),
    disk.playedtitles,
    disk.playedurls.map(() => 0),
    disk.playedsubmittedats,
    disk.playedurls.map(() => false),
    disk.playedurls.map(() => false),
    0,
  )
  queue.limit = mqqueueclamplimit(disk.limit)
}

export function mqqueuereaddisk(queue: MQ_QUEUE): MQ_QUEUE_DISK {
  return {
    urls: queue.entries.map((entry) => entry.url),
    names: queue.entries.map((entry) => entry.name),
    players: queue.entries.map((entry) => entry.player),
    titles: queue.entries.map((entry) => entry.title),
    durations: queue.entries.map((entry) => entry.durationsec),
    submittedats: queue.entries.map((entry) => entry.submittedat),
    allowlongs: queue.entries.map((entry) => entry.allowlong),
    audioonlys: queue.entries.map((entry) => entry.audioonly),
    index: 0,
    limit: queue.limit,
    pendingurls: queue.pending.map((entry) => entry.url),
    pendingnames: queue.pending.map((entry) => entry.name),
    pendingplayers: queue.pending.map((entry) => entry.player),
    pendingtitles: queue.pending.map((entry) => entry.title),
    pendingdurations: queue.pending.map((entry) => entry.durationsec),
    pendingsubmittedats: queue.pending.map((entry) => entry.submittedat),
    playedurls: queue.played.map((entry) => entry.url),
    playednames: queue.played.map((entry) => entry.name),
    playedtitles: queue.played.map((entry) => entry.title),
    playedsubmittedats: queue.played.map((entry) => entry.submittedat),
  }
}

export function mqqueuereadsnapshot(queue: MQ_QUEUE): MQ_QUEUE_SNAPSHOT {
  const disk = mqqueuereaddisk(queue)
  return {
    urls: disk.urls,
    names: disk.names,
    titles: disk.titles,
    submittedats: disk.submittedats,
    index: disk.index,
    limit: disk.limit,
    pendingurls: disk.pendingurls,
    pendingnames: disk.pendingnames,
    pendingtitles: disk.pendingtitles,
    pendingdurations: disk.pendingdurations,
    playedurls: disk.playedurls,
    playednames: disk.playednames,
    playedtitles: disk.playedtitles,
    playedsubmittedats: disk.playedsubmittedats,
  }
}

export function mqqueuecurrenturl(queue: MQ_QUEUE): string | undefined {
  return queue.entries[0]?.url
}

export function mqqueuecurrententry(
  queue: MQ_QUEUE,
): MQ_QUEUE_ENTRY | undefined {
  return queue.entries[0]
}

export function mqqueueurls(queue: MQ_QUEUE): string[] {
  return queue.entries.map((entry) => entry.url)
}

export function mqqueueallowlongforurl(queue: MQ_QUEUE, url: string): boolean {
  const key = mqqueuenormalizeurl(url)
  const entry = queue.entries.find((item) => item.key === key)
  return entry?.allowlong === true
}

export function mqqueueaudioonlyforurl(queue: MQ_QUEUE, url: string): boolean {
  const key = mqqueuenormalizeurl(url)
  const entry = queue.entries.find((item) => item.key === key)
  return entry?.audioonly === true
}

function mqqueuehaskey(queue: MQ_QUEUE, key: string): boolean {
  return (
    queue.entries.some((entry) => entry.key === key) ||
    queue.pending.some((entry) => entry.key === key)
  )
}

function mqqueuecountforplayer(queue: MQ_QUEUE, player: string): number {
  let count = 0
  for (let i = 0; i < queue.entries.length; ++i) {
    if (queue.entries[i].player === player) {
      count += 1
    }
  }
  for (let i = 0; i < queue.pending.length; ++i) {
    if (queue.pending[i].player === player) {
      count += 1
    }
  }
  return count
}

export function mqqueueadd(
  queue: MQ_QUEUE,
  player: string,
  name: string,
  url: string,
  meta?: MQ_QUEUE_META,
): MQ_QUEUE_ADD_RESULT {
  const trimmed = url.trim()
  if (!trimmed) {
    return { ok: false, reason: 'empty' }
  }
  const key = mqqueuenormalizeurl(trimmed)
  if (mqqueuehaskey(queue, key)) {
    return { ok: false, reason: 'duplicate' }
  }
  if (mqqueuecountforplayer(queue, player) >= queue.limit) {
    return { ok: false, reason: 'limit' }
  }
  queue.entries = [...queue.entries, mqqueueentry(trimmed, player, name, meta)]
  return { ok: true }
}

export function mqqueuepend(
  queue: MQ_QUEUE,
  player: string,
  name: string,
  url: string,
  meta?: MQ_QUEUE_META,
): MQ_QUEUE_ADD_RESULT {
  const trimmed = url.trim()
  if (!trimmed) {
    return { ok: false, reason: 'empty' }
  }
  const key = mqqueuenormalizeurl(trimmed)
  if (mqqueuehaskey(queue, key)) {
    return { ok: false, reason: 'duplicate' }
  }
  if (mqqueuecountforplayer(queue, player) >= queue.limit) {
    return { ok: false, reason: 'limit' }
  }
  queue.pending = [...queue.pending, mqqueueentry(trimmed, player, name, meta)]
  return { ok: true }
}

export function mqqueueapprove(
  queue: MQ_QUEUE,
  index: number,
): MQ_QUEUE_ENTRY | undefined {
  const i = Math.floor(index)
  if (!Number.isFinite(i) || i < 0 || i >= queue.pending.length) {
    return undefined
  }
  const entry = { ...queue.pending[i], allowlong: true }
  queue.pending = queue.pending.filter((_, idx) => idx !== i)
  queue.entries = [...queue.entries, entry]
  return entry
}

export function mqqueuereject(
  queue: MQ_QUEUE,
  index: number,
): MQ_QUEUE_ENTRY | undefined {
  const i = Math.floor(index)
  if (!Number.isFinite(i) || i < 0 || i >= queue.pending.length) {
    return undefined
  }
  const entry = queue.pending[i]
  queue.pending = queue.pending.filter((_, idx) => idx !== i)
  return entry
}

function mqqueuepushplayed(queue: MQ_QUEUE, entry: MQ_QUEUE_ENTRY): void {
  queue.played = [...queue.played, entry].slice(-MQ_PLAYED_CAP)
}

export function mqqueueshift(queue: MQ_QUEUE): MQ_QUEUE_ENTRY | undefined {
  if (queue.entries.length === 0) {
    return undefined
  }
  const [removed, ...rest] = queue.entries
  queue.entries = rest
  mqqueuepushplayed(queue, removed)
  return removed
}

export function mqqueueskip(queue: MQ_QUEUE): string | undefined {
  mqqueueshift(queue)
  return mqqueuecurrenturl(queue)
}

export function mqqueueclear(queue: MQ_QUEUE): void {
  queue.entries = []
  queue.pending = []
}

export function mqqueuesetlimit(queue: MQ_QUEUE, limit: number): number {
  queue.limit = mqqueueclamplimit(limit)
  return queue.limit
}

export function mqqueuecountplayer(queue: MQ_QUEUE, player: string): number {
  return mqqueuecountforplayer(queue, player)
}
