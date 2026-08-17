import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const PEER_ID_LENGTH = 20
const HEX_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

type MQ_ALEA_SEED = string | number

type MQ_ALEA_RANDOM = {
  (): number
  next: MQ_ALEA_RANDOM
}

type MQ_MASH_FN = (data: MQ_ALEA_SEED) => number

type MQ_PEER_ID = {
  seed: string
  peerid: string
}

function Alea(...seeds: MQ_ALEA_SEED[]): MQ_ALEA_RANDOM {
  return (function alea(args: MQ_ALEA_SEED[]): MQ_ALEA_RANDOM {
    let s0 = 0
    let s1 = 0
    let s2 = 0
    let c = 1

    if (args.length === 0) {
      args = [Date.now()]
    }
    let mash: MQ_MASH_FN | null = mashfn()
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
    const rng = random as MQ_ALEA_RANDOM
    rng.next = rng
    return rng
  })(seeds)
}

function mashfn(): MQ_MASH_FN {
  let n = 0xefc8249d
  return function mash(data: MQ_ALEA_SEED): number {
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

export function readmqnetid(filepath: string): string {
  try {
    return fs.readFileSync(filepath, 'utf8').trim()
  } catch {
    return ''
  }
}

export function writemqnetid(filepath: string, seed: string): boolean {
  const trimmed = String(seed || '').trim()
  if (!trimmed) {
    return false
  }
  fs.mkdirSync(path.dirname(filepath), { recursive: true })
  fs.writeFileSync(filepath, trimmed, 'utf8')
  return true
}

export function resolvemqpeerid(
  filepath: string,
  overridepeerid?: string,
): MQ_PEER_ID {
  const forced = String(overridepeerid || '').trim()
  if (forced) {
    return { seed: '', peerid: forced }
  }
  let seed = readmqnetid(filepath)
  if (!seed) {
    seed = crypto.randomUUID()
    writemqnetid(filepath, seed)
  }
  return { seed, peerid: createinfohash(seed) }
}
