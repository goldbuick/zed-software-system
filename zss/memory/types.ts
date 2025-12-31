import { BITMAP } from 'zss/gadget/data/bitmap'
import { MAYBE } from 'zss/mapping/types'
import { STR_DIR } from 'zss/words/dir'
import { CATEGORY, COLLISION, WORD } from 'zss/words/types'

// board elements

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
  displaychar?: number
  displaycolor?: number
  displaybg?: number
  light?: number
  lightdir?: STR_DIR
  // interaction
  item?: number
  group?: string
  party?: string
  player?: string
  pushable?: number
  collision?: COLLISION
  breakable?: number
  tickertext?: string
  tickertime?: number
  // config
  p1?: number | string
  p2?: number | string
  p3?: number | string
  p4?: number | string
  p5?: number | string
  p6?: number | string
  p7?: number | string
  p8?: number | string
  p9?: number | string
  p10?: number | string
  cycle?: number
  stepx?: number
  stepy?: number
  shootx?: number
  shooty?: number
  // messages
  sender?: string
  arg?: any
  // runtime
  category?: CATEGORY
  kinddata?: BOARD_ELEMENT
  // cleanup
  removed?: number
}

export type BOARD_ELEMENT_STAT = keyof BOARD_ELEMENT

// boards

export type BOARD = {
  // specifics
  terrain: MAYBE<BOARD_ELEMENT>[]
  objects: Record<string, BOARD_ELEMENT>
  // stats
  isdark?: number
  startx?: number
  starty?: number
  // board displayed over/under this one
  // uses content slot book
  over?: string
  under?: string
  // control camera zoom
  camera?: string
  // control graphics mode
  graphics?: string
  facing?: number
  // control visuals
  charset?: string
  palette?: string
  // common stats
  exitnorth?: string
  exitsouth?: string
  exitwest?: string
  exiteast?: string
  timelimit?: number
  restartonzap?: number
  maxplayershots?: number
  // board params
  b1?: number | string
  b2?: number | string
  b3?: number | string
  b4?: number | string
  b5?: number | string
  b6?: number | string
  b7?: number | string
  b8?: number | string
  b9?: number | string
  b10?: number | string
  // runtime only
  id: string
  name: string
  named?: Record<string, Set<string | number>>
  lookup?: MAYBE<string>[]
  distmaps?: Record<string, number[]>
  overboard?: string
  underboard?: string
  charsetpage?: string
  palettepage?: string
}

export const BOARD_WIDTH = 60
export const BOARD_HEIGHT = 25
export const BOARD_SIZE = BOARD_WIDTH * BOARD_HEIGHT

// codepages

export enum CODE_PAGE_TYPE {
  ERROR,
  LOADER,
  BOARD,
  OBJECT,
  TERRAIN,
  CHARSET,
  PALETTE,
}

export type CODE_PAGE_STATS = {
  type?: CODE_PAGE_TYPE
  name?: string
  [key: string]: WORD
}

export type CODE_PAGE = {
  // all pages have id & code
  id: string
  code: string
  // content data
  board?: BOARD
  object?: BOARD_ELEMENT
  terrain?: BOARD_ELEMENT
  charset?: BITMAP
  palette?: BITMAP
  // common parsed values
  stats?: CODE_PAGE_STATS
}

export type MAYBE_CODE_PAGE = MAYBE<CODE_PAGE>

export type CODE_PAGE_TYPE_MAP = {
  [CODE_PAGE_TYPE.ERROR]: string
  [CODE_PAGE_TYPE.LOADER]: string
  [CODE_PAGE_TYPE.BOARD]: BOARD
  [CODE_PAGE_TYPE.OBJECT]: BOARD_ELEMENT
  [CODE_PAGE_TYPE.TERRAIN]: BOARD_ELEMENT
  [CODE_PAGE_TYPE.CHARSET]: BITMAP
  [CODE_PAGE_TYPE.PALETTE]: BITMAP
}

// book

export type BOOK_FLAGS = Record<string, WORD>

export type BOOK = {
  id: string
  name: string
  timestamp: number
  activelist: string[]
  // content list
  pages: CODE_PAGE[]
  // global flags by id
  flags: Record<string, BOOK_FLAGS>
  // unique token
  token?: string
}

// memory labels

export enum MEMORY_LABEL {
  MAIN = 'main',
  TEMP = 'temp',
  TITLE = 'title',
  PLAYER = 'player',
  GADGETSTORE = 'gadgetstore',
}
