import { createguid } from 'zss/mapping/guid'

export enum FRAME_TYPE {
  MAIN, // updates book state
  VIEW, // a view into book state
  EDIT, // shared crdt backed book state + copy buffers
}

export type FRAME_STATE = {
  id: string
  type: FRAME_TYPE
  board: string
  focus?: string
}

function createframe(type: FRAME_TYPE, board: string): FRAME_STATE {
  return {
    id: createguid(),
    type,
    board,
  }
}

export function createmainframe(board: string): FRAME_STATE {
  return createframe(FRAME_TYPE.MAIN, board)
}

export function createviewframe(board: string): FRAME_STATE {
  return createframe(FRAME_TYPE.VIEW, board)
}

export function createeditframe(board: string): FRAME_STATE {
  return createframe(FRAME_TYPE.EDIT, board)
}
