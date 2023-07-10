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

export enum TYPE {
  ZSS = 0, // code
  TERRAIN = 1, // code + terrain
  OBJECT = 2, // code + object
  BOARD = 3, // code + board
  WORLD = 4, // code + world
  CHARSET = 5, // code + charset
  LINKS = 6, // code + links
}

type CODEPAGE_COMMON = {
  zss: string
}

type CODEPAGE_ZSS = CODEPAGE_COMMON & {
  type: TYPE.ZSS
}

type CODEPAGE_TERRAIN = CODEPAGE_COMMON & {
  type: TYPE.TERRAIN
  terrain: TERRAIN
}

type CODEPAGE_OBJECT = CODEPAGE_COMMON & {
  type: TYPE.OBJECT
  object: OBJECT
}

type CODEPAGE_BOARD = CODEPAGE_COMMON & {
  type: TYPE.BOARD
  board: BOARD
}

type CODEPAGE_WORLD = CODEPAGE_COMMON & {
  type: TYPE.WORLD
  world: WORLD
}

type CODEPAGE_CHARSET = CODEPAGE_COMMON & {
  type: TYPE.CHARSET
  charset: CHARSET
}

type CODEPAGE_LINKS = CODEPAGE_COMMON & {
  type: TYPE.LINKS
  links: LINKS
}

export type CODEPAGE =
  | CODEPAGE_ZSS
  | CODEPAGE_TERRAIN
  | CODEPAGE_OBJECT
  | CODEPAGE_BOARD
  | CODEPAGE_WORLD
  | CODEPAGE_CHARSET
  | CODEPAGE_LINKS

export type PACKAGE = {
  name: string
  author: string
  description: string
  codepages: CODEPAGE[]
  // here we can alias / include other packages
  // ie: default -> self
  //     rpg -> daves-rpg@1
  //     daves-rpg -> 1
  //     both of these are valid
  uses: Record<string, string>
}

/*
USERBASE thoughts

We can create a global database where all items added have
writeAccess: { onlyCreator: true }

this we can read published packages, and modify our own packages

and we write/read a package from the item added to the db

given that we have to load all db items into memory ;-;
how do we not crush the poor browser when we're looking stuff up in 
the registry?

and does this thought exercise even matter if userbase doesn't provide anon read access ?

-- read only access --
we can generate a temporary user for anon read only access ...
and we can optimize for this ...
delete user after successful DB open


*/
