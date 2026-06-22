/**
 * ZZT / Super ZZT world and board binary import.
 *
 * References: https://moddingwiki.shikadi.net/wiki/ZZT_Format
 * - ZZT world: WorldType int16 LE === -1 (0xFFFF); board list starts at offset 512 (0x200).
 * - Super ZZT world: WorldType === -2 (0xFFFE); boards at offset 1024 (0x400); boards are 96×80 tiles.
 * - RLE tiles: count 0 means fill the remaining cells on the board (same as classic ZZT encoders’ last run),
 *   element id, color — repeated until board full.
 * - Stat count: stored value + 1 is the number of status elements (“thanks TIM”).
 * - BoardSize may under-report the payload (copy protection / corruption); import uses max(declared end, parsed end).
 *
 * Super ZZT boards are cropped to the engine BOARD_WIDTH × BOARD_HEIGHT (60×25) on import.
 */

import { objectKeys } from 'ts-extras'
import { apitoast, workstatus } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  assertzztelementlibrary,
  requirezztelementlibrary,
} from 'zss/feature/parse/zztelementlibrary'
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

import {
  LAYOUT_SZZT,
  LAYOUT_ZZT,
  SZZT_BOARD_HEIGHT,
  SZZT_BOARD_WIDTH,
  ZZT_BOARD_HEIGHT,
  ZZT_BOARD_WIDTH,
  createreader,
  readboardbytes,
  readworldheaderszzt,
  readworldheaderzzt,
  zztparseboard,
} from './zztbinparse'

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

    const codepagestats: string[] = [`@zztboard${i}`]
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

export function importzztboardstobook(
  zztboards: ZZT_BOARD[],
  opts: {
    startboard?: number
    tilewidth: number
    tileheight: number
    croppedfromszzt: boolean
  },
): { book: BOOK; boardaddresses: string[] } {
  assertzztelementlibrary()
  const book = memorycreatebook([])
  const startboard = opts.startboard ?? -1
  processboards(book, startboard, zztboards, {
    tilewidth: opts.tilewidth,
    tileheight: opts.tileheight,
    croppedfromszzt: opts.croppedfromszzt,
  })
  const boardaddresses = zztboards.map((_, i) => `zztboard${i}`)
  return { book, boardaddresses }
}

export function parsebrd(player: string, content: Uint8Array) {
  workstatus(SOFTWARE, player, 'parse brd')
  if (!requirezztelementlibrary(player)) {
    return
  }
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    apitoast(SOFTWARE, player, 'no content book to import into')
    return
  }
  const parsed = zztparseboard(content)
  if (!parsed.ok) {
    apitoast(SOFTWARE, player, parsed.error)
    return
  }
  const { board, layout } = parsed
  const usedszzt = layout === 'szzt'
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
  workstatus(SOFTWARE, player, 'parse zzt')
  if (!requirezztelementlibrary(player)) {
    return
  }
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
  workstatus(SOFTWARE, player, 'parse szt')
  if (!requirezztelementlibrary(player)) {
    return
  }
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
