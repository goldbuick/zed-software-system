/**
 * Pure ZZT world encoder (binary .zzt). No memory / lexer deps — testable in isolation.
 */

import { isnumber, ispresent } from 'zss/mapping/types'

import type { ZZT_BOARD, ZZT_ELEMENT, ZZT_STAT } from './zztformattypes'

export const ZZT_BOARD_TITLE_FIELD_LEN = 50

const ZZT_WORLD_MAGIC = -1
const ZZT_WORLD_HEADER_BYTES = 512
const ZZT_BOARD_WIDTH = 60
const ZZT_BOARD_HEIGHT = 25
const ZZT_BOARD_SIZE = ZZT_BOARD_WIDTH * ZZT_BOARD_HEIGHT
const ZZT_MAX_BOARDS = 128

class Writer {
  private readonly bytes: number[] = []

  writeint16(v: number) {
    this.bytes.push(v & 0xff, (v >> 8) & 0xff)
  }

  writeuint8(v: number) {
    this.bytes.push(v & 0xff)
  }

  writeint32(v: number) {
    this.bytes.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff)
  }

  writestringfixed(len: number, s: string) {
    const t = s.slice(0, len)
    for (let i = 0; i < len; ++i) {
      this.writeuint8(i < t.length ? t.charCodeAt(i) & 0xff : 0)
    }
  }

  writebytes(chunk: Uint8Array) {
    for (let i = 0; i < chunk.length; ++i) {
      this.bytes.push(chunk[i])
    }
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.bytes)
  }

  length() {
    return this.bytes.length
  }
}

/** RLE-encode 1500 tiles; count 0 means “fill remainder” (decoder convention). */
function writerletiles(w: Writer, elements: ZZT_ELEMENT[]) {
  if (elements.length !== ZZT_BOARD_SIZE) {
    throw new Error(`expected ${ZZT_BOARD_SIZE} tiles`)
  }
  let i = 0
  while (i < ZZT_BOARD_SIZE) {
    const t = elements[i].type
    const c = elements[i].color
    let run = 1
    while (
      i + run < ZZT_BOARD_SIZE &&
      run < 255 &&
      elements[i + run].type === t &&
      elements[i + run].color === c
    ) {
      run++
    }
    const remaining = ZZT_BOARD_SIZE - i
    if (run === remaining) {
      w.writeuint8(0)
      w.writeuint8(t)
      w.writeuint8(c)
      i += run
    } else {
      w.writeuint8(run)
      w.writeuint8(t)
      w.writeuint8(c)
      i += run
    }
  }
}

function writezztboardproperties(w: Writer, b: ZZT_BOARD) {
  w.writeuint8(b.maxplayershots ?? 255)
  w.writeuint8(b.isdark ?? 0)
  w.writeuint8(b.exitnorth ?? 0)
  w.writeuint8(b.exitsouth ?? 0)
  w.writeuint8(b.exitwest ?? 0)
  w.writeuint8(b.exiteast ?? 0)
  w.writeuint8(b.restartonzap ?? 0)
  const msg = b.message ?? ''
  const ml = Math.min(58, b.messagelength ?? msg.length, msg.length)
  w.writeuint8(ml)
  w.writestringfixed(58, msg)
  const pex = b.playerenterx
  const pey = b.playerentery
  w.writeuint8(isnumber(pex) ? pex + 1 : 0)
  w.writeuint8(isnumber(pey) ? pey + 1 : 0)
  w.writeint16(b.timelimit ?? 0)
  for (let p = 0; p < 16; ++p) {
    w.writeuint8(0)
  }
}

function writestat(w: Writer, s: ZZT_STAT) {
  const x = s.x ?? 0
  const y = s.y ?? 0
  w.writeuint8(x + 1)
  w.writeuint8(y + 1)
  w.writeint16(s.stepx ?? 0)
  w.writeint16(s.stepy ?? 0)
  w.writeint16(s.cycle ?? 0)
  w.writeuint8(s.p1 ?? 0)
  w.writeuint8(s.p2 ?? 0)
  w.writeuint8(s.p3 ?? 0)
  w.writeint16(s.follower ?? 0)
  w.writeint16(s.leader ?? 0)
  w.writeuint8(s.underelement ?? 0)
  w.writeuint8(s.undercolor ?? 0)
  w.writeint32(s.pointer ?? 0)
  w.writeint16(s.currentinstruction ?? 0)

  if (ispresent(s.bind) && s.bind > 0) {
    w.writeint16(-s.bind)
    for (let p = 0; p < 8; ++p) {
      w.writeuint8(0)
    }
  } else {
    const code = s.code ?? ''
    w.writeint16(code.length)
    for (let p = 0; p < 8; ++p) {
      w.writeuint8(0)
    }
    for (let i = 0; i < code.length; ++i) {
      w.writeuint8(code.charCodeAt(i) & 0xff)
    }
  }
}

/** Encode a single board blob (size field + payload) matching readboardbytes. */
export function zztencodeboardblob(zztboard: ZZT_BOARD): Uint8Array {
  const body = new Writer()
  const namelen = Math.min(
    ZZT_BOARD_TITLE_FIELD_LEN,
    zztboard.boardname.length,
  )
  body.writeuint8(namelen)
  body.writestringfixed(ZZT_BOARD_TITLE_FIELD_LEN, zztboard.boardname)
  writerletiles(body, zztboard.elements)
  writezztboardproperties(body, zztboard)

  const stats =
    zztboard.stats.length > 0 ? zztboard.stats : [{ x: 0, y: 0, code: '' }]
  body.writeint16(stats.length - 1)
  for (let i = 0; i < stats.length; ++i) {
    writestat(body, stats[i])
  }

  const payload = body.toUint8Array()
  const out = new Writer()
  out.writeint16(payload.length)
  out.writebytes(payload)
  return out.toUint8Array()
}

export function zztencodeworldheader(
  worldname: string,
  numberofboards: number,
  playerboard: number,
): Uint8Array {
  const w = new Writer()
  w.writeint16(ZZT_WORLD_MAGIC)
  w.writeint16(numberofboards - 1)
  w.writeint16(0)
  w.writeint16(0)
  w.writestringfixed(7, '')
  w.writeint16(0)
  w.writeint16(playerboard)
  w.writeint16(0)
  w.writeint16(0)
  w.writeint16(0)
  w.writeint16(0)
  w.writeint16(0)
  const wn = worldname.slice(0, 20)
  w.writeuint8(wn.length)
  w.writestringfixed(20, wn)
  for (let f = 0; f < 10; ++f) {
    w.writeuint8(0)
    w.writestringfixed(20, '')
  }
  w.writeint16(0)
  w.writeint16(0)
  w.writeuint8(0)
  while (w.length() < ZZT_WORLD_HEADER_BYTES) {
    w.writeuint8(0)
  }
  return w.toUint8Array()
}

export function zztencodeworld(
  worldname: string,
  playerboard: number,
  boards: ZZT_BOARD[],
): Uint8Array {
  if (boards.length < 1 || boards.length > ZZT_MAX_BOARDS) {
    throw new Error('invalid board count')
  }
  const header = zztencodeworldheader(worldname, boards.length, playerboard)
  const parts: Uint8Array[] = [header]
  for (let i = 0; i < boards.length; ++i) {
    parts.push(zztencodeboardblob(boards[i]))
  }
  const total = parts.reduce((a, p) => a + p.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (let i = 0; i < parts.length; ++i) {
    out.set(parts[i], o)
    o += parts[i].length
  }
  return out
}
