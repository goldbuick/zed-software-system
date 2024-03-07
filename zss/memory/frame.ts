import { createguid } from '../mapping/guid'

export enum FRAME_TYPE {
  MAIN, // handles ticking the needed boards
  VIEW, // a view into book state
  EDIT, // shared crdt backed book state + copy buffers
}

export type FRAME_STATE = {
  id: string
  type: FRAME_TYPE
  book: string
  board?: string
  focus?: string
}

function createframe(type: FRAME_TYPE, book: string): FRAME_STATE {
  return {
    id: createguid(),
    type,
    book,
  }
}

export function createmainframe(book: string): FRAME_STATE {
  return createframe(FRAME_TYPE.MAIN, book)
}

export function createviewframe(
  book: string,
  board: string,
  focus: string,
): FRAME_STATE {
  const frame = createframe(FRAME_TYPE.MAIN, book)
  frame.board = board
  frame.focus = focus
  return frame
}

export function createeditframe(book: string, board: string): FRAME_STATE {
  const frame = createframe(FRAME_TYPE.MAIN, book)
  frame.board = board
  return frame
}
