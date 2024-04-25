import { PT, STR_KIND } from 'zss/firmware/wordtypes'
import { MAYBE, ispresent } from 'zss/mapping/types'

import {
  MAYBE_BOARD,
  boardelementapplycolor,
  boardterrainsetfromkind,
  boardobjectcreatefromkind,
  MAYBE_BOARD_ELEMENT,
  BOARD_ELEMENT_STATS,
} from './board'
import {
  MAYBE_BOOK,
  bookboardlookupwrite,
  bookboardnamedwrite,
  bookreadobject,
  bookreadterrain,
} from './book'

export function editelementstatsafewrite(
  element: MAYBE_BOARD_ELEMENT,
  stats: BOARD_ELEMENT_STATS,
) {
  // invalid data
  if (!ispresent(element) || !ispresent(stats)) {
    return
  }
  // init stats if needed
  if (!ispresent(element.stats)) {
    element.stats = {}
  }
  // write stats
  for (const [name, value] of Object.entries(stats)) {
    const lname = name.toLowerCase()
    element.stats[lname] = value
  }
}

export function editboardwrite(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  kind: MAYBE<STR_KIND>,
  dest: PT,
): MAYBE_BOARD_ELEMENT {
  if (ispresent(book) && ispresent(board) && ispresent(kind)) {
    const [name, maybecolor] = kind
    const maybeterrain = bookreadterrain(book, name)
    if (ispresent(maybeterrain)) {
      // create new terrain element
      const terrain = boardterrainsetfromkind(board, dest.x, dest.y, name)
      // update color
      boardelementapplycolor(terrain, maybecolor)
      // update lookup and named
      bookboardlookupwrite(book, board, terrain)
      bookboardnamedwrite(book, board, terrain, dest.x + dest.y * board.width)
      // return result
      return terrain
    }

    const maybeobject = bookreadobject(book, name)
    if (ispresent(maybeobject) && ispresent(maybeobject.name)) {
      // create new object element
      const object = boardobjectcreatefromkind(board, dest.x, dest.y, name)
      // update color
      boardelementapplycolor(object, maybecolor)
      // update lookup and named
      bookboardlookupwrite(book, board, object)
      bookboardnamedwrite(book, board, object)
      // return result
      return object
    }
  }
  return undefined
}
