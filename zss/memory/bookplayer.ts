import { unique } from 'zss/mapping/array'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { COLLISION, PT } from 'zss/words/types'

import { boardelementindex, boardobjectread } from './board'
import { boardelementisobject } from './boardelement'
import { boardsetlookup } from './boardlookup'
import { boardcheckblockedobject } from './boardops'
import { bookreadflag, bookwriteflag } from './book'
import { codepagereaddata } from './codepage'
import { BOARD, BOOK, CODE_PAGE_TYPE } from './types'

import {
  memoryboardread,
  memoryelementstatread,
  memorypickcodepagewithtype,
  memoryreadplayerboard,
  memorysendinteraction,
} from '.'

export function bookplayerreadboard(book: MAYBE<BOOK>, player: string) {
  const address = bookreadflag(book, player, 'board') as string
  const codepage = memorypickcodepagewithtype(CODE_PAGE_TYPE.BOARD, address)
  return codepagereaddata<CODE_PAGE_TYPE.BOARD>(codepage)
}

export function bookplayerreadactive(book: MAYBE<BOOK>, player: string) {
  return book?.activelist.includes(player) ?? false
}

export function bookplayersetboard(
  book: MAYBE<BOOK>,
  player: string,
  board: string,
) {
  if (!ispresent(book)) {
    return
  }
  // write board flag
  bookwriteflag(book, player, 'board', board)

  // determine if player is on a board
  const maybeboard = memoryboardread(board)
  if (ispresent(maybeboard)) {
    // ensure player is listed as active
    if (!book.activelist.includes(player)) {
      book.activelist.push(player)
    }
  } else {
    // ensure player is not listed as active
    book.activelist = book.activelist.filter((id) => id !== player)
  }
}

export function bookplayermovetoboard(
  book: MAYBE<BOOK>,
  player: string,
  board: string,
  dest: PT,
  skipblockedchecked = false,
) {
  // current board
  const currentboard = memoryreadplayerboard(player)
  if (!ispresent(book) || !ispresent(currentboard)) {
    return
  }

  // player element
  const element = boardobjectread(currentboard, player)
  if (!boardelementisobject(element) || !element?.id) {
    return
  }

  // dest board
  const destboard = memoryboardread(board)
  if (!ispresent(destboard)) {
    return
  }

  // make sure lookup is created
  boardsetlookup(destboard)

  // read target spot
  const maybeobject = boardcheckblockedobject(
    destboard,
    COLLISION.ISWALK,
    dest,
    true,
  )
  if (skipblockedchecked === false && ispresent(maybeobject)) {
    if (memoryelementstatread(maybeobject, 'item')) {
      memorysendinteraction(player, element, maybeobject, 'touch')
    } else {
      // blocked by non-item
      return
    }
  }

  // remove from current board
  delete currentboard.objects[element.id]
  const startidx = boardelementindex(currentboard, element)
  if (currentboard.lookup) {
    currentboard.lookup[startidx] = undefined
  }

  // add to dest board
  element.x = dest.x
  element.y = dest.y
  destboard.objects[element.id] = element
  const destidx = boardelementindex(destboard, element)
  if (destboard.lookup) {
    destboard.lookup[destidx] = element.id
  }

  // updating tracking
  bookplayersetboard(book, player, destboard.id)
}

function bookplayerreadboardids(book: MAYBE<BOOK>) {
  const activelist = book?.activelist ?? []
  const boardids = activelist.map((player) => {
    const value = bookreadflag(book, player, 'board')
    return isstring(value) ? value : ''
  })
  return unique(boardids)
}

export function bookplayerreadboards(book: MAYBE<BOOK>) {
  const ids = bookplayerreadboardids(book)
  const addedids = new Set<string>()
  const mainboards: BOARD[] = []
  for (let i = 0; i < ids.length; ++i) {
    const board = memoryboardread(ids[i])
    // only process once
    if (ispresent(board) && !addedids.has(board.id)) {
      // see if we have an over board
      // it runs first
      if (isstring(board.over)) {
        if (isstring(board.overboard)) {
          const over = memoryboardread(board.overboard)
          if (ispresent(over)) {
            // only add once
            if (!addedids.has(over.id)) {
              mainboards.push(over)
            }
          } else {
            delete board.overboard
          }
        } else {
          // check to see if board.over is a stat
          const maybeboard = memoryboardread(board.over)
          if (ispresent(maybeboard)) {
            board.overboard = maybeboard.id
          }
        }
      } else if (isstring(board.overboard)) {
        delete board.overboard
      }

      // followed by the mainboard
      mainboards.push(board)

      // see if we have an under board
      // it is not run
      if (isstring(board.under)) {
        if (isstring(board.underboard)) {
          const under = memoryboardread(board.underboard)
          if (!ispresent(under)) {
            delete board.underboard
          }
        } else {
          // check to see if board.under is a stat
          const maybeboard = memoryboardread(board.under)
          if (ispresent(maybeboard)) {
            board.underboard = maybeboard.id
          }
        }
      } else if (isstring(board.underboard)) {
        delete board.underboard
      }
    }
  }
  return mainboards
}
