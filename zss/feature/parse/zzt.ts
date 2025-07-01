import { api_toast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ispresent } from 'zss/mapping/types'
import { memorysetbook, memorywritefromkind } from 'zss/memory'
import { bookwritecodepage, createbook } from 'zss/memory/book'
import { codepagereaddata, createcodepage } from 'zss/memory/codepage'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { STR_COLOR_CONST } from 'zss/words/color'
import { COLOR } from 'zss/words/types'

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
    while (board.elements.length < 1500) {
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
    const statcount = readint16()
    while (board.stats.length < statcount) {
      const stat: ZZT_STAT = {}
      stat.x = readuint8()
      stat.y = readuint8()
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
    const codepage = createcodepage(
      `@board ${i === playerboard ? 'title' : zztboard.boardname}`,
      {},
    )
    bookwritecodepage(book, codepage)
    const board = codepagereaddata<CODE_PAGE_TYPE.BOARD>(codepage)
    if (!ispresent(board)) {
      continue
    }
    let x = 0
    let y = 0
    for (let e = 0; e < zztboard.elements.length; ++e) {
      const element = zztboard.elements[e]
      switch (element.element) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
          // empty
          break
        case 5:
          // ammo
          memorywritefromkind(
            board,
            ['ammo', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 6:
          // torch
          memorywritefromkind(
            board,
            ['torch', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 7:
          // gem
          memorywritefromkind(
            board,
            ['gem', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 8:
          // key
          memorywritefromkind(
            board,
            ['key', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 9:
          // door
          memorywritefromkind(
            board,
            ['door', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 10:
          // scroll
          memorywritefromkind(
            board,
            ['scroll', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 11:
          // passage
          memorywritefromkind(
            board,
            ['passage', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 12:
          // duplicator
          memorywritefromkind(
            board,
            ['duplicator', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 13:
          // bomb
          memorywritefromkind(
            board,
            ['bomb', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 14:
          // energize
          memorywritefromkind(
            board,
            ['energize', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 15:
          // star
          memorywritefromkind(
            board,
            ['star', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 16:
          // clockwise
          memorywritefromkind(
            board,
            ['clockwise', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 17:
          // counter
          memorywritefromkind(
            board,
            ['counter', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 18:
          // bullet
          memorywritefromkind(
            board,
            ['bullet', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 19:
          // water
          memorywritefromkind(
            board,
            ['water', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 20:
          // forest
          memorywritefromkind(
            board,
            ['forest', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 21:
          // solid
          memorywritefromkind(
            board,
            ['solid', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 22:
          // normal
          memorywritefromkind(
            board,
            ['normal', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 23:
          // breakable
          memorywritefromkind(
            board,
            ['breakable', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 24:
          // boulder
          memorywritefromkind(
            board,
            ['boulder', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 25:
          // sliderns
          memorywritefromkind(
            board,
            ['sliderns', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 26:
          // sliderew
          memorywritefromkind(
            board,
            ['sliderew', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 27:
          // fake
          memorywritefromkind(
            board,
            ['fake', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 28:
          // invisible
          memorywritefromkind(
            board,
            ['invisible', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 29:
          // blinkwall
          memorywritefromkind(
            board,
            ['blinkwall', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 30:
          // transporter
          memorywritefromkind(
            board,
            ['transporter', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 31:
          // line
          memorywritefromkind(
            board,
            ['line', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 32:
          // ricochet
          memorywritefromkind(
            board,
            ['ricochet', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 33:
          // blinkns
          memorywritefromkind(
            board,
            ['blinkns', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 34:
          // bear
          memorywritefromkind(
            board,
            ['bear', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 35:
          // ruffian
          memorywritefromkind(
            board,
            ['ruffian', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 36:
          // object
          memorywritefromkind(
            board,
            ['object', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 37:
          // slime
          memorywritefromkind(
            board,
            ['slime', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 38:
          // shark
          memorywritefromkind(
            board,
            ['shark', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 39:
          // spinninggun
          memorywritefromkind(
            board,
            ['spinninggun', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 40:
          // pusher
          memorywritefromkind(
            board,
            ['pusher', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 41:
          // lion
          memorywritefromkind(
            board,
            ['lion', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 42:
          // tiger
          memorywritefromkind(
            board,
            ['tiger', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 43:
          // blinkns
          memorywritefromkind(
            board,
            ['blinkns', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 44:
          // head
          memorywritefromkind(
            board,
            ['head', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 45:
          // segment
          memorywritefromkind(
            board,
            ['segment', [COLOR[element.color] as STR_COLOR_CONST]],
            { x, y },
          )
          break
        case 46:
          // empty ???
          break
        case 47:
          memorywritefromkind(board, ['ammo', ['BLUE']], { x, y })
          break
        case 48:
          memorywritefromkind(board, ['ammo', ['GREEN']], { x, y })
          break
        case 49:
          memorywritefromkind(board, ['ammo', ['CYAN']], { x, y })
          break
        case 50:
          memorywritefromkind(board, ['ammo', ['RED']], { x, y })
          break
        case 51:
          memorywritefromkind(board, ['ammo', ['PURPLE']], {
            x,
            y,
          })
          break
        case 52:
          memorywritefromkind(board, ['ammo', ['DKYELLOW']], {
            x,
            y,
          })
          break
        case 53:
          memorywritefromkind(board, ['ammo', ['BLACK']], { x, y })
          break
      }
      ++x
      if (x === 60) {
        x = 0
        ++y
      }
    }
  }

  memorysetbook(book)
  api_toast(SOFTWARE, player, `imported zzt file into ${book.name} book`)
}
