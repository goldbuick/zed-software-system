/**
 * Encode ZZT world (.zzt) bytes from in-memory BOOK boards.
 * Mirrors decode logic in zzt.ts (Shikadi Modding Wiki ZZT format).
 */

import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { memoryboardelementisobject } from 'zss/memory/boardelement'
import { memoryreadelement } from 'zss/memory/boardoperations'
import { memorylistcodepagebytype } from 'zss/memory/bookoperations'
import {
  memoryreadcodepagedata,
  memoryreadcodepagename,
  memoryreadcodepagestats,
} from 'zss/memory/codepageoperations'
import {
  BOARD,
  BOARD_ELEMENT,
  BOOK,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { NAME } from 'zss/words/types'

import { ooptuzz } from './ooptuzz'
import { ZZT_BOARD_TITLE_FIELD_LEN, zztencodeworld } from './zztencode'
import type { ZZT_BOARD, ZZT_ELEMENT, ZZT_STAT } from './zztformattypes'

const ZZT_BOARD_WIDTH = 60
const ZZT_BOARD_HEIGHT = 25

const T_EMPTY = 0
const T_PLAYER = 4
const T_AMMO = 5
const T_TORCH = 6
const T_GEM = 7
const T_KEY = 8
const T_DOOR = 9
const T_SCROLL = 10
const T_PASSAGE = 11
const T_DUPLICATOR = 12
const T_BOMB = 13
const T_ENERGIZE = 14
const T_STAR = 15
const T_CLOCKWISE = 16
const T_COUNTER = 17
const T_BULLET = 18
const T_WATER = 19
const T_FOREST = 20
const T_SOLID = 21
const T_NORMAL = 22
const T_BREAKABLE = 23
const T_BOULDER = 24
const T_SLIDER_NS = 25
const T_SLIDER_EW = 26
const T_FAKE = 27
const T_INVISIBLE = 28
const T_BLINKWALL = 29
const T_TRANSPORTER = 30
const T_LINE = 31
const T_RICOCHET = 32
const T_BLINKEW = 33
const T_BEAR = 34
const T_RUFFIAN = 35
const T_OBJECT = 36
const T_SLIME = 37
const T_SHARK = 38
const T_SPINNINGGUN = 39
const T_PUSHER = 40
const T_LION = 41
const T_TIGER = 42
const T_BLINKNS = 43
const T_HEAD = 44
const T_SEGMENT = 45
const T_CUSTOMTEXT = 46

export type ZZTEXPORTERROR = { message: string; board?: string }

export type ZZTEXPORTRESULT =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; errors: ZZTEXPORTERROR[] }

function zztcolorbyte(fg: number, bg: number): number {
  return (fg & 15) + 16 * (bg & 15)
}

type SORTEDENTRY = {
  codepage: CODE_PAGE
  board: BOARD
  sortname: string
  exportname: string
}

function buildsortedboardentries(
  book: BOOK,
  errors: ZZTEXPORTERROR[],
): SORTEDENTRY[] | null {
  const pages = memorylistcodepagebytype(book, CODE_PAGE_TYPE.BOARD)
  const raw: { codepage: CODE_PAGE; board: BOARD; sortname: string }[] = []
  for (let i = 0; i < pages.length; ++i) {
    const cp = pages[i]
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(cp)
    if (!ispresent(board)) {
      errors.push({ message: 'board codepage missing data' })
      return null
    }
    const sortname = memoryreadcodepagename(cp) || board.name || board.id
    raw.push({ codepage: cp, board, sortname: NAME(sortname) })
  }
  raw.sort((a, b) => a.sortname.localeCompare(b.sortname))
  const seen = new Map<string, number>()
  const out: SORTEDENTRY[] = []
  for (let i = 0; i < raw.length; ++i) {
    const base = raw[i].sortname || 'board'
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    const exportname =
      n === 1
        ? base.slice(0, ZZT_BOARD_TITLE_FIELD_LEN)
        : `${base} (${n})`.slice(0, ZZT_BOARD_TITLE_FIELD_LEN)
    out.push({ ...raw[i], exportname })
  }
  return out
}

function findzztboardorigindex(codepage: CODE_PAGE): number | undefined {
  const stats = memoryreadcodepagestats(codepage)
  for (const key of Object.keys(stats)) {
    const m = /^zztboard(\d+)$/.exec(key)
    if (m && stats[key] !== undefined) {
      return parseInt(m[1], 10)
    }
  }
  return undefined
}

function resolveboardtouint8(
  target: string,
  entries: SORTEDENTRY[],
): { ok: true; value: number } | { ok: false } {
  const t = NAME(target.trim())
  if (!t) {
    return { ok: true, value: 0 }
  }
  const zm = /^zztboard(\d+)$/.exec(t)
  if (zm) {
    const orig = parseInt(zm[1], 10)
    for (let i = 0; i < entries.length; ++i) {
      const oi = findzztboardorigindex(entries[i].codepage)
      if (oi === orig) {
        return { ok: true, value: i + 1 }
      }
    }
    return { ok: false }
  }
  for (let i = 0; i < entries.length; ++i) {
    if (entries[i].board.id === target || NAME(entries[i].board.id) === t) {
      return { ok: true, value: i + 1 }
    }
    const cn = NAME(memoryreadcodepagename(entries[i].codepage))
    if (cn === t || entries[i].sortname === t) {
      return { ok: true, value: i + 1 }
    }
  }
  return { ok: false }
}

function findstartboardindex(
  entries: SORTEDENTRY[],
  errors: ZZTEXPORTERROR[],
): number | null {
  for (let i = 0; i < entries.length; ++i) {
    const stats = memoryreadcodepagestats(entries[i].codepage)
    if (stats.zztstartboard !== undefined || stats.exportstart !== undefined) {
      return i
    }
  }
  if (entries.length === 1) {
    return 0
  }
  errors.push({
    message:
      'no start board: add @zztstartboard or @exportstart to one board (required when book has multiple boards)',
  })
  return null
}

function kindtozzt(
  el: MAYBE<BOARD_ELEMENT>,
  x: number,
  y: number,
  board: BOARD,
  entries: SORTEDENTRY[],
):
  | { ok: true; tile: ZZT_ELEMENT; stat?: ZZT_STAT }
  | { ok: false; message: string } {
  const sx = board.startx
  const sy = board.starty
  if (isnumber(sx) && isnumber(sy) && sx === x && sy === y) {
    const fg = el?.color ?? 7
    const bg = el?.bg ?? 0
    return { ok: true, tile: { type: T_PLAYER, color: zztcolorbyte(fg, bg) } }
  }

  if (!ispresent(el) || el.removed) {
    return { ok: true, tile: { type: T_EMPTY, color: 0 } }
  }

  const kind = NAME(el.kind ?? '')
  const fg = el.color ?? 0
  const bg = el.bg ?? 0
  const z = () => zztcolorbyte(fg, bg)

  const basestat = (): ZZT_STAT => ({
    x,
    y,
    stepx: el.stepx ?? 0,
    stepy: el.stepy ?? 0,
    cycle: el.cycle ?? 0,
    p1: numberorzero(el.p1),
    p2: numberorzero(el.p2),
    p3: numberorzero(el.p3),
    follower: 0,
    leader: 0,
    underelement: 0,
    undercolor: 0,
    pointer: 0,
    currentinstruction: 0,
    code: isstring(el.code) && el.code ? ooptuzz(el.code) : undefined,
  })

  if (memoryboardelementisobject(el)) {
    const st = basestat()
    st.p1 = el.char ?? st.p1
    if (kind === 'object' || !kind) {
      return { ok: true, tile: { type: T_OBJECT, color: z() }, stat: st }
    }
    const creature = creaturekindtotile(kind)
    if (creature !== undefined) {
      return { ok: true, tile: { type: creature, color: z() }, stat: st }
    }
    return { ok: false, message: `unsupported object kind ${kind}` }
  }

  switch (kind) {
    case '':
    case 'empty':
      return { ok: true, tile: { type: T_EMPTY, color: 0 } }
    case 'ammo':
      return { ok: true, tile: { type: T_AMMO, color: z() } }
    case 'torch':
      return { ok: true, tile: { type: T_TORCH, color: z() } }
    case 'gem':
      return { ok: true, tile: { type: T_GEM, color: z() } }
    case 'key':
      return { ok: true, tile: { type: T_KEY, color: z() } }
    case 'door': {
      const origFg = bg & 15
      const origBg = ((fg & 15) + 16 - 8) % 16
      return {
        ok: true,
        tile: { type: T_DOOR, color: zztcolorbyte(origFg, origBg) },
      }
    }
    case 'scroll':
      return {
        ok: true,
        tile: { type: T_SCROLL, color: z() },
        stat: basestat(),
      }
    case 'passage': {
      const st = basestat()
      if (isstring(el.p3)) {
        const res = resolveboardtouint8(el.p3, entries)
        if (!res.ok) {
          return { ok: false, message: `passage target not in book: ${el.p3}` }
        }
        st.p3 = res.value
      }
      return { ok: true, tile: { type: T_PASSAGE, color: z() }, stat: st }
    }
    case 'duplicator': {
      const st = basestat()
      st.stepx = el.shootx ?? 0
      st.stepy = el.shooty ?? 0
      return { ok: true, tile: { type: T_DUPLICATOR, color: z() }, stat: st }
    }
    case 'bomb':
      return { ok: true, tile: { type: T_BOMB, color: z() }, stat: basestat() }
    case 'energize':
      return { ok: true, tile: { type: T_ENERGIZE, color: z() } }
    case 'star':
      return { ok: true, tile: { type: T_STAR, color: z() } }
    case 'clockwise':
      return { ok: true, tile: { type: T_CLOCKWISE, color: z() } }
    case 'counter':
      return { ok: true, tile: { type: T_COUNTER, color: z() } }
    case 'bullet':
      return {
        ok: true,
        tile: { type: T_BULLET, color: z() },
        stat: basestat(),
      }
    case 'water':
      return { ok: true, tile: { type: T_WATER, color: z() } }
    case 'forest':
      return { ok: true, tile: { type: T_FOREST, color: z() } }
    case 'solid':
      return { ok: true, tile: { type: T_SOLID, color: z() } }
    case 'normal':
      return { ok: true, tile: { type: T_NORMAL, color: z() } }
    case 'breakable':
      return { ok: true, tile: { type: T_BREAKABLE, color: z() } }
    case 'boulder':
      return { ok: true, tile: { type: T_BOULDER, color: z() } }
    case 'sliderns':
      return { ok: true, tile: { type: T_SLIDER_NS, color: z() } }
    case 'sliderew':
      return { ok: true, tile: { type: T_SLIDER_EW, color: z() } }
    case 'fake':
      return { ok: true, tile: { type: T_FAKE, color: z() } }
    case 'invisible':
      return { ok: true, tile: { type: T_INVISIBLE, color: z() } }
    case 'blinkwall': {
      const st = basestat()
      st.stepx = el.shootx ?? 0
      st.stepy = el.shooty ?? 0
      return { ok: true, tile: { type: T_BLINKWALL, color: z() }, stat: st }
    }
    case 'transporter': {
      const st = basestat()
      st.stepx = el.shootx ?? 0
      st.stepy = el.shooty ?? 0
      return { ok: true, tile: { type: T_TRANSPORTER, color: z() }, stat: st }
    }
    case 'line':
      return { ok: true, tile: { type: T_LINE, color: z() } }
    case 'ricochet':
      return { ok: true, tile: { type: T_RICOCHET, color: z() } }
    case 'blinkew':
      return { ok: true, tile: { type: T_BLINKEW, color: z() } }
    case 'blinkns':
      return { ok: true, tile: { type: T_BLINKNS, color: z() } }
    case 'customtext':
      return {
        ok: true,
        tile: { type: T_CUSTOMTEXT, color: zztcolorbyte(el.char ?? 0, 0) },
        stat: basestat(),
      }
    default:
      return { ok: false, message: `unsupported terrain kind ${kind}` }
  }
}

function numberorzero(v: number | string | undefined): number {
  if (isnumber(v)) {
    return v
  }
  if (isstring(v)) {
    const n = parseInt(v, 10)
    return isNaN(n) ? 0 : n
  }
  return 0
}

function creaturekindtotile(kind: string): number | undefined {
  switch (kind) {
    case 'bear':
      return T_BEAR
    case 'ruffian':
      return T_RUFFIAN
    case 'lion':
      return T_LION
    case 'tiger':
      return T_TIGER
    case 'shark':
      return T_SHARK
    case 'slime':
      return T_SLIME
    case 'spinninggun':
      return T_SPINNINGGUN
    case 'pusher':
      return T_PUSHER
    case 'head':
      return T_HEAD
    case 'segment':
      return T_SEGMENT
    default:
      return undefined
  }
}

function zzttypewantsstat(tiletype: number): boolean {
  return (
    tiletype === T_OBJECT ||
    tiletype === T_SCROLL ||
    tiletype === T_PASSAGE ||
    tiletype === T_DUPLICATOR ||
    tiletype === T_BOMB ||
    tiletype === T_BULLET ||
    tiletype === T_BLINKWALL ||
    tiletype === T_TRANSPORTER ||
    tiletype === T_BEAR ||
    tiletype === T_RUFFIAN ||
    tiletype === T_SLIME ||
    tiletype === T_SHARK ||
    tiletype === T_SPINNINGGUN ||
    tiletype === T_PUSHER ||
    tiletype === T_LION ||
    tiletype === T_TIGER ||
    tiletype === T_BLINKNS ||
    tiletype === T_HEAD ||
    tiletype === T_SEGMENT ||
    tiletype === T_CUSTOMTEXT
  )
}

function memoryboardtozzt(
  entry: SORTEDENTRY,
  entries: SORTEDENTRY[],
  errors: ZZTEXPORTERROR[],
): ZZT_BOARD | null {
  const { board, exportname } = entry
  const elements: ZZT_ELEMENT[] = []
  const stats: ZZT_STAT[] = []
  for (let y = 0; y < ZZT_BOARD_HEIGHT; ++y) {
    for (let x = 0; x < ZZT_BOARD_WIDTH; ++x) {
      const el = memoryreadelement(board, { x, y })
      const r = kindtozzt(el, x, y, board, entries)
      if (!r.ok) {
        errors.push({ message: r.message, board: exportname })
        return null
      }
      elements.push(r.tile)
      if (r.stat && zzttypewantsstat(r.tile.type)) {
        stats.push(r.stat)
      }
    }
  }

  const ex = (dir: string | undefined) => {
    if (!isstring(dir) || !dir) {
      return 0
    }
    const res = resolveboardtouint8(dir, entries)
    if (!res.ok) {
      errors.push({
        message: `exit target not in book: ${dir}`,
        board: exportname,
      })
      return undefined
    }
    return res.value
  }

  const north = ex(board.exitnorth)
  const south = ex(board.exitsouth)
  const west = ex(board.exitwest)
  const east = ex(board.exiteast)
  if (
    north === undefined ||
    south === undefined ||
    west === undefined ||
    east === undefined
  ) {
    return null
  }

  if (stats.length === 0) {
    stats.push({ x: 0, y: 0, code: '' })
  }

  return {
    boardname: exportname,
    elements,
    stats,
    maxplayershots: board.maxplayershots,
    isdark: board.isdark,
    exitnorth: north,
    exitsouth: south,
    exitwest: west,
    exiteast: east,
    restartonzap: board.restartonzap,
    messagelength: 0,
    message: '',
    playerenterx: board.startx,
    playerentery: board.starty,
    timelimit: board.timelimit,
  }
}

/**
 * Export all BOARD codepages in `book` to a classic ZZT world (.zzt).
 * Boards are ordered by `memoryreadcodepagename` (case-normalized); duplicate names get `(2)`, etc.
 */
export function exportbooktozzt(book: BOOK): ZZTEXPORTRESULT {
  const errors: ZZTEXPORTERROR[] = []
  const entries = buildsortedboardentries(book, errors)
  if (!entries) {
    return { ok: false, errors }
  }
  if (entries.length === 0) {
    return { ok: false, errors: [{ message: 'book has no board pages' }] }
  }

  const startidx = findstartboardindex(entries, errors)
  if (startidx === null) {
    return { ok: false, errors }
  }

  const zztboards: ZZT_BOARD[] = []
  for (let i = 0; i < entries.length; ++i) {
    const zb = memoryboardtozzt(entries[i], entries, errors)
    if (!zb) {
      return { ok: false, errors }
    }
    zztboards.push(zb)
  }

  const worldname = book.name ?? 'exported'
  try {
    const bytes = zztencodeworld(worldname, startidx, zztboards)
    return { ok: true, bytes }
  } catch (e) {
    errors.push({ message: e instanceof Error ? e.message : String(e) })
    return { ok: false, errors }
  }
}

/** Compare two parsed worlds for regression tests (not byte-identical RLE). */
export function zztboardsstructurallyequal(
  a: ZZT_BOARD[],
  b: ZZT_BOARD[],
): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; ++i) {
    if (a[i].boardname !== b[i].boardname) {
      return false
    }
    if (a[i].elements.length !== b[i].elements.length) {
      return false
    }
    for (let e = 0; e < a[i].elements.length; ++e) {
      if (
        a[i].elements[e].type !== b[i].elements[e].type ||
        a[i].elements[e].color !== b[i].elements[e].color
      ) {
        return false
      }
    }
    if (a[i].stats.length !== b[i].stats.length) {
      return false
    }
    for (let s = 0; s < a[i].stats.length; ++s) {
      const sa = a[i].stats[s]
      const sb = b[i].stats[s]
      if (sa.x !== sb.x || sa.y !== sb.y || sa.code !== sb.code) {
        return false
      }
    }
  }
  return true
}
