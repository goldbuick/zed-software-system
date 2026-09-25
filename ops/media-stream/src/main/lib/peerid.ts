import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const PEER_ID_LENGTH = 20
const HEX_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

type MS_ALEA_SEED = string | number

type MS_ALEA_RANDOM = {
  (): number
  next: MS_ALEA_RANDOM
}

type MS_MASH_FN = (data: MS_ALEA_SEED) => number

type MS_PEER_ID = {
  seed: string
  peerid: string
}

function Alea(...seeds: MS_ALEA_SEED[]): MS_ALEA_RANDOM {
  return (function alea(args: MS_ALEA_SEED[]): MS_ALEA_RANDOM {
    let s0 = 0
    let s1 = 0
    let s2 = 0
    let c = 1

    if (args.length === 0) {
      args = [Date.now()]
    }
    let mash: MS_MASH_FN | null = mashfn()
    s0 = mash(' ')
    s1 = mash(' ')
    s2 = mash(' ')

    for (let i = 0; i < args.length; i++) {
      s0 -= mash(args[i])
      if (s0 < 0) {
        s0 += 1
      }
      s1 -= mash(args[i])
      if (s1 < 0) {
        s1 += 1
      }
      s2 -= mash(args[i])
      if (s2 < 0) {
        s2 += 1
      }
    }
    mash = null

    function random(): number {
      const t = 2091639 * s0 + c * 2.3283064365386963e-10
      s0 = s1
      s1 = s2
      return (s2 = t - (c = t | 0))
    }
    const rng = random as MS_ALEA_RANDOM
    rng.next = rng
    return rng
  })(seeds)
}

function mashfn(): MS_MASH_FN {
  let n = 0xefc8249d
  return function mash(data: MS_ALEA_SEED): number {
    const text = data.toString()
    for (let i = 0; i < text.length; i++) {
      n += text.charCodeAt(i)
      let h = 0.02519603282416938 * n
      n = h >>> 0
      h -= n
      h *= n
      n = h >>> 0
      h -= n
      n += h * 0x100000000
    }
    return (n >>> 0) * 2.3283064365386963e-10
  }
}

/** Same algorithm as zss/mapping/guid.ts createinfohash (netterminal peer ids). */
export function createinfohash(source: string): string {
  const rng = Alea(source)
  const chars: string[] = []
  for (let i = 0; i < PEER_ID_LENGTH; i++) {
    chars.push(HEX_CHARS[Math.floor(rng() * HEX_CHARS.length)])
  }
  return chars.join('')
}

export function readmsnetid(filepath: string): string {
  try {
    return fs.readFileSync(filepath, 'utf8').trim()
  } catch {
    return ''
  }
}

export function writemsnetid(filepath: string, seed: string): boolean {
  const trimmed = String(seed || '').trim()
  if (!trimmed) {
    return false
  }
  fs.mkdirSync(path.dirname(filepath), { recursive: true })
  fs.writeFileSync(filepath, trimmed, 'utf8')
  return true
}

const MS_PEER_PREFIX = 'ms_'

function withmsprefix(peerid: string): string {
  const trimmed = String(peerid || '').trim()
  if (!trimmed) {
    return trimmed
  }
  if (trimmed.startsWith(MS_PEER_PREFIX)) {
    return trimmed
  }
  return MS_PEER_PREFIX + trimmed
}

export function resolvemspeerid(
  filepath: string,
  overridepeerid?: string,
): MS_PEER_ID {
  const forced = String(overridepeerid || '').trim()
  if (forced) {
    return { seed: '', peerid: withmsprefix(forced) }
  }
  let seed = readmsnetid(filepath)
  if (!seed) {
    seed = crypto.randomUUID()
    writemsnetid(filepath, seed)
  }
  return { seed, peerid: withmsprefix(createinfohash(seed)) }
}
