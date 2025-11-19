import { objectKeys } from 'ts-extras'
import { api_toast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { indextox, indextoy } from 'zss/mapping/2d'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import {
  memoryboardinit,
  memoryreadfirstcontentbook,
  memorysetbook,
  memorywritefromkind,
} from 'zss/memory'
import { bookwritecodepage, createbook } from 'zss/memory/book'
import { codepagereaddata, createcodepage } from 'zss/memory/codepage'
import { BOARD, BOARD_ELEMENT, BOOK, CODE_PAGE_TYPE } from 'zss/memory/types'
import { STR_COLOR, mapcolortostrcolor } from 'zss/words/color'
import { STR_KIND } from 'zss/words/kind'
import { PT } from 'zss/words/types'

import { zztoop } from './zztoop'

type ZZT_ELEMENT = {
  type: number
  color: number
}

type ZZT_STAT = {
  x?: number
  y?: number
  stepx?: number
  stepy?: number
  cycle?: number
  p1?: number
  p2?: number
  p3?: number
  follower?: number
  leader?: number
  underelement?: number
  undercolor?: number
  pointer?: number
  currentinstruction?: number
  bind?: number
  code?: string
}

type ZZT_BOARD = {
  boardname: string
  elements: ZZT_ELEMENT[]
  stats: ZZT_STAT[]
  maxplayershots?: number
  isdark?: number
  exitnorth?: number
  exitsouth?: number
  exitwest?: number
  exiteast?: number
  restartonzap?: number
  messagelength?: number
  message?: string
  playerenterx?: number
  playerentery?: number
  timelimit?: number
}

const ZZT_BOARD_WIDTH = 60
const ZZT_BOARD_HEIGHT = 25
const ZZT_BOARD_SIZE = ZZT_BOARD_WIDTH * ZZT_BOARD_HEIGHT

function createreader(content: Uint8Array) {
  let cursor = 0
  const reader = new DataView(content.buffer)

  function seek(to: number) {
    cursor = to
  }

  function index() {
    return cursor
  }

  function readuint8() {
    const value = reader.getUint8(cursor)
    cursor++
    return value
  }

  function readint16() {
    const value = reader.getInt16(cursor, true)
    cursor += 2
    return value
  }

  function readint32() {
    const value = reader.getInt32(cursor, true)
    cursor += 4
    return value
  }

  function readstring(count: number) {
    let str = ''
    const data = content.subarray(cursor, cursor + count)
    for (let i = 0; i < data.length; ++i) {
      str += String.fromCharCode(data[i])
    }
    cursor += count
    return str.replace('\r', '\n')
  }

  return {
    seek,
    index,
    readuint8,
    readint16,
    readint32,
    readstring,
  }
}

type READER = ReturnType<typeof createreader>

function readboardbytes(reader: READER) {
  const start = reader.index()

  const boardsize = reader.readint16()
  const boardnamelength = reader.readuint8()
  const boardname = reader.readstring(50).slice(0, boardnamelength)

  const board: ZZT_BOARD = {
    boardname,
    elements: [],
    stats: [],
  }

  // read board elements
  while (board.elements.length < ZZT_BOARD_SIZE) {
    let count = reader.readuint8()
    if (count === 0) {
      count = 1500
    }
    const element = reader.readuint8()
    const color = reader.readuint8()
    for (let r = 0; r < count; ++r) {
      board.elements.push({ type: element, color })
    }
  }

  // read board stats
  board.maxplayershots = reader.readuint8()
  board.isdark = reader.readuint8()
  board.exitnorth = reader.readuint8()
  board.exitsouth = reader.readuint8()
  board.exitwest = reader.readuint8()
  board.exiteast = reader.readuint8()
  board.restartonzap = reader.readuint8()
  board.messagelength = reader.readuint8()
  board.message = reader.readstring(58).slice(0, board.messagelength)
  board.playerenterx = reader.readuint8()
  board.playerentery = reader.readuint8()
  board.timelimit = reader.readint16()
  reader.seek(reader.index() + 16) // skip

  // read element stats
  const statcount = reader.readint16() + 1 // thanks TIM
  while (board.stats.length < statcount) {
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
    reader.seek(reader.index() + 8) // skip
    if (length < 0) {
      // copy code from
      stat.bind = Math.abs(length)
    } else {
      // read code in
      stat.code = reader.readstring(length)
    }

    board.stats.push(stat)
  }

  reader.seek(start + boardsize + 2)
  return board
}

function processboards(book: BOOK, startboard: number, zztboards: ZZT_BOARD[]) {
  function writefromkind(
    board: MAYBE<BOARD>,
    kind: MAYBE<STR_KIND>,
    dest: PT,
    addstats?: BOARD_ELEMENT,
  ) {
    const element = memorywritefromkind(board, kind, dest)
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
    stats: ZZT_STAT[],
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
    const elementstat = stats.find((stat) => stat.x === x && stat.y === y)
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
        const maybecopy = stats[elementstat.bind]
        if (ispresent(maybecopy?.code) && isstring(maybecopy.code)) {
          addstats.code = zztoop(maybecopy.code)
        }
      }
    }
    switch (element.type) {
      case 0:
      case 1:
      case 2:
      case 3:
        // skip empty, board edge, messenger, and monitor
        // console.info('low', elementstat, element.element, element.color)
        break
      case 4:
        // skip player
        break
      case 5:
        // ammo
        writefromkind(board, ['ammo', strcolor], { x, y }, addstats)
        break
      case 6:
        // torch
        writefromkind(board, ['torch', strcolor], { x, y }, addstats)
        break
      case 7:
        // gem
        writefromkind(board, ['gem', strcolor], { x, y }, addstats)
        break
      case 8:
        // key
        writefromkind(board, ['key', strcolor], { x, y }, addstats)
        break
      case 9:
        // door
        writefromkind(board, ['door', strcolorflipped], { x, y }, addstats)
        break
      case 10:
        // scroll
        writefromkind(board, ['scroll', strcolor], { x, y }, addstats)
        break
      case 11: {
        // passage
        addstats.p3 = formatexitstat(elementstat?.p3) ?? ''
        writefromkind(board, ['passage', strcolor], { x, y }, addstats)
        break
      }
      case 12:
        // duplicator
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
      case 13:
        // bomb
        writefromkind(board, ['bomb', strcolor], { x, y }, addstats)
        break
      case 14:
        // energize
        writefromkind(board, ['energize', strcolor], { x, y }, addstats)
        break
      case 15:
        // star
        writefromkind(board, ['star', strcolor], { x, y }, addstats)
        break
      case 16:
        // clockwise
        writefromkind(board, ['clockwise', strcolor], { x, y }, addstats)
        break
      case 17:
        // counter
        writefromkind(board, ['counter', strcolor], { x, y }, addstats)
        break
      case 18:
        // bullet
        writefromkind(board, ['bullet', strcolor], { x, y }, addstats)
        break
      case 19:
        // water
        writefromkind(board, ['water', strcolor], { x, y }, addstats)
        break
      case 20:
        // forest
        writefromkind(board, ['forest', strcolor], { x, y }, addstats)
        break
      case 21:
        // solid
        writefromkind(board, ['solid', strcolor], { x, y }, addstats)
        break
      case 22:
        // normal
        writefromkind(board, ['normal', strcolor], { x, y }, addstats)
        break
      case 23:
        // breakable
        writefromkind(board, ['breakable', strcolor], { x, y }, addstats)
        break
      case 24:
        // boulder
        writefromkind(board, ['boulder', strcolor], { x, y }, addstats)
        break
      case 25:
        // sliderns
        writefromkind(board, ['sliderns', strcolor], { x, y }, addstats)
        break
      case 26:
        // sliderew
        writefromkind(board, ['sliderew', strcolor], { x, y }, addstats)
        break
      case 27:
        // fake
        writefromkind(board, ['fake', strcolor], { x, y }, addstats)
        break
      case 28:
        // invisible
        writefromkind(board, ['invisible', strcolor], { x, y }, addstats)
        break
      case 29:
        // blinkwall
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
      case 30:
        // transporter
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
      case 31:
        // line
        writefromkind(board, ['line', strcolor], { x, y }, addstats)
        break
      case 32:
        // ricochet
        writefromkind(board, ['ricochet', strcolor], { x, y }, addstats)
        break
      case 33:
        // blinkns
        writefromkind(board, ['blinkns', strcolor], { x, y }, addstats)
        break
      case 34:
        // bear
        writefromkind(board, ['bear', strcolor], { x, y }, addstats)
        break
      case 35:
        // ruffian
        writefromkind(board, ['ruffian', strcolor], { x, y }, addstats)
        break
      case 36:
        // object
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
      case 37:
        // slime
        writefromkind(board, ['slime', strcolor], { x, y }, addstats)
        break
      case 38:
        // shark
        writefromkind(board, ['shark', strcolor], { x, y }, addstats)
        break
      case 39:
        // spinninggun
        writefromkind(board, ['spinninggun', strcolor], { x, y }, addstats)
        break
      case 40:
        // pusher
        writefromkind(board, ['pusher', strcolor], { x, y }, addstats)
        break
      case 41:
        // lion
        writefromkind(board, ['lion', strcolor], { x, y }, addstats)
        break
      case 42:
        // tiger
        writefromkind(board, ['tiger', strcolor], { x, y }, addstats)
        break
      case 43:
        // blinkns
        writefromkind(board, ['blinkns', strcolor], { x, y }, addstats)
        break
      case 44:
        // head
        writefromkind(board, ['head', strcolor], { x, y }, addstats)
        break
      case 45:
        // segment
        writefromkind(board, ['segment', strcolor], { x, y }, addstats)
        break
      case 46:
        // weave customtext
        writefromkind(
          board,
          ['customtext'],
          { x, y },
          { ...addstats, char: element.color },
        )
        break
      default:
        if (element.type >= 47 && element.type <= 53) {
          const altcolor = colorsfromzztcolor(
            element.type === 53 ? 15 : (element.type - 46) * 16 + 15,
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
        } else if (element.type >= 128) {
          // weave fancy text
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
        } else {
          // console.info('element', elementstat, element.type, element.color)
        }
        break
    }
  }

  function formatexitstat(exitstat: any): MAYBE<string> {
    if (isnumber(exitstat) && exitstat > 0) {
      return `zztboard${exitstat}`
    }
    return undefined
  }

  // process boards
  for (let i = 0; i < zztboards.length; ++i) {
    const zztboard = zztboards[i]

    // build codepage @ stats
    const codepagestats: string[] = [`@zztboard${i}`, ``]
    if (i === 0) {
      codepagestats.push(`@title`)
    } else if (i === startboard) {
      codepagestats.push(`@zztstartboard`)
    }

    for (let e = 0; e < zztboard.elements.length; ++e) {
      if (zztboard.elements[e].type === 4) {
        codepagestats.push(`@startx ${indextox(e, ZZT_BOARD_WIDTH)}`)
        codepagestats.push(`@starty ${indextoy(e, ZZT_BOARD_WIDTH)}`)
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

    // create a new board codepage
    const code = `@board ${String(i).padStart(3, '0')}. ${zztboard.boardname}\n${codepagestats.join('\n')}`
    const codepage = createcodepage(code, {})
    bookwritecodepage(book, codepage)

    // get board data from codepage
    const board = codepagereaddata<CODE_PAGE_TYPE.BOARD>(codepage)
    if (!ispresent(board)) {
      continue
    }

    // process elements
    let x = 0
    let y = 0
    for (let e = 0; e < zztboard.elements.length; ++e) {
      const element = zztboard.elements[e]
      writefromzztelement(board, x, y, element, zztboard.stats)
      ++x
      if (x === ZZT_BOARD_WIDTH) {
        x = 0
        ++y
      }
    }

    // create lookups before processing stats
    memoryboardinit(board)
  }
}

export function parsebrd(player: string, content: Uint8Array) {
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    return
  }
  const reader = createreader(content)
  const board = readboardbytes(reader)
  processboards(contentbook, -1, [board])
  api_toast(
    SOFTWARE,
    player,
    `imported zzt brd ${board.boardname} into ${contentbook.name} book`,
  )
}

export function parsezzt(player: string, content: Uint8Array) {
  const reader = createreader(content)

  const worldfileid = reader.readint16()
  if (worldfileid != -1) {
    return
  }
  const numberofboards = reader.readint16() + 1
  const playerammo = reader.readint16()
  const playergems = reader.readint16()
  const keys = reader.readstring(7)
  const playerhealth = reader.readint16()
  const playerboard = reader.readint16()
  const playertorches = reader.readint16()
  const torchcycles = reader.readint16()
  const energycycles = reader.readint16()
  reader.readint16() // skip
  const playerscore = reader.readint16()
  const worldnamelength = reader.readuint8()
  const worldname = reader.readstring(20).slice(0, worldnamelength)

  const flags: string[] = []
  for (let i = 0; i < 10; i++) {
    const flagnamelength = reader.readuint8()
    const flagname = reader.readstring(20).slice(0, flagnamelength)
    flags.push(flagname)
  }

  const timepassed = reader.readint16()
  const timepassedticks = reader.readint16()
  const locked = reader.readuint8()

  console.info(
    playerammo,
    playergems,
    keys,
    playerhealth,
    playerboard,
    playertorches,
    torchcycles,
    energycycles,
    playerscore,
    timepassed,
    timepassedticks,
    locked,
  )

  // read boards
  reader.seek(512) // skip bytes

  const zztboards: ZZT_BOARD[] = []
  for (let i = 0; i < numberofboards; ++i) {
    // add to list
    const board = readboardbytes(reader)
    zztboards.push(board)
  }

  // build book
  const book = createbook([])
  book.name = worldname
  processboards(book, playerboard, zztboards)

  memorysetbook(book)
  api_toast(SOFTWARE, player, `imported zzt file into ${book.name} book`)
}
