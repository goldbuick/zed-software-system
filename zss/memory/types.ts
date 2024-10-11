export enum COLLISION {
  ISSOLID,
  ISWALK,
  ISSWIM,
  ISBULLET,
}

export enum CATEGORY {
  ISTERRAIN,
  ISOBJECT,
}

export type BOARD_ELEMENT = {
  // this element is an instance of an element type
  kind?: string
  // objects only
  id?: string
  x?: number
  y?: number
  lx?: number
  ly?: number
  code?: string
  // this is a unique name for this instance
  name?: string
  // display
  char?: number
  color?: number
  bg?: number
  // interaction
  pushable?: number
  collision?: COLLISION
  destructible?: number
  // common
  p1?: string
  p2?: string
  p3?: string
  cycle?: number
  stepx?: number
  stepy?: number
  sender?: string
  data?: any
  // custom
  [key: string]: WORD
  // runtime
  category?: CATEGORY
  kinddata?: BOARD_ELEMENT
  kindcode?: string
  headless?: boolean
  removed?: number
}

// simple built-ins go here
export type BOARD_STATS = {
  isdark?: number
  // concept, you can add scope here to address other books
  // and that represents being able to switch out different boards for your engine to edit
  // examples:
  //   main:seeker (book main, board seeker)
  //   main:sid_sdfefef (book main, board sid_sdfefef)
  //
  // would love to have a built in way to select a resource
  //   have some simple contexts to work in:
  //     like select a book (or create a new one)
  //     like select a type of codepage in a book (or create a new one)
  //
  // board displayed over this one
  over?: string
  // only view mode supported for above boards
  // board displayed under this one
  under?: string
  // common stats
  exitnorth?: string
  exitsouth?: string
  exitwest?: string
  exiteast?: string
  timelimit?: number
  maxplayershots?: number
  // generic stats
  [key: string]: WORD
}

export type BOARD = {
  // specifics
  terrain: MAYBE<BOARD_ELEMENT>[]
  objects: Record<string, BOARD_ELEMENT>
  // custom
  stats?: BOARD_STATS
  // runtime only
  codepage: string
  lookup?: MAYBE_STRING[]
  named?: Record<string, Set<string | number>>
}

export type MAYBE_BOARD = MAYBE<BOARD>

export const BOARD_WIDTH = 60
export const BOARD_HEIGHT = 25
const BOARD_TERRAIN: BOARD_ELEMENT[] = new Array(
  BOARD_WIDTH * BOARD_HEIGHT,
).map(() => createboardelement())

export type MAYBE_BOARD_STATS = MAYBE<BOARD_STATS>
export type BOOK_FLAGS = Record<string, WORD>

// player location tracking
export type BOOK_PLAYER = string

export type BOOK = {
  id: string
  name: string
  pages: CODE_PAGE[]
  flags: Record<string, BOOK_FLAGS>
  players: Record<string, BOOK_PLAYER>
}
