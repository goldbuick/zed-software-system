import { STR_KIND } from 'zss/firmware/wordtypes'
import { ispresent } from 'zss/mapping/types'

import {
  BOARD_DIR,
  MAYBE_BOARD,
  boardsetterrainfromkind,
  createboardobjectfromkind,
} from './board'
import { MAYBE_BOOK, bookreadobject, bookreadterrain } from './book'

export function editboard(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  dir: BOARD_DIR,
  kind: STR_KIND,
) {
  if (!book || !board) {
    return
  }

  const maybeterrain = bookreadterrain(book, kind[0])
  if (ispresent(maybeterrain)) {
    boardsetterrainfromkind(board, dir.x, dir.y, maybeterrain)
  }

  const maybeobject = bookreadobject(book, kind[0])
  if (ispresent(maybeobject)) {
    createboardobjectfromkind(board, dir.x, dir.y, maybeobject)
  }
}
