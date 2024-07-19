import { createsid } from 'zss/mapping/guid'

export enum FRAME_TYPE {
  VIEW, // a view into book state
  EDIT, // shared crdt backed book state + copy buffers ( maybe ?? really just need good undo/redo )
}

export type FRAME_STATE = {
  id: string
  type: FRAME_TYPE
  book?: string[]
  board?: string[]
}

function createframe(type: FRAME_TYPE): FRAME_STATE {
  return {
    id: createsid(),
    type,
  }
}

export function createviewframe(book: string[], board: string[]): FRAME_STATE {
  const frame = createframe(FRAME_TYPE.VIEW)
  frame.book = book
  frame.board = board
  return frame
}

export function createeditframe(book: string[], board: string[]): FRAME_STATE {
  const frame = createframe(FRAME_TYPE.EDIT)
  frame.book = book
  frame.board = board
  return frame
}
