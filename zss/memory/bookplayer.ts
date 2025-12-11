import { unique } from 'zss/mapping/array'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { COLLISION, PT } from 'zss/words/types'

import { checkdoescollide } from './atomics'
import { boardobjectread, boardvisualsupdate } from './board'
import { boardelementisobject } from './boardelement'
import {
  boardnamedwrite,
  boardobjectlookupwrite,
  boardobjectnamedlookupdelete,
} from './boardlookup'
import { boardcheckblockedobject } from './boardops'
import { bookreadflag, bookwriteflag } from './book'
import { BOARD, BOOK } from './types'

import {
  memoryboardinit,
  memoryboardread,
  memoryelementstatread,
  memoryreadplayerboard,
} from '.'

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
) {
  // current board
  const currentboard = memoryreadplayerboard(player)
  if (!ispresent(book) || !ispresent(currentboard)) {
    return false
  }

  // player element
  const element = boardobjectread(currentboard, player)
  if (!boardelementisobject(element) || !element?.id) {
    return false
  }

  // dest board
  const destboard = memoryboardread(board)
  if (!ispresent(destboard)) {
    return false
  }

  // make sure lookup is created
  memoryboardinit(destboard)

  // read target spot
  const maybeobject = boardcheckblockedobject(
    destboard,
    COLLISION.ISWALK,
    dest,
    true,
  )

  // blocked by non-object
  if (!ispresent(maybeobject) && !boardelementisobject(maybeobject)) {
    const terraincollision = memoryelementstatread(maybeobject, 'collision')
    return checkdoescollide(COLLISION.ISWALK, terraincollision) === false
  }

  // remove from current board lookups
  boardobjectnamedlookupdelete(currentboard, element)
  // hard remove player element
  delete currentboard.objects[element.id]

  // add to dest board
  element.x = dest.x
  element.y = dest.y
  destboard.objects[element.id] = element

  // add to dest board lookups
  boardnamedwrite(destboard, element)
  boardobjectlookupwrite(destboard, element)

  // updating tracking
  bookwriteflag(book, player, 'enterx', dest.x)
  bookwriteflag(book, player, 'entery', dest.y)
  bookplayersetboard(book, player, destboard.id)

  // we did move
  return true
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
      // update resolve caches
      boardvisualsupdate(board)

      // see if we have an over board
      // it runs first
      const over = memoryboardread(board.overboard ?? '')
      if (ispresent(over)) {
        // only add once
        if (!addedids.has(over.id)) {
          mainboards.push(over)
        }
      }

      // followed by the mainboard
      mainboards.push(board)
    }
  }
  return mainboards
}
