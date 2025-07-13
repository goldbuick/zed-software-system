import { objectKeys } from 'ts-extras'
import { api_toast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { indextox, indextoy } from 'zss/mapping/2d'
import { isnumber, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { memorysetbook, memorywritefromkind } from 'zss/memory'
import { boardsetlookup } from 'zss/memory/boardlookup'
import { bookwritecodepage, createbook } from 'zss/memory/book'
import { codepagereaddata, createcodepage } from 'zss/memory/codepage'
import { BOARD, BOARD_ELEMENT, CODE_PAGE_TYPE } from 'zss/memory/types'
import { mapcolortostrcolor, STR_COLOR } from 'zss/words/color'
import { STR_KIND } from 'zss/words/kind'
import { PT } from 'zss/words/types'

type ZZT_ELEMENT = {
  element: number
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

export function parsezzt(player: string, content: Uint8Array) {
  let cursor = 0
  const reader = new DataView(content.buffer)

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

  function scrubinlinechars(str: string) {
    let scrubbed = ''
    for (let i = 0; i < str.length; ++i) {
      const code = str.charCodeAt(i)
      if (code < 32 || code > 127) {
        scrubbed += `$${code}`
      } else {
        scrubbed += str[i]
      }
    }
    return scrubbed
  }

  function normalizedlines(str: string) {
    // check for inline $ text rows (thanks WiL)
    // also check for inlined ascii chars UGHH
    return str
      .replaceAll(/\r?\n|\r/g, '\n')
      .split('\n')
      .map((line) => {
        if (line.includes('$')) {
          const [begin, ...inlinetext] = line.split('$')
          return `${begin ?? ''}"$CENTER ${scrubinlinechars(inlinetext.join('$'))}"`
        }
        return scrubinlinechars(line)
      })
      .join('\n')
  }

  function writefromzztelement(
    board: BOARD,
    x: number,
    y: number,
    element: ZZT_ELEMENT,
    stats: ZZT_STAT[],
  ) {
    const color = element.color % 16
    const bg = Math.floor(element.color / 16) % 8

    const strcolor: STR_COLOR = mapcolortostrcolor(color, bg)
    const strcolorflipped: STR_COLOR = mapcolortostrcolor(bg, color)

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
        addstats.code = normalizedlines(elementstat.code)
      }
      if (ispresent(elementstat.stepx)) {
        addstats.stepx = elementstat.stepx
      }
      if (ispresent(elementstat.stepy)) {
        addstats.stepy = elementstat.stepy
      }
      // follower?: number
      // leader?: number
      // bind?: number
    }
    switch (element.element) {
      case 0:
      case 1:
      case 2:
      case 3:
        // skip empty, board edge, messenger, and monitor
        break
      case 4:
        // player
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
        writefromkind(board, ['duplicator', strcolor], { x, y }, addstats)
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
        writefromkind(board, ['blinkwall', strcolor], { x, y }, addstats)
        break
      case 30:
        // transporter
        writefromkind(board, ['transporter', strcolor], { x, y }, addstats)
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
        // empty ???
        break
      case 47:
        writefromkind(
          board,
          ['text', ['WHITE', 'ONDKBLUE']],
          { x, y },
          { ...addstats, char: element.color },
        )
        break
      case 48:
        writefromkind(
          board,
          ['text', ['WHITE', 'ONDKGREEN']],
          { x, y },
          { ...addstats, char: element.color },
        )
        break
      case 49:
        writefromkind(
          board,
          ['text', ['WHITE', 'ONDKCYAN']],
          { x, y },
          { ...addstats, char: element.color },
        )
        break
      case 50:
        writefromkind(
          board,
          ['text', ['WHITE', 'ONDKRED']],
          { x, y },
          { ...addstats, char: element.color },
        )
        break
      case 51:
        writefromkind(
          board,
          ['text', ['WHITE', 'ONDKPURPLE']],
          {
            x,
            y,
          },
          { ...addstats, char: element.color },
        )
        break
      case 52:
        writefromkind(
          board,
          ['text', ['WHITE', 'ONDKYELLOW']],
          {
            x,
            y,
          },
          { ...addstats, char: element.color },
        )
        break
      case 53:
        writefromkind(
          board,
          ['text', ['WHITE', 'ONBLACK']],
          { x, y },
          { ...addstats, char: element.color },
        )
        break
    }
  }

  function formatexitstat(exitstat: any): MAYBE<string> {
    if (isnumber(exitstat) && exitstat > 0) {
      return `zztboard${exitstat}`
    }
    return undefined
  }

  // read world

  const worldfileid = readint16()
  if (worldfileid != -1) {
    return
  }

  const numberofboards = readint16()
  const playerammo = readint16()
  const playergems = readint16()
  const keys = readstring(7)
  const playerhealth = readint16()
  const playerboard = readint16()
  const playertorches = readint16()
  const torchcycles = readint16()
  const energycycles = readint16()
  readint16() // skip
  const playerscore = readint16()
  const worldnamelength = readuint8()
  const worldname = readstring(20).slice(0, worldnamelength)

  const flags: string[] = []
  for (let i = 0; i < 9; i++) {
    const flagnamelength = readuint8()
    const flagname = readstring(20).slice(0, flagnamelength)
    flags.push(flagname)
  }

  const timepassed = readint16()
  const timepassedticks = readint16()
  const locked = readuint8()
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
  cursor = 512 // skip bytes

  const zztboards: ZZT_BOARD[] = []
  for (let i = 0; i < numberofboards; ++i) {
    const boardsize = readint16()
    const start = cursor
    const boardnamelength = readuint8()
    const boardname = readstring(50).slice(0, boardnamelength)

    const board: ZZT_BOARD = {
      boardname,
      elements: [],
      stats: [],
    }

    // read board elements
    while (board.elements.length < ZZT_BOARD_SIZE) {
      let count = readuint8()
      if (count === 0) {
        count = 255
      }
      const element = readuint8()
      const color = readuint8()
      for (let r = 0; r < count; ++r) {
        board.elements.push({ element, color })
      }
    }

    // read board stats
    board.maxplayershots = readuint8()
    board.isdark = readuint8()
    board.exitnorth = readuint8()
    board.exitsouth = readuint8()
    board.exitwest = readuint8()
    board.exiteast = readuint8()
    board.restartonzap = readuint8()
    board.messagelength = readuint8()
    board.message = readstring(58).slice(0, board.messagelength)
    board.playerenterx = readuint8()
    board.playerentery = readuint8()
    board.timelimit = readint16()
    cursor += 16 // skip

    // read element stats
    const statcount = readint16() + 1 // thanks TIM
    while (board.stats.length < statcount) {
      const stat: ZZT_STAT = {}
      stat.x = readuint8() - 1
      stat.y = readuint8() - 1
      stat.stepx = readint16()
      stat.stepy = readint16()
      stat.cycle = readint16()
      stat.p1 = readuint8()
      stat.p2 = readuint8()
      stat.p3 = readuint8()
      stat.follower = readint16()
      stat.leader = readint16()
      stat.underelement = readuint8()
      stat.undercolor = readuint8()
      stat.pointer = readint32()
      stat.currentinstruction = readint16()
      const length = readint16()

      cursor += 8 // skip
      if (length < 0) {
        // copy code from
        stat.bind = Math.abs(length)
      } else {
        // read code in
        stat.code = readstring(length)
      }

      board.stats.push(stat)
    }

    // add to list
    zztboards.push(board)

    // next
    cursor = start + boardsize
  }

  // build book
  const book = createbook([])
  book.name = worldname

  // process boards
  for (let i = 0; i < zztboards.length; ++i) {
    const zztboard = zztboards[i]

    // build codepage @ stats
    const codepagestats: string[] = [`@zztboard${i}`, ``]
    if (i === playerboard) {
      codepagestats.push(`@title`)
    }

    for (let e = 0; e < zztboard.elements.length; ++e) {
      if (zztboard.elements[e].element === 4) {
        codepagestats.push(`@startx ${indextox(e, ZZT_BOARD_WIDTH)}`)
        codepagestats.push(`@starty ${indextoy(e, ZZT_BOARD_WIDTH)}`)
      }
    }

    if (isnumber(zztboard.maxplayershots)) {
      codepagestats.push(`@maxplayershots ${zztboard.maxplayershots}`)
    }
    if (isnumber(zztboard.isdark)) {
      codepagestats.push(`@isdark ${zztboard.isdark}`)
    }
    if (isnumber(zztboard.restartonzap)) {
      codepagestats.push(`@restartonzap ${zztboard.restartonzap}`)
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
    boardsetlookup(board)
  }

  memorysetbook(book)
  api_toast(SOFTWARE, player, `imported zzt file into ${book.name} book`)
}
