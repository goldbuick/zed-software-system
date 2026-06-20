/** Pure ZZT / Super ZZT binary decode (no memory / device deps). */

import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

import type { ZZT_BOARD, ZZT_STAT } from './zztformattypes'

const ZZT_WORLD_MAGIC = -1
const SZZT_WORLD_MAGIC = -2

const ZZT_WORLD_HEADER_BYTES = 512
const SZZT_WORLD_HEADER_BYTES = 1024

export const ZZT_BOARD_WIDTH = 60
export const ZZT_BOARD_HEIGHT = 25
const ZZT_BOARD_SIZE = ZZT_BOARD_WIDTH * ZZT_BOARD_HEIGHT

export const SZZT_BOARD_WIDTH = 96
export const SZZT_BOARD_HEIGHT = 80
const SZZT_BOARD_SIZE = SZZT_BOARD_WIDTH * SZZT_BOARD_HEIGHT

const ZZT_MAX_BOARDS = 128
const ZZT_MAX_STATS_PER_BOARD = 2048
const ZZT_NAME_FIELD_ZZT = 50
const ZZT_NAME_FIELD_SZZT = 60

type BOARD_LAYOUT = {
  tilewidth: number
  tileheight: number
  tilesize: number
  namefield: number
  kind: 'zzt' | 'szzt'
}

export const LAYOUT_ZZT: BOARD_LAYOUT = {
  tilewidth: ZZT_BOARD_WIDTH,
  tileheight: ZZT_BOARD_HEIGHT,
  tilesize: ZZT_BOARD_SIZE,
  namefield: ZZT_NAME_FIELD_ZZT,
  kind: 'zzt',
}

export const LAYOUT_SZZT: BOARD_LAYOUT = {
  tilewidth: SZZT_BOARD_WIDTH,
  tileheight: SZZT_BOARD_HEIGHT,
  tilesize: SZZT_BOARD_SIZE,
  namefield: ZZT_NAME_FIELD_SZZT,
  kind: 'szzt',
}

export function createreader(content: Uint8Array) {
  const view = new DataView(
    content.buffer,
    content.byteOffset,
    content.byteLength,
  )
  const limit = content.byteLength
  let cursor = 0
  let err: MAYBE<string>

  function seterror(msg: string) {
    if (!ispresent(err)) {
      err = msg
    }
  }

  function remaining() {
    return limit - cursor
  }

  function need(bytes: number) {
    if (remaining() < bytes) {
      seterror('unexpected end of file')
      return false
    }
    return true
  }

  function seek(to: number) {
    if (to < 0 || to > limit) {
      seterror('invalid seek')
      return
    }
    cursor = to
  }

  function index() {
    return cursor
  }

  function readuint8() {
    if (!need(1)) {
      return 0
    }
    const value = view.getUint8(cursor)
    cursor++
    return value
  }

  function readint16() {
    if (!need(2)) {
      return 0
    }
    const value = view.getInt16(cursor, true)
    cursor += 2
    return value
  }

  function readint32() {
    if (!need(4)) {
      return 0
    }
    const value = view.getInt32(cursor, true)
    cursor += 4
    return value
  }

  function readstring(count: number) {
    if (count <= 0) {
      return ''
    }
    if (!need(count)) {
      const avail = Math.max(0, remaining())
      let str = ''
      for (let i = 0; i < avail; ++i) {
        str += String.fromCharCode(view.getUint8(cursor + i))
      }
      cursor = limit
      return str.replace(/\r/g, '\n')
    }
    let str = ''
    for (let i = 0; i < count; ++i) {
      str += String.fromCharCode(view.getUint8(cursor + i))
    }
    cursor += count
    return str.replace(/\r/g, '\n')
  }

  return {
    seek,
    index,
    readuint8,
    readint16,
    readint32,
    readstring,
    remaining,
    need,
    seterror,
    geterror: () => err,
    haserror: () => ispresent(err),
    bytelimit: limit,
  }
}

type READER = ReturnType<typeof createreader>

export function readboardbytes(
  reader: READER,
  layout: BOARD_LAYOUT,
): ZZT_BOARD | null {
  const start = reader.index()

  if (!reader.need(2)) {
    return null
  }
  const boardsize = reader.readint16()
  const boardnamelength = reader.readuint8()
  if (!reader.need(layout.namefield)) {
    return null
  }
  const boardname = reader
    .readstring(layout.namefield)
    .slice(0, boardnamelength)

  const board: ZZT_BOARD = {
    boardname,
    elements: [],
    stats: [],
  }

  while (board.elements.length < layout.tilesize) {
    if (reader.haserror()) {
      return null
    }
    let count = reader.readuint8()
    const room = layout.tilesize - board.elements.length
    if (count === 0) {
      count = room
    }
    const element = reader.readuint8()
    const color = reader.readuint8()
    if (count > room) {
      reader.seterror('invalid RLE run (overflow)')
      return null
    }
    for (let r = 0; r < count; ++r) {
      board.elements.push({ type: element, color })
    }
  }

  if (layout.kind === 'zzt') {
    if (!readzztboardproperties(reader, board)) {
      return null
    }
  } else {
    if (!readszztboardproperties(reader, board)) {
      return null
    }
  }

  if (!reader.need(2)) {
    return null
  }
  const rawstatcount = reader.readint16()
  const statcount = rawstatcount + 1
  if (statcount < 0 || statcount > ZZT_MAX_STATS_PER_BOARD) {
    reader.seterror('invalid status element count')
    return null
  }

  const padafterlength = layout.kind === 'zzt' ? 8 : 0

  while (board.stats.length < statcount) {
    if (reader.haserror()) {
      return null
    }
    if (!reader.need(29)) {
      return null
    }
    const stat: ZZT_STAT = {}
    stat.x = reader.readuint8() - 1
    stat.y = reader.readuint8() - 1
    stat.stepx = reader.readint16()
    stat.stepy = reader.readint16()
    stat.cycle = reader.readint16()
    stat.p1 = reader.readuint8()
    stat.p2 = reader.readuint8()
    stat.p3 = reader.readuint8()
    stat.follower = reader.readint16()
    stat.leader = reader.readint16()
    stat.underelement = reader.readuint8()
    stat.undercolor = reader.readuint8()
    stat.pointer = reader.readint32()
    stat.currentinstruction = reader.readint16()

    const length = reader.readint16()
    if (!reader.need(padafterlength)) {
      return null
    }
    reader.seek(reader.index() + padafterlength)
    if (length < 0) {
      stat.bind = Math.abs(length)
    } else {
      if (!reader.need(length)) {
        return null
      }
      stat.code = reader.readstring(length)
    }

    board.stats.push(stat)
  }

  const actual = reader.index()
  const declared = start + boardsize + 2
  const nextpos = Math.max(actual, declared)
  if (nextpos > reader.bytelimit) {
    reader.seterror('invalid board size field')
    return null
  }
  reader.seek(nextpos)
  return board
}

function readzztboardproperties(reader: READER, board: ZZT_BOARD) {
  if (!reader.need(1 + 1 + 4 + 1 + 1 + 58 + 2 + 2 + 16)) {
    return false
  }
  board.maxplayershots = reader.readuint8()
  board.isdark = reader.readuint8()
  board.exitnorth = reader.readuint8()
  board.exitsouth = reader.readuint8()
  board.exitwest = reader.readuint8()
  board.exiteast = reader.readuint8()
  board.restartonzap = reader.readuint8()
  board.messagelength = reader.readuint8()
  board.message = reader.readstring(58).slice(0, board.messagelength ?? 0)
  board.playerenterx = reader.readuint8()
  board.playerentery = reader.readuint8()
  board.timelimit = reader.readint16()
  reader.seek(reader.index() + 16)
  return !reader.haserror()
}

function readszztboardproperties(reader: READER, board: ZZT_BOARD) {
  if (!reader.need(1 + 4 + 1 + 2 + 4 + 2 + 14)) {
    return false
  }
  board.maxplayershots = reader.readuint8()
  board.exitnorth = reader.readuint8()
  board.exitsouth = reader.readuint8()
  board.exitwest = reader.readuint8()
  board.exiteast = reader.readuint8()
  board.restartonzap = reader.readuint8()
  board.playerenterx = reader.readuint8()
  board.playerentery = reader.readuint8()
  reader.readint16()
  reader.readint16()
  board.timelimit = reader.readint16()
  reader.seek(reader.index() + 14)
  return !reader.haserror()
}
export function readworldheaderzzt(reader: READER) {
  if (!reader.need(2)) {
    return null
  }
  const worldfileid = reader.readint16()
  if (worldfileid !== ZZT_WORLD_MAGIC) {
    reader.seterror('not a ZZT world file (expected world type -1)')
    return null
  }
  if (
    !reader.need(
      2 + 2 + 2 + 7 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 1 + 20 + 10 * 21 + 2 + 2 + 1,
    )
  ) {
    return null
  }
  const numberofboardsstored = reader.readint16()
  const numberofboards = numberofboardsstored + 1
  if (numberofboards < 1 || numberofboards > ZZT_MAX_BOARDS) {
    reader.seterror('invalid board count')
    return null
  }
  reader.readint16()
  reader.readint16()
  reader.readstring(7)
  reader.readint16()
  const playerboard = reader.readint16()
  reader.readint16()
  reader.readint16()
  reader.readint16()
  reader.readint16()
  reader.readint16()
  const worldnamelength = reader.readuint8()
  const worldname = reader.readstring(20).slice(0, worldnamelength)
  for (let i = 0; i < 10; i++) {
    const flagnamelength = reader.readuint8()
    reader.readstring(20).slice(0, flagnamelength)
  }
  reader.readint16()
  reader.readint16()
  reader.readuint8()
  if (reader.haserror()) {
    return null
  }
  if (reader.index() > ZZT_WORLD_HEADER_BYTES) {
    reader.seterror('invalid ZZT world header')
    return null
  }
  reader.seek(ZZT_WORLD_HEADER_BYTES)
  return { numberofboards, playerboard, worldname }
}

export function readworldheaderszzt(reader: READER) {
  if (!reader.need(2)) {
    return null
  }
  const worldfileid = reader.readint16()
  if (worldfileid !== SZZT_WORLD_MAGIC) {
    reader.seterror('not a Super ZZT world file (expected world type -2)')
    return null
  }
  if (
    !reader.need(
      2 +
        2 +
        2 +
        7 +
        2 +
        2 +
        2 +
        2 +
        2 +
        2 +
        1 +
        20 +
        16 * 21 +
        2 +
        2 +
        1 +
        2 +
        11,
    )
  ) {
    return null
  }
  const numberofboardsstored = reader.readint16()
  const numberofboards = numberofboardsstored + 1
  if (numberofboards < 1 || numberofboards > ZZT_MAX_BOARDS) {
    reader.seterror('invalid board count')
    return null
  }
  reader.readint16()
  reader.readint16()
  reader.readstring(7)
  reader.readint16()
  const playerboard = reader.readint16()
  reader.readint16()
  reader.readint16()
  reader.readint16()
  reader.readint16()
  const worldnamelength = reader.readuint8()
  const worldname = reader.readstring(20).slice(0, worldnamelength)
  for (let i = 0; i < 16; i++) {
    const flagnamelength = reader.readuint8()
    reader.readstring(20).slice(0, flagnamelength)
  }
  reader.readint16()
  reader.readint16()
  reader.readuint8()
  reader.readint16()
  reader.readstring(11)
  if (reader.haserror()) {
    return null
  }
  if (reader.index() > SZZT_WORLD_HEADER_BYTES) {
    reader.seterror('invalid Super ZZT world header')
    return null
  }
  reader.seek(SZZT_WORLD_HEADER_BYTES)
  return { numberofboards, playerboard, worldname }
}

/** Parse a ZZT world file to structs (no memory writes). For tests and export verification. */
export function zztparseworld(
  content: Uint8Array,
):
  | { ok: true; worldname: string; playerboard: number; boards: ZZT_BOARD[] }
  | { ok: false; error: string } {
  const reader = createreader(content)
  const header = readworldheaderzzt(reader)
  if (!header || reader.haserror()) {
    return {
      ok: false,
      error: reader.geterror() ?? 'invalid or corrupt ZZT world file',
    }
  }
  const zztboards: ZZT_BOARD[] = []
  for (let i = 0; i < header.numberofboards; ++i) {
    const board = readboardbytes(reader, LAYOUT_ZZT)
    if (!board || reader.haserror()) {
      return {
        ok: false,
        error: reader.geterror() ?? `corrupt ZZT world at board ${i}`,
      }
    }
    zztboards.push(board)
  }
  return {
    ok: true,
    worldname: header.worldname,
    playerboard: header.playerboard,
    boards: zztboards,
  }
}

/** Parse a single ZZT / Super ZZT board file (no memory writes). */
export function zztparseboard(
  content: Uint8Array,
):
  | { ok: true; board: ZZT_BOARD; layout: 'zzt' | 'szzt' }
  | { ok: false; error: string } {
  let reader = createreader(content)
  let board = readboardbytes(reader, LAYOUT_ZZT)
  if (!board || reader.haserror()) {
    reader = createreader(content)
    board = readboardbytes(reader, LAYOUT_SZZT)
    if (!board || reader.haserror()) {
      return {
        ok: false,
        error:
          reader.geterror() ?? 'invalid or corrupt ZZT / Super ZZT board file',
      }
    }
    return { ok: true, board, layout: 'szzt' }
  }
  return { ok: true, board, layout: 'zzt' }
}
