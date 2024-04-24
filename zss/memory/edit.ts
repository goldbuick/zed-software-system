import { PT, STR_KIND } from 'zss/firmware/wordtypes'
import { ispresent } from 'zss/mapping/types'

import {
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
  dest: PT,
  kind: STR_KIND,
) {
  if (!book || !board) {
    return
  }

  const [name, maybecolor] = kind
  const maybeterrain = bookreadterrain(book, name)
  if (ispresent(maybeterrain)) {
    boardsetterrainfromkind(board, dest.x, dest.y, name)
    boardelementapplycolor(boardgetterrain(board, dest.x, dest.y), maybecolor)
  }

  const maybeobject = bookreadobject(book, kind[0])
  if (ispresent(maybeobject) && ispresent(maybeobject.name)) {
    createboardobjectfromkind(board, dest.x, dest.y, maybeobject)
    boardelementapplycolor(maybeobject, maybecolor)
  }
}
