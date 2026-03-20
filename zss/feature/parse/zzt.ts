/**
 * ZZT / Super ZZT world and board binary import.
 *
 * References: https://moddingwiki.shikadi.net/wiki/ZZT_Format
 * - ZZT world: WorldType int16 LE === -1 (0xFFFF); board list starts at offset 512 (0x200).
 * - Super ZZT world: WorldType === -2 (0xFFFE); boards at offset 1024 (0x400); boards are 96×80 tiles.
 * - RLE tiles: count (0 in this codebase means “fill remainder” for ZZT-sized boards = 1500 tiles),
 *   element id, color — repeated until board full.
 * - Stat count: stored value + 1 is the number of status elements (“thanks TIM”).
 *
 * Super ZZT boards are cropped to the engine BOARD_WIDTH × BOARD_HEIGHT (60×25) on import.
 */

import { objectKeys } from 'ts-extras'
import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { indextox, indextoy } from 'zss/mapping/2d'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { memoryinitboard, memorywriteelementfromkind } from 'zss/memory/boards'
import {
  memorycreatebook,
  memorywritecodepage,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memoryreadfirstcontentbook, memorywritebook } from 'zss/memory/session'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { STR_COLOR, mapcolortostrcolor } from 'zss/words/color'
import { STR_KIND } from 'zss/words/kind'
import { PT } from 'zss/words/types'

import type { ZZT_BOARD, ZZT_ELEMENT, ZZT_STAT } from './zztformattypes'
import { zztoop } from './zztoop'

export { isszztworldbytes, iszztworldbytes } from './zztmagic'
export type { ZZT_BOARD, ZZT_ELEMENT, ZZT_STAT } from './zztformattypes'

// --- ZZT element ids (ModdingWiki / ZZT internal) ---------------------------------

const ZZT_TILE_EMPTY = 0
const ZZT_TILE_BOARD_EDGE = 1
const ZZT_TILE_MESSENGER = 2
const ZZT_TILE_MONITOR = 3
const ZZT_TILE_PLAYER = 4
const ZZT_TILE_AMMO = 5
const ZZT_TILE_TORCH = 6
const ZZT_TILE_GEM = 7
const ZZT_TILE_KEY = 8
const ZZT_TILE_DOOR = 9
const ZZT_TILE_SCROLL = 10
const ZZT_TILE_PASSAGE = 11
const ZZT_TILE_DUPLICATOR = 12
const ZZT_TILE_BOMB = 13
const ZZT_TILE_ENERGIZE = 14
const ZZT_TILE_STAR = 15
const ZZT_TILE_CLOCKWISE = 16
const ZZT_TILE_COUNTER = 17
const ZZT_TILE_BULLET = 18
const ZZT_TILE_WATER = 19
const ZZT_TILE_FOREST = 20
const ZZT_TILE_SOLID = 21
const ZZT_TILE_NORMAL = 22
const ZZT_TILE_BREAKABLE = 23
const ZZT_TILE_BOULDER = 24
const ZZT_TILE_SLIDER_NS = 25
const ZZT_TILE_SLIDER_EW = 26
const ZZT_TILE_FAKE = 27
const ZZT_TILE_INVISIBLE = 28
const ZZT_TILE_BLINKWALL = 29
const ZZT_TILE_TRANSPORTER = 30
const ZZT_TILE_LINE = 31
const ZZT_TILE_RICOCHET = 32
const ZZT_TILE_BLINKEW = 33
const ZZT_TILE_BEAR = 34
const ZZT_TILE_RUFFIAN = 35
const ZZT_TILE_OBJECT = 36
const ZZT_TILE_SLIME = 37
const ZZT_TILE_SHARK = 38
const ZZT_TILE_SPINNINGGUN = 39
const ZZT_TILE_PUSHER = 40
const ZZT_TILE_LION = 41
const ZZT_TILE_TIGER = 42
const ZZT_TILE_BLINKNS = 43
const ZZT_TILE_HEAD = 44
const ZZT_TILE_SEGMENT = 45
const ZZT_TILE_CUSTOMTEXT = 46
const ZZT_TEXT_BLOCK_START = 47
const ZZT_TEXT_BLOCK_END = 53
const ZZT_TEXT_FANCY_MIN = 128

const ZZT_WORLD_MAGIC = -1
const SZZT_WORLD_MAGIC = -2

const ZZT_WORLD_HEADER_BYTES = 512
const SZZT_WORLD_HEADER_BYTES = 1024

const ZZT_BOARD_WIDTH = 60
const ZZT_BOARD_HEIGHT = 25
const ZZT_BOARD_SIZE = ZZT_BOARD_WIDTH * ZZT_BOARD_HEIGHT

const SZZT_BOARD_WIDTH = 96
const SZZT_BOARD_HEIGHT = 80
const SZZT_BOARD_SIZE = SZZT_BOARD_WIDTH * SZZT_BOARD_HEIGHT

/** RLE count 0: ZZT decoder convention used here — fills remaining cells on a 60×25 board. */
const ZZT_RLE_ZERO_AS_TILES = ZZT_BOARD_SIZE

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

const LAYOUT_ZZT: BOARD_LAYOUT = {
  tilewidth: ZZT_BOARD_WIDTH,
  tileheight: ZZT_BOARD_HEIGHT,
  tilesize: ZZT_BOARD_SIZE,
  namefield: ZZT_NAME_FIELD_ZZT,
  kind: 'zzt',
}

const LAYOUT_SZZT: BOARD_LAYOUT = {
  tilewidth: SZZT_BOARD_WIDTH,
  tileheight: SZZT_BOARD_HEIGHT,
  tilesize: SZZT_BOARD_SIZE,
  namefield: ZZT_NAME_FIELD_SZZT,
  kind: 'szzt',
}

function createreader(content: Uint8Array) {
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

function readboardbytes(
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

  const rlezerofill =
    layout.kind === 'zzt' ? ZZT_RLE_ZERO_AS_TILES : SZZT_BOARD_SIZE

  while (board.elements.length < layout.tilesize) {
    if (reader.haserror()) {
      return null
    }
    let count = reader.readuint8()
    if (count === 0) {
      count = rlezerofill
    }
    const element = reader.readuint8()
    const color = reader.readuint8()
    const room = layout.tilesize - board.elements.length
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

  const endpos = start + boardsize + 2
  if (endpos > reader.bytelimit || endpos < reader.index()) {
    reader.seterror('invalid board size field')
    return null
  }
  reader.seek(endpos)
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

function buildstatmap(
  stats: ZZT_STAT[],
  tilewidth: number,
  tileheight: number,
): Map<number, ZZT_STAT> {
  const map = new Map<number, ZZT_STAT>()
  for (let i = 0; i < stats.length; ++i) {
    const s = stats[i]
    if (
      isnumber(s.x) &&
      isnumber(s.y) &&
      s.x >= 0 &&
      s.y >= 0 &&
      s.x < tilewidth &&
      s.y < tileheight
    ) {
      map.set(s.x + s.y * tilewidth, s)
    }
  }
  return map
}

type PROCESS_LAYOUT = {
  tilewidth: number
  tileheight: number
  croppedfromszzt: boolean
}

function processboards(
  book: BOOK,
  startboard: number,
  zztboards: ZZT_BOARD[],
  layout: PROCESS_LAYOUT,
) {
  const { tilewidth, tileheight, croppedfromszzt } = layout

  function writefromkind(
    board: MAYBE<BOARD>,
    kind: MAYBE<STR_KIND>,
    dest: PT,
    addstats?: BOARD_ELEMENT,
  ) {
    const element = memorywriteelementfromkind(board, kind, dest)
    if (ispresent(element) && ispresent(addstats)) {
      const stats = objectKeys(addstats)
      for (let i = 0; i < stats.length; ++i) {
        const stat = stats[i]
        element[stat] = addstats[stat]
      }
    }
  }

  function colorsfromzztcolor(zcolor: number) {
    const color = zcolor % 16
    const bg = Math.floor(zcolor / 16)
    return { color, bg }
  }

  function writefromzztelement(
    board: BOARD,
    x: number,
    y: number,
    element: ZZT_ELEMENT,
    statmap: Map<number, ZZT_STAT>,
    allstats: ZZT_STAT[],
  ) {
    const maincolor = colorsfromzztcolor(element.color)
    const strcolor: STR_COLOR = mapcolortostrcolor(
      maincolor.color,
      maincolor.bg,
    )
    const strcolorflipped: STR_COLOR = mapcolortostrcolor(
      (maincolor.bg + 8) % 16,
      maincolor.color,
    )

    const addstats: BOARD_ELEMENT = {}
    const elementstat = statmap.get(x + y * tilewidth)
    if (ispresent(elementstat)) {
      if (isnumber(elementstat.cycle) && elementstat.cycle > 0) {
        addstats.cycle = elementstat.cycle
      }
      if (ispresent(elementstat.p1)) {
        addstats.p1 = elementstat.p1
      }
      if (ispresent(elementstat.p2)) {
        addstats.p2 = elementstat.p2
      }
      if (ispresent(elementstat.p3)) {
        addstats.p3 = elementstat.p3
      }
      if (ispresent(elementstat.code) && elementstat.code) {
        addstats.code = zztoop(elementstat.code)
      }
      if (ispresent(elementstat.stepx)) {
        addstats.stepx = elementstat.stepx
      }
      if (ispresent(elementstat.stepy)) {
        addstats.stepy = elementstat.stepy
      }
      if (ispresent(elementstat.bind) && elementstat.bind > 0) {
        const maybecopy = allstats[elementstat.bind]
        if (ispresent(maybecopy?.code) && isstring(maybecopy.code)) {
          addstats.code = zztoop(maybecopy.code)
        }
      }
    }
    switch (element.type) {
      case ZZT_TILE_EMPTY:
      case ZZT_TILE_BOARD_EDGE:
      case ZZT_TILE_MESSENGER:
      case ZZT_TILE_MONITOR:
        break
      case ZZT_TILE_PLAYER:
        break
      case ZZT_TILE_AMMO:
        writefromkind(board, ['ammo', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_TORCH:
        writefromkind(board, ['torch', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_GEM:
        writefromkind(board, ['gem', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_KEY:
        writefromkind(board, ['key', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_DOOR:
        writefromkind(board, ['door', strcolorflipped], { x, y }, addstats)
        break
      case ZZT_TILE_SCROLL:
        writefromkind(board, ['scroll', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_PASSAGE: {
        addstats.p3 = formatexitstat(elementstat?.p3) ?? ''
        writefromkind(board, ['passage', strcolor], { x, y }, addstats)
        break
      }
      case ZZT_TILE_DUPLICATOR:
        writefromkind(
          board,
          ['duplicator', strcolor],
          { x, y },
          {
            ...addstats,
            stepx: 0,
            stepy: 0,
            shootx: addstats.stepx ?? 0,
            shooty: addstats.stepy ?? 0,
          },
        )
        break
      case ZZT_TILE_BOMB:
        writefromkind(board, ['bomb', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_ENERGIZE:
        writefromkind(board, ['energize', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_STAR:
        writefromkind(board, ['star', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_CLOCKWISE:
        writefromkind(board, ['clockwise', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_COUNTER:
        writefromkind(board, ['counter', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_BULLET:
        writefromkind(board, ['bullet', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_WATER:
        writefromkind(board, ['water', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_FOREST:
        writefromkind(board, ['forest', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_SOLID:
        writefromkind(board, ['solid', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_NORMAL:
        writefromkind(board, ['normal', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_BREAKABLE:
        writefromkind(board, ['breakable', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_BOULDER:
        writefromkind(board, ['boulder', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_SLIDER_NS:
        writefromkind(board, ['sliderns', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_SLIDER_EW:
        writefromkind(board, ['sliderew', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_FAKE:
        writefromkind(board, ['fake', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_INVISIBLE:
        writefromkind(board, ['invisible', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_BLINKWALL:
        writefromkind(
          board,
          ['blinkwall', strcolor],
          { x, y },
          {
            ...addstats,
            stepx: 0,
            stepy: 0,
            shootx: addstats.stepx ?? 0,
            shooty: addstats.stepy ?? 0,
          },
        )
        break
      case ZZT_TILE_TRANSPORTER:
        writefromkind(
          board,
          ['transporter', strcolor],
          { x, y },
          {
            ...addstats,
            stepx: 0,
            stepy: 0,
            shootx: addstats.stepx ?? 0,
            shooty: addstats.stepy ?? 0,
          },
        )
        break
      case ZZT_TILE_LINE:
        writefromkind(board, ['line', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_RICOCHET:
        writefromkind(board, ['ricochet', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_BLINKEW:
        writefromkind(board, ['blinkew', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_BEAR:
        writefromkind(board, ['bear', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_RUFFIAN:
        writefromkind(board, ['ruffian', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_OBJECT:
        writefromkind(
          board,
          ['object', strcolor],
          { x, y },
          {
            ...addstats,
            char: elementstat?.p1 ?? 1,
          },
        )
        break
      case ZZT_TILE_SLIME:
        writefromkind(board, ['slime', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_SHARK:
        writefromkind(board, ['shark', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_SPINNINGGUN:
        writefromkind(board, ['spinninggun', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_PUSHER:
        writefromkind(board, ['pusher', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_LION:
        writefromkind(board, ['lion', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_TIGER:
        writefromkind(board, ['tiger', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_BLINKNS:
        writefromkind(board, ['blinkns', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_HEAD:
        writefromkind(board, ['head', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_SEGMENT:
        writefromkind(board, ['segment', strcolor], { x, y }, addstats)
        break
      case ZZT_TILE_CUSTOMTEXT:
        writefromkind(
          board,
          ['customtext'],
          { x, y },
          { ...addstats, char: element.color },
        )
        break
      default:
        if (
          element.type >= ZZT_TEXT_BLOCK_START &&
          element.type <= ZZT_TEXT_BLOCK_END
        ) {
          const altcolor = colorsfromzztcolor(
            element.type === ZZT_TEXT_BLOCK_END
              ? 15
              : (element.type - 46) * 16 + 15,
          )
          const straltcolor: STR_COLOR = mapcolortostrcolor(
            altcolor.color,
            altcolor.bg % 8,
          )
          writefromkind(
            board,
            ['text', straltcolor],
            { x, y },
            { ...addstats, char: element.color },
          )
        } else if (element.type >= ZZT_TEXT_FANCY_MIN) {
          const altcolor = colorsfromzztcolor(element.type)
          const straltcolor: STR_COLOR = mapcolortostrcolor(
            altcolor.color,
            altcolor.bg % 8,
          )
          writefromkind(
            board,
            ['text', straltcolor],
            { x, y },
            { ...addstats, char: element.color },
          )
        }
        break
    }
  }

  function formatexitstat(exitstat: number | undefined): MAYBE<string> {
    if (isnumber(exitstat) && exitstat > 0) {
      return `zztboard${exitstat}`
    }
    return undefined
  }

  for (let i = 0; i < zztboards.length; ++i) {
    const zztboard = zztboards[i]
    const statmap = buildstatmap(zztboard.stats, tilewidth, tileheight)

    const codepagestats: string[] = [`@zztboard${i}`, ``]
    if (croppedfromszzt) {
      codepagestats.push(
        `@note Super ZZT board cropped to ${BOARD_WIDTH}x${BOARD_HEIGHT}`,
      )
    }
    if (i === 0) {
      codepagestats.push(`@title`)
    } else if (i === startboard) {
      codepagestats.push(`@zztstartboard`)
    }

    for (let e = 0; e < zztboard.elements.length; ++e) {
      if (zztboard.elements[e].type === ZZT_TILE_PLAYER) {
        const px = indextox(e, tilewidth)
        const py = indextoy(e, tilewidth)
        if (px < BOARD_WIDTH && py < BOARD_HEIGHT) {
          codepagestats.push(`@startx ${px}`)
          codepagestats.push(`@starty ${py}`)
        }
      }
    }

    if (isnumber(zztboard.maxplayershots)) {
      codepagestats.push(`@maxplayershots ${zztboard.maxplayershots}`)
    }
    if (isnumber(zztboard.isdark) && zztboard.isdark) {
      codepagestats.push(`@isdark`)
    }
    if (isnumber(zztboard.restartonzap) && zztboard.restartonzap) {
      codepagestats.push(`@restartonzap`)
    }
    if (isnumber(zztboard.timelimit)) {
      codepagestats.push(`@timelimit ${zztboard.timelimit}`)
    }

    const exitnorth = formatexitstat(zztboard.exitnorth)
    if (isstring(exitnorth)) {
      codepagestats.push(`@exitnorth ${exitnorth}`)
    }
    const exitsouth = formatexitstat(zztboard.exitsouth)
    if (isstring(exitsouth)) {
      codepagestats.push(`@exitsouth ${exitsouth}`)
    }
    const exitwest = formatexitstat(zztboard.exitwest)
    if (isstring(exitwest)) {
      codepagestats.push(`@exitwest ${exitwest}`)
    }
    const exiteast = formatexitstat(zztboard.exiteast)
    if (isstring(exiteast)) {
      codepagestats.push(`@exiteast ${exiteast}`)
    }

    const code = `@board ${String(i).padStart(3, '0')}. ${zztboard.boardname}\n${codepagestats.join('\n')}`
    const codepage = memorycreatecodepage(code, {})
    memorywritecodepage(book, codepage)

    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(codepage)
    if (!ispresent(board)) {
      continue
    }

    let x = 0
    let y = 0
    for (let e = 0; e < zztboard.elements.length; ++e) {
      if (x < BOARD_WIDTH && y < BOARD_HEIGHT) {
        writefromzztelement(
          board,
          x,
          y,
          zztboard.elements[e],
          statmap,
          zztboard.stats,
        )
      }
      ++x
      if (x === tilewidth) {
        x = 0
        ++y
      }
    }

    memoryinitboard(board)
  }
}

function readworldheaderzzt(reader: READER) {
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

function readworldheaderszzt(reader: READER) {
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

export function parsebrd(player: string, content: Uint8Array) {
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    apitoast(SOFTWARE, player, 'no content book to import into')
    return
  }
  let reader = createreader(content)
  let board = readboardbytes(reader, LAYOUT_ZZT)
  let usedszzt = false
  if (!board || reader.haserror()) {
    reader = createreader(content)
    board = readboardbytes(reader, LAYOUT_SZZT)
    usedszzt = true
  }
  if (!board || reader.haserror()) {
    apitoast(
      SOFTWARE,
      player,
      reader.geterror() ?? 'invalid or corrupt ZZT / Super ZZT board file',
    )
    return
  }
  processboards(contentbook, -1, [board], {
    tilewidth: usedszzt ? SZZT_BOARD_WIDTH : ZZT_BOARD_WIDTH,
    tileheight: usedszzt ? SZZT_BOARD_HEIGHT : ZZT_BOARD_HEIGHT,
    croppedfromszzt: usedszzt,
  })
  apitoast(
    SOFTWARE,
    player,
    `imported zzt brd ${board.boardname} into ${contentbook.name} book`,
  )
}

export function parsezzt(player: string, content: Uint8Array) {
  const reader = createreader(content)
  const header = readworldheaderzzt(reader)
  if (!header || reader.haserror()) {
    apitoast(
      SOFTWARE,
      player,
      reader.geterror() ?? 'invalid or corrupt ZZT world file',
    )
    return
  }
  const zztboards: ZZT_BOARD[] = []
  for (let i = 0; i < header.numberofboards; ++i) {
    const board = readboardbytes(reader, LAYOUT_ZZT)
    if (!board || reader.haserror()) {
      apitoast(
        SOFTWARE,
        player,
        reader.geterror() ?? `corrupt ZZT world at board ${i}`,
      )
      return
    }
    zztboards.push(board)
  }
  const book = memorycreatebook([])
  book.name = header.worldname
  processboards(book, header.playerboard, zztboards, {
    tilewidth: ZZT_BOARD_WIDTH,
    tileheight: ZZT_BOARD_HEIGHT,
    croppedfromszzt: false,
  })
  memorywritebook(book)
  apitoast(SOFTWARE, player, `imported zzt file into ${book.name} book`)
}

export function parseszt(player: string, content: Uint8Array) {
  const reader = createreader(content)
  const header = readworldheaderszzt(reader)
  if (!header || reader.haserror()) {
    apitoast(
      SOFTWARE,
      player,
      reader.geterror() ?? 'invalid or corrupt Super ZZT world file',
    )
    return
  }
  const zztboards: ZZT_BOARD[] = []
  for (let i = 0; i < header.numberofboards; ++i) {
    const board = readboardbytes(reader, LAYOUT_SZZT)
    if (!board || reader.haserror()) {
      apitoast(
        SOFTWARE,
        player,
        reader.geterror() ?? `corrupt Super ZZT world at board ${i}`,
      )
      return
    }
    zztboards.push(board)
  }
  const book = memorycreatebook([])
  book.name = header.worldname
  processboards(book, header.playerboard, zztboards, {
    tilewidth: SZZT_BOARD_WIDTH,
    tileheight: SZZT_BOARD_HEIGHT,
    croppedfromszzt: true,
  })
  memorywritebook(book)
  apitoast(SOFTWARE, player, `imported Super ZZT into ${book.name} book`)
}
