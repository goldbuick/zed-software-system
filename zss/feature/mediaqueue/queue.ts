/** Cafe projection of helper-owned media URL queues (keyed by helper peer id). */

export type MEDIAQUEUE_STATE = {
  urls: string[]
  names: string[]
  titles: string[]
  submittedats: number[]
  index: number
  perplayerlimit: number
  pendingurls: string[]
  pendingnames: string[]
  pendingtitles: string[]
  pendingdurations: number[]
  playedurls: string[]
  playednames: string[]
  playedtitles: string[]
  playedsubmittedats: number[]
}

export type MEDIAQUEUE_SNAPSHOT = {
  urls: string[]
  names: string[]
  titles?: string[]
  submittedats?: number[]
  index: number
  limit: number
  pendingurls?: string[]
  pendingnames?: string[]
  pendingtitles?: string[]
  pendingdurations?: number[]
  playedurls?: string[]
  playednames?: string[]
  playedtitles?: string[]
  playedsubmittedats?: number[]
}

const DEFAULT_PER_PLAYER_LIMIT = 5

type HELPER_QUEUE = {
  urls: string[]
  names: string[]
  titles: string[]
  submittedats: number[]
  index: number
  perplayerlimit: number
  pendingurls: string[]
  pendingnames: string[]
  pendingtitles: string[]
  pendingdurations: number[]
  playedurls: string[]
  playednames: string[]
  playedtitles: string[]
  playedsubmittedats: number[]
}

const helperqueues = new Map<string, HELPER_QUEUE>()

function emptyqueue(): HELPER_QUEUE {
  return {
    urls: [],
    names: [],
    titles: [],
    submittedats: [],
    index: 0,
    perplayerlimit: DEFAULT_PER_PLAYER_LIMIT,
    pendingurls: [],
    pendingnames: [],
    pendingtitles: [],
    pendingdurations: [],
    playedurls: [],
    playednames: [],
    playedtitles: [],
    playedsubmittedats: [],
  }
}

function asstrings(value: unknown, length: number): string[] {
  const raw = Array.isArray(value) ? value.map((item) => String(item)) : []
  while (raw.length < length) {
    raw.push('')
  }
  return raw.slice(0, length)
}

function asnumbers(value: unknown, length: number): number[] {
  const raw = Array.isArray(value) ? value : []
  const out: number[] = []
  for (let i = 0; i < length; ++i) {
    const n = Number(raw[i])
    out.push(Number.isFinite(n) ? n : 0)
  }
  return out
}

function readqueue(peerid: string): HELPER_QUEUE {
  const trimmed = peerid.trim()
  if (!trimmed) {
    return emptyqueue()
  }
  return helperqueues.get(trimmed) ?? emptyqueue()
}

export function mediaqueuereadstate(peerid = ''): MEDIAQUEUE_STATE {
  const q = readqueue(peerid)
  return {
    urls: q.urls.slice(),
    names: q.names.slice(),
    titles: q.titles.slice(),
    submittedats: q.submittedats.slice(),
    index: q.index,
    perplayerlimit: q.perplayerlimit,
    pendingurls: q.pendingurls.slice(),
    pendingnames: q.pendingnames.slice(),
    pendingtitles: q.pendingtitles.slice(),
    pendingdurations: q.pendingdurations.slice(),
    playedurls: q.playedurls.slice(),
    playednames: q.playednames.slice(),
    playedtitles: q.playedtitles.slice(),
    playedsubmittedats: q.playedsubmittedats.slice(),
  }
}

export function mediaqueueapplysnapshot(
  snapshot: MEDIAQUEUE_SNAPSHOT,
  peerid: string,
) {
  const trimmed = peerid.trim()
  if (!trimmed) {
    return
  }
  const nexturls = Array.isArray(snapshot.urls)
    ? snapshot.urls.map((url) => String(url))
    : []
  const n = Number(snapshot.index)
  const limit = Number(snapshot.limit)
  const nextpending = Array.isArray(snapshot.pendingurls)
    ? snapshot.pendingurls.map((url) => String(url))
    : []
  const nextplayed = Array.isArray(snapshot.playedurls)
    ? snapshot.playedurls.map((url) => String(url))
    : []
  helperqueues.set(trimmed, {
    urls: nexturls,
    names: asstrings(snapshot.names, nexturls.length),
    titles: asstrings(snapshot.titles, nexturls.length),
    submittedats: asnumbers(snapshot.submittedats, nexturls.length),
    index:
      nexturls.length === 0
        ? 0
        : Number.isFinite(n)
          ? Math.max(0, Math.min(Math.floor(n), nexturls.length - 1))
          : 0,
    perplayerlimit: Number.isFinite(limit)
      ? Math.max(1, Math.min(20, Math.floor(limit)))
      : DEFAULT_PER_PLAYER_LIMIT,
    pendingurls: nextpending,
    pendingnames: asstrings(snapshot.pendingnames, nextpending.length),
    pendingtitles: asstrings(snapshot.pendingtitles, nextpending.length),
    pendingdurations: asnumbers(snapshot.pendingdurations, nextpending.length),
    playedurls: nextplayed,
    playednames: asstrings(snapshot.playednames, nextplayed.length),
    playedtitles: asstrings(snapshot.playedtitles, nextplayed.length),
    playedsubmittedats: asnumbers(
      snapshot.playedsubmittedats,
      nextplayed.length,
    ),
  })
}

export function mediaqueueclearhelpersnapshot(peerid: string) {
  const trimmed = peerid.trim()
  if (!trimmed) {
    return
  }
  helperqueues.delete(trimmed)
}

export function mediaqueuereadperplayerlimit(peerid = ''): number {
  return readqueue(peerid).perplayerlimit
}

export function mediaqueuecurrenturl(peerid = ''): string | undefined {
  const q = readqueue(peerid)
  return q.urls[q.index]
}
