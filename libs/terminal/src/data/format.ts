// board/world format related types

export enum COLLISION {
  SOLID = 0,
  WALK = 1,
  SWIM = 2,
  BULLET = 3,
  GHOST = 4,
}

export type TERRAIN = {
  // display
  char?: number
  color?: number
  bg?: number
  // stats
  collision?: COLLISION
  // custom stats
  stats?: Record<string, number>
}

export type OBJECT = TERRAIN & {
  pushable?: boolean
}

export type BOARD_TERRAIN = TERRAIN & {
  codepage?: string
}

export type BOARD_OBJECT = OBJECT & {
  codepage?: string
  x: number
  y: number
}

export type BOARD = {
  width: number
  height: number
  terrain: BOARD_TERRAIN[]
  objects: BOARD_OBJECT[]
}

export type WORLD_BOARD = BOARD & {
  x: number
  y: number
}

export type WORLD = {
  boards: WORLD_BOARD[]
}

// display/media types

export type CHAR = number[]

export type CHARSET = CHAR[]

export type LINKS = Record<string, string>

// codepage types

export enum CODEPAGE {
  ZSS, // code
  TERRAIN, // code + terrain
  OBJECT, // code + object
  BOARD, // code + board
  WORLD, // code + world
  CHARSET, // code + charset
  LINKS, // code + links
}

type CODEPAGE_COMMON = {
  zss: string
}

type CODEPAGE_ZSS = CODEPAGE_COMMON & {
  type: CODEPAGE.ZSS
}

type CODEPAGE_TERRAIN = CODEPAGE_COMMON & {
  type: CODEPAGE.TERRAIN
  terrain: TERRAIN
}

type CODEPAGE_OBJECT = CODEPAGE_COMMON & {
  type: CODEPAGE.OBJECT
  object: OBJECT
}

type CODEPAGE_BOARD = CODEPAGE_COMMON & {
  type: CODEPAGE.BOARD
  board: BOARD
}

type CODEPAGE_WORLD = CODEPAGE_COMMON & {
  type: CODEPAGE.WORLD
  world: WORLD
}

type CODEPAGE_CHARSET = CODEPAGE_COMMON & {
  type: CODEPAGE.CHARSET
  charset: CHARSET
}

type CODEPAGE_LINKS = CODEPAGE_COMMON & {
  type: CODEPAGE.LINKS
  links: LINKS
}

export type CODEPAGE_DATA =
  | CODEPAGE_ZSS
  | CODEPAGE_TERRAIN
  | CODEPAGE_OBJECT
  | CODEPAGE_BOARD
  | CODEPAGE_WORLD
  | CODEPAGE_CHARSET
  | CODEPAGE_LINKS
