export enum FRAME_TYPE {
  MAIN, // handles ticking the needed boards
  VIEW, // a view into book state
  EDIT, // shared crdt backed book state + copy buffers
}

export type FRAME_STATE =
  | {
      type: FRAME_TYPE.MAIN
      book: string
    }
  | {
      type: FRAME_TYPE.VIEW
      book: string
      board: string
      focus: string
    }
  | {
      type: FRAME_TYPE.EDIT
      book: string
      board: string
    }
