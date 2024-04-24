import { createguid } from 'zss/mapping/guid'
import { MAYBE_STRING } from 'zss/mapping/types'

export enum FRAME_TYPE {
  VIEW, // a view into book state
  EDIT, // shared crdt backed book state + copy buffers ( maybe ?? really just need good undo/redo )
}

export type FRAME_STATE = {
  id: string
  type: FRAME_TYPE
  book?: string
  board?: string
}

function createframe(type: FRAME_TYPE): FRAME_STATE {
  return {
    id: createguid(),
    type,
  }
}

export function createviewframe(
  book: MAYBE_STRING,
  board: MAYBE_STRING,
): FRAME_STATE {
  const frame = createframe(FRAME_TYPE.VIEW)
  frame.book = book
  frame.board = board
  return frame
}

export function createeditframe(
  book: MAYBE_STRING,
  board: MAYBE_STRING,
): FRAME_STATE {
  const frame = createframe(FRAME_TYPE.EDIT)
  frame.book = book
  frame.board = board
  return frame
}
