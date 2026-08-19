/** Cafe projection of the helper-owned media URL queue. */

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

let urls: string[] = []
let names: string[] = []
let titles: string[] = []
let submittedats: number[] = []
let index = 0
let perplayerlimit = DEFAULT_PER_PLAYER_LIMIT
let pendingurls: string[] = []
let pendingnames: string[] = []
let pendingtitles: string[] = []
let pendingdurations: number[] = []
let playedurls: string[] = []
let playednames: string[] = []
let playedtitles: string[] = []
let playedsubmittedats: number[] = []

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

export function mediaqueuereadstate(): MEDIAQUEUE_STATE {
  return {
    urls: urls.slice(),
    names: names.slice(),
    titles: titles.slice(),
    submittedats: submittedats.slice(),
    index,
    perplayerlimit,
    pendingurls: pendingurls.slice(),
    pendingnames: pendingnames.slice(),
    pendingtitles: pendingtitles.slice(),
    pendingdurations: pendingdurations.slice(),
    playedurls: playedurls.slice(),
    playednames: playednames.slice(),
    playedtitles: playedtitles.slice(),
    playedsubmittedats: playedsubmittedats.slice(),
  }
}

export function mediaqueueapplysnapshot(snapshot: MEDIAQUEUE_SNAPSHOT) {
  const nexturls = Array.isArray(snapshot.urls)
    ? snapshot.urls.map((url) => String(url))
    : []
  urls = nexturls
  names = asstrings(snapshot.names, nexturls.length)
  titles = asstrings(snapshot.titles, nexturls.length)
  submittedats = asnumbers(snapshot.submittedats, nexturls.length)
  const n = Number(snapshot.index)
  index =
    nexturls.length === 0
      ? 0
      : Number.isFinite(n)
        ? Math.max(0, Math.min(Math.floor(n), nexturls.length - 1))
        : 0
  const limit = Number(snapshot.limit)
  perplayerlimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(20, Math.floor(limit)))
    : DEFAULT_PER_PLAYER_LIMIT
  const nextpending = Array.isArray(snapshot.pendingurls)
    ? snapshot.pendingurls.map((url) => String(url))
    : []
  pendingurls = nextpending
  pendingnames = asstrings(snapshot.pendingnames, nextpending.length)
  pendingtitles = asstrings(snapshot.pendingtitles, nextpending.length)
  pendingdurations = asnumbers(snapshot.pendingdurations, nextpending.length)
  const nextplayed = Array.isArray(snapshot.playedurls)
    ? snapshot.playedurls.map((url) => String(url))
    : []
  playedurls = nextplayed
  playednames = asstrings(snapshot.playednames, nextplayed.length)
  playedtitles = asstrings(snapshot.playedtitles, nextplayed.length)
  playedsubmittedats = asnumbers(snapshot.playedsubmittedats, nextplayed.length)
}

export function mediaqueuereadperplayerlimit(): number {
  return perplayerlimit
}

export function mediaqueuecurrenturl(): string | undefined {
  return urls[index]
}
