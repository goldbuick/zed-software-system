/** Cafe projection of the helper-owned media URL queue. */

export type MEDIAQUEUE_STATE = {
  urls: string[]
  names: string[]
  index: number
  perplayerlimit: number
}

export type MEDIAQUEUE_SNAPSHOT = {
  urls: string[]
  names: string[]
  index: number
  limit: number
}

const DEFAULT_PER_PLAYER_LIMIT = 5

let urls: string[] = []
let names: string[] = []
let index = 0
let perplayerlimit = DEFAULT_PER_PLAYER_LIMIT

export function mediaqueuereadstate(): MEDIAQUEUE_STATE {
  return {
    urls: urls.slice(),
    names: names.slice(),
    index,
    perplayerlimit,
  }
}

export function mediaqueueapplysnapshot(snapshot: MEDIAQUEUE_SNAPSHOT) {
  const nexturls = Array.isArray(snapshot.urls)
    ? snapshot.urls.map((url) => String(url))
    : []
  const nextnames = Array.isArray(snapshot.names)
    ? snapshot.names.map((name) => String(name))
    : []
  while (nextnames.length < nexturls.length) {
    nextnames.push('')
  }
  urls = nexturls
  names = nextnames.slice(0, nexturls.length)
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
}

export function mediaqueuereadperplayerlimit(): number {
  return perplayerlimit
}

export function mediaqueuecurrenturl(): string | undefined {
  return urls[index]
}
