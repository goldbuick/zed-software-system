export enum DIR {
  NONE,
  UP,
  DOWN,
  LEFT,
  RIGHT,
  BY,
  AT,
  FROM,
  FLOW,
  SEEK,
  RNDNS,
  RNDNE,
  RND,
  // modifiers
  CW,
  CCW,
  OPP,
  RNDP,
  // aliases
  IDLE = NONE,
  U = UP,
  NORTH = UP,
  N = UP,
  D = DOWN,
  SOUTH = DOWN,
  S = DOWN,
  L = LEFT,
  WEST = LEFT,
  W = LEFT,
  R = RIGHT,
  EAST = RIGHT,
  E = RIGHT,
}

export type POINT = {
  x: number
  y: number
}
