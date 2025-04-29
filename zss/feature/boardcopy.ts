import { ispresent, isstring, MAYBE } from 'zss/mapping/types'
import {
  boardelementread,
  boardgetterrain,
  boardsetterrain,
} from 'zss/memory/board'
import { boardelementisobject } from 'zss/memory/boardelement'
import { bookreadcodepagewithtype } from 'zss/memory/book'
import {
  bookboardsafedelete,
  bookboardsetlookup,
  bookboardwritefromkind,
} from 'zss/memory/bookboard'
import { codepagereaddata } from 'zss/memory/codepage'
import { BOARD, BOARD_ELEMENT, BOOK, CODE_PAGE_TYPE } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
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

export function boardcopy(
  target: string,
  source: string,
  p1: PT,
  p2: PT,
  targetset: string,
) {
  if (!ispresent(READ_CONTEXT.book)) {
    return
  }
  const targetcodepage = bookreadcodepagewithtype(
    READ_CONTEXT.book,
    CODE_PAGE_TYPE.BOARD,
    target,
  )
  const targetboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(targetcodepage)
  if (!ispresent(targetboard)) {
    return
  }
  const sourcecodepage = bookreadcodepagewithtype(
    READ_CONTEXT.book,
    CODE_PAGE_TYPE.BOARD,
    source,
  )
  const sourceboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(sourcecodepage)
  if (!ispresent(sourceboard)) {
    return
  }

  // make sure lookup is created
  bookboardsetlookup(READ_CONTEXT.book, targetboard)
  bookboardsetlookup(READ_CONTEXT.book, sourceboard)

  if (ispresent(sourceboard)) {
    switch (targetset) {
      default:
      case 'all':
        emptyarea(READ_CONTEXT.book, targetboard, p1, p2)
        break
      case 'object':
        emptyareaobject(READ_CONTEXT.book, targetboard, p1, p2)
        break
      case 'terrain':
        emptyareaterrain(READ_CONTEXT.book, targetboard, p1, p2)
        break
    }
    // copy new elements
    for (let y = p1.y; y <= p2.y; ++y) {
      for (let x = p1.x; x <= p2.x; ++x) {
        let copyobject = false
        let copyterrain = false
        switch (targetset) {
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
}
