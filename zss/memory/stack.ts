export enum FRAME_TYPE {
  APP, // handles ticking the needed boards
  VIEW, // a view into book state
  EDIT, // shared crdt backed book state + copy buffers
}

export type FRAME =
  | { type: FRAME_TYPE.APP }
  | { type: FRAME_TYPE.VIEW }
  | { type: FRAME_TYPE.EDIT }
