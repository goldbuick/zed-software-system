import { degToRad } from 'maath/misc'
import { boardpivot } from 'zss/feature/boardpivot'
import {
  boardremix,
  boardremixrestart,
  boardremixsnapshot,
} from 'zss/feature/boardremix'
import { createfirmware } from 'zss/firmware'
import { pick } from 'zss/mapping/array'
import { isnumber, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import {
  boardelementread,
  boardgetterrain,
  boardsetterrain,
} from 'zss/memory/board'
import { boardelementisobject } from 'zss/memory/boardelement'
import { bookreadcodepagesbytypeandstat } from 'zss/memory/book'
import {
  bookboardsafedelete,
  bookboardsetlookup,
  bookboardwritefromkind,
} from 'zss/memory/bookboard'
import { codepagereaddata } from 'zss/memory/codepage'
import { BOARD, BOARD_ELEMENT, BOOK, CODE_PAGE_TYPE } from 'zss/memory/types'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { NAME, PT } from 'zss/words/types'

function emptyarea(book: BOOK, board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      const maybeobject = boardelementread(board, { x, y })
      if (boardelementisobject(maybeobject)) {
        bookboardsafedelete(book, board, maybeobject, book.timestamp)
      }
      boardsetterrain(board, { x, y })
    }
  }
}

function emptyareaterrain(book: BOOK, board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      boardsetterrain(board, { x, y })
    }
  }
}

function emptyareaobject(book: BOOK, board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      const maybeobject = boardelementread(board, { x, y })
      if (boardelementisobject(maybeobject)) {
        bookboardsafedelete(book, board, maybeobject, book.timestamp)
      }
      boardsetterrain(board, { x, y })
    }
  }
}

function mapelementcopy(maybenew: MAYBE<BOARD_ELEMENT>, from: BOARD_ELEMENT) {
  if (!ispresent(maybenew)) {
    return
  }
  // copy __some__ of the stats
  maybenew.char = from.char
  maybenew.color = from.color
  maybenew.bg = from.bg
  maybenew.p1 = from.p1
  maybenew.p2 = from.p2
  maybenew.p3 = from.p3
  maybenew.code = from.code
  maybenew.cycle = from.cycle
  maybenew.light = from.light
  maybenew.stepx = from.stepx
  maybenew.stepy = from.stepy
  maybenew.pushable = from.pushable
  maybenew.collision = from.collision
  maybenew.destructible = from.destructible
}

function maptargetset(word: any) {
  if (isstring(word)) {
    const maybetarget = NAME(word)
    switch (maybetarget) {
      case 'all':
      case 'object':
      case 'terrain':
        return maybetarget
    }
  }
  return undefined
}

export const BOARD_FIRMWARE = createfirmware()
  .command('snapshot', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    // check for subcommand
    const [maybestat] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    if (maybestat) {
      boardremixrestart(READ_CONTEXT.board.id)
    } else {
      boardremixsnapshot(READ_CONTEXT.board.id)
    }
    return 0
  })
  .command('remix', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    // remix current board with a board that matches given given stat
    const [stat, pattersize, mirror, x1, y1, x2, y2] = readargs(words, 0, [
      ARG_TYPE.NAME,
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_NUMBER,
    ])
    const boards = bookreadcodepagesbytypeandstat(
      READ_CONTEXT.book,
      CODE_PAGE_TYPE.BOARD,
      stat,
    )
    const sourceboard = pick(...boards)
    if (ispresent(sourceboard)) {
      const pt1 = ispresent(x1) && ispresent(y1) ? { x: x1, y: y1 } : undefined
      const pt2 = ispresent(x2) && ispresent(y2) ? { x: x2, y: y2 } : undefined
      boardremix(
        READ_CONTEXT.board.id,
        sourceboard.id,
        pattersize,
        mirror,
        pt1,
        pt2,
      )
    }
    return 0
  })
  .command('weave', (_, words) => {
    // <dir> [number] [all|terrain|objects]
    const [dir, maybeop1, maybeop2] = readargs(words, 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ])
    console.info({ dir, maybeop1, maybeop2 })
    return 0
  })
  .command('pivot', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    // rotate board
    // [number] [all|terrain|object]
    const args = readargs(words, 0, [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ])
    let radians = 0
    let opfilter: MAYBE<string> = ''
    for (let i = 0; i < args.length - 1; ++i) {
      const arg = args[i]
      if (isstring(arg)) {
        opfilter = maptargetset(arg)
      }
      if (isnumber(arg)) {
        radians = degToRad(arg)
      }
    }
    if (radians && isstring(opfilter)) {
      boardpivot(
        READ_CONTEXT.board.id,
        radians,
        opfilter !== 'object',
        opfilter !== 'terrain',
      )
    }
    return 0
  })
  .command('copy', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    // copy partial board
    // <stat> <x1> ... <y2> [all|terrain|object]
    const [stat, x1, y1, x2, y2, maybeop1] = readargs(words, 0, [
      ARG_TYPE.NAME,
      ARG_TYPE.NUMBER,
      ARG_TYPE.NUMBER,
      ARG_TYPE.NUMBER,
      ARG_TYPE.NUMBER,
      ARG_TYPE.MAYBE_STRING,
    ])
    const opfilter = maptargetset(maybeop1)
    const boards = bookreadcodepagesbytypeandstat(
      READ_CONTEXT.book,
      CODE_PAGE_TYPE.BOARD,
      stat,
    )
    const sourceboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(pick(...boards))
    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)
    bookboardsetlookup(READ_CONTEXT.book, sourceboard)
    if (ispresent(sourceboard)) {
      switch (opfilter) {
        default:
        case 'all':
          emptyarea(
            READ_CONTEXT.book,
            READ_CONTEXT.board,
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          )
          break
        case 'object':
          emptyareaobject(
            READ_CONTEXT.book,
            READ_CONTEXT.board,
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          )
          break
        case 'terrain':
          emptyareaterrain(
            READ_CONTEXT.book,
            READ_CONTEXT.board,
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          )
          break
      }
      // copy new elements
      for (let y = y1; y <= y2; ++y) {
        for (let x = x1; x <= x2; ++x) {
          let copyobject = false
          let copyterrain = false
          switch (opfilter) {
            default:
            case 'all':
              copyobject = true
              copyterrain = true
              break
            case 'object':
              copyobject = true
              break
            case 'terrain':
              copyterrain = true
              break
          }
          let terrain: MAYBE<BOARD_ELEMENT>
          let object = boardelementread(sourceboard, { x, y })
          if (boardelementisobject(object)) {
            terrain = boardgetterrain(sourceboard, x, y)
          } else {
            terrain = object
            object = undefined
          }
          if (ispresent(terrain) && copyterrain) {
            const el = bookboardwritefromkind(
              READ_CONTEXT.book,
              READ_CONTEXT.board,
              [terrain.kind ?? ''],
              { x, y },
            )
            mapelementcopy(el, terrain)
          }
          if (ispresent(object) && copyobject) {
            const el = bookboardwritefromkind(
              READ_CONTEXT.book,
              READ_CONTEXT.board,
              [object.kind ?? ''],
              { x, y },
            )
            mapelementcopy(el, object)
          }
        }
      }
    }
    return 0
  })
