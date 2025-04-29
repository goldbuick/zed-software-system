import { ispid } from 'zss/mapping/guid'
import { ispresent, MAYBE } from 'zss/mapping/types'
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
import { PT } from 'zss/words/types'

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

export function mapelementcopy(
  maybenew: MAYBE<BOARD_ELEMENT>,
  from: BOARD_ELEMENT,
) {
  if (!ispresent(maybenew)) {
    return
  }
  // copy __some__ of the stats
  maybenew.name = from.name
  maybenew.char = from.char
  maybenew.color = from.color
  maybenew.bg = from.bg
  maybenew.p1 = from.p1
  maybenew.p2 = from.p2
  maybenew.p3 = from.p3
  maybenew.code = from.code
  maybenew.group = from.group
  maybenew.party = from.party
  maybenew.cycle = from.cycle
  maybenew.light = from.light
  maybenew.stepx = from.stepx
  maybenew.stepy = from.stepy
  maybenew.pushable = from.pushable
  maybenew.collision = from.collision
  maybenew.destructible = from.destructible
  maybenew.tickertext = from.tickertext
  maybenew.tickertime = from.tickertime
}

export function boardcopy(
  source: string,
  target: string,
  p1: PT,
  p2: PT,
  targetset: string,
) {
  if (!ispresent(READ_CONTEXT.book)) {
    return
  }
  const book = READ_CONTEXT.book

  const sourcecodepage = bookreadcodepagewithtype(
    book,
    CODE_PAGE_TYPE.BOARD,
    source,
  )
  const sourceboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(sourcecodepage)
  if (!ispresent(sourceboard)) {
    return
  }

  const targetcodepage = bookreadcodepagewithtype(
    book,
    CODE_PAGE_TYPE.BOARD,
    target,
  )
  const targetboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(targetcodepage)
  if (!ispresent(targetboard)) {
    return
  }

  // make sure lookup is created
  bookboardsetlookup(book, sourceboard)
  bookboardsetlookup(book, targetboard)

  if (ispresent(sourceboard && ispresent(targetboard))) {
    // blank target region
    switch (targetset) {
      case 'all':
        emptyarea(book, targetboard, p1, p2)
        break
      case 'object':
        emptyareaobject(book, targetboard, p1, p2)
        break
      case 'terrain':
        emptyareaterrain(book, targetboard, p1, p2)
        break
      default:
        // todo: handle groups
        break
    }

    // copy new elements
    for (let y = p1.y; y <= p2.y; ++y) {
      for (let x = p1.x; x <= p2.x; ++x) {
        let copyobject = false
        let copyterrain = false
        switch (targetset) {
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
          default:
            // todo: handle groups
            break
        }

        // read source element
        let terrain: MAYBE<BOARD_ELEMENT>
        let object = boardelementread(sourceboard, { x, y })
        if (boardelementisobject(object)) {
          terrain = boardgetterrain(sourceboard, x, y)
          if (ispid(object?.id)) {
            object = undefined
          }
        } else {
          terrain = object
          object = undefined
        }

        if (ispresent(terrain) && copyterrain) {
          const el = bookboardwritefromkind(
            book,
            targetboard,
            [terrain.kind ?? ''],
            { x, y },
          )
          mapelementcopy(el, terrain)
        }

        if (ispresent(object) && copyobject) {
          const el = bookboardwritefromkind(
            book,
            targetboard,
            [object.kind ?? ''],
            { x, y },
          )
          mapelementcopy(el, object)
        }
      }
    }

    // rebuild lookups
    delete targetboard.named
    delete targetboard.lookup
    bookboardsetlookup(book, targetboard)
  }
}
