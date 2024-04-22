import { STR_KIND } from 'zss/firmware/wordtypes'
import { ispresent } from 'zss/mapping/types'

import {
  BOARD_DIR,
  MAYBE_BOARD,
  boardelementapplycolor,
  boardgetterrain,
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

  const [name, maybecolor] = kind
  const maybeterrain = bookreadterrain(book, name)
  if (ispresent(maybeterrain)) {
    boardsetterrainfromkind(board, dir.x, dir.y, name)
    boardelementapplycolor(boardgetterrain(board, dir.x, dir.y), maybecolor)
  }

  const maybeobject = bookreadobject(book, kind[0])
  if (ispresent(maybeobject) && ispresent(maybeobject.name)) {
    createboardobjectfromkind(board, dir.x, dir.y, maybeobject)
    boardelementapplycolor(maybeobject, maybecolor)
  }
}
