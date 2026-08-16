'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const PEER_ID_LENGTH = 20
const HEX_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function Alea() {
  return (function alea(args) {
    let s0 = 0
    let s1 = 0
    let s2 = 0
    let c = 1

    if (args.length === 0) {
      args = [Date.now()]
    }
    let mash = mashfn()
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

    function random() {
      const t = 2091639 * s0 + c * 2.3283064365386963e-10
      s0 = s1
      s1 = s2
      return (s2 = t - (c = t | 0))
    }
    random.next = random
    return random
  })(Array.prototype.slice.call(arguments))
}

function mashfn() {
  let n = 0xefc8249d
  return function mash(data) {
    data = data.toString()
    for (let i = 0; i < data.length; i++) {
      n += data.charCodeAt(i)
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
function createinfohash(source) {
  const rng = Alea(source)
  const chars = []
  for (let i = 0; i < PEER_ID_LENGTH; i++) {
    chars.push(HEX_CHARS[Math.floor(rng() * HEX_CHARS.length)])
  }
  return chars.join('')
}

function readmqnetid(filepath) {
  try {
    return fs.readFileSync(filepath, 'utf8').trim()
  } catch {
    return ''
  }
}

function writemqnetid(filepath, seed) {
  const trimmed = String(seed || '').trim()
  if (!trimmed) {
    return false
  }
  fs.mkdirSync(path.dirname(filepath), { recursive: true })
  fs.writeFileSync(filepath, trimmed, 'utf8')
  return true
}

function resolvemqpeerid(filepath, overridepeerid) {
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

module.exports = {
  createinfohash,
  readmqnetid,
  writemqnetid,
  resolvemqpeerid,
}
