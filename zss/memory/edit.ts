import { PT, STR_KIND } from 'zss/firmware/wordtypes'
import { MAYBE, ispresent } from 'zss/mapping/types'

import {
  MAYBE_BOARD,
  boardelementapplycolor,
  boardterrainsetfromkind,
  boardobjectcreatefromkind,
} from './board'
import { BOARD_ELEMENT_STATS, MAYBE_BOARD_ELEMENT } from './boardelement'
import {
  MAYBE_BOOK,
  bookboardobjectlookupwrite,
  bookboardnamedwrite,
  bookreadobject,
  bookreadterrain,
} from './book'

// what do I do with this ????

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

export function editboardwriteheadlessobject(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  kind: MAYBE<STR_KIND>,
  dest: PT,
) {
  if (ispresent(book) && ispresent(board) && ispresent(kind)) {
    const [name, maybecolor] = kind
    const maybeobject = bookreadobject(book, name)
    if (ispresent(maybeobject) && ispresent(maybeobject.name)) {
      // create new object element
      const object = boardobjectcreatefromkind(board, dest, name)
      if (ispresent(object)) {
        // mark as headless
        object.headless = true
        // update color
        boardelementapplycolor(object, maybecolor)
        // update named (terrain & objects)
        bookboardnamedwrite(book, board, object)
      }
      // return result
      return object
    }
  }
  return undefined
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
      const terrain = boardterrainsetfromkind(board, dest, name)
      // update color
      boardelementapplycolor(terrain, maybecolor)
      // update named (terrain & objects)
      const index = dest.x + dest.y * board.width
      bookboardnamedwrite(book, board, terrain, index)
      // return result
      return terrain
    }

    const maybeobject = bookreadobject(book, name)
    if (ispresent(maybeobject) && ispresent(maybeobject.name)) {
      // create new object element
      const object = boardobjectcreatefromkind(board, dest, name)
      // update color
      boardelementapplycolor(object, maybecolor)
      // update lookup (only objects)
      bookboardobjectlookupwrite(book, board, object)
      // update named (terrain & objects)
      bookboardnamedwrite(book, board, object)
      // return result
      return object
    }
  }
  return undefined
}
