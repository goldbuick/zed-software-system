import { BITMAP } from 'zss/gadget/data/bitmap'
import { MAYBE, MAYBE_STRING } from 'zss/mapping/types'
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
  // interaction
  player?: string
  pushable?: number
  collision?: COLLISION
  destructible?: number
  tickertext?: string
  tickertime?: number
  // config
  p1?: string
  p2?: string
  p3?: string
  cycle?: number
  stepx?: number
  stepy?: number
  sender?: string
  data?: any
  // runtime
  category?: CATEGORY
  kinddata?: BOARD_ELEMENT
  // cleanup
  headless?: boolean
  removed?: number
}

// boards

export type BOARD = {
  // specifics
  terrain: MAYBE<BOARD_ELEMENT>[]
  objects: Record<string, BOARD_ELEMENT>
  // stats
  isdark?: number
  // board displayed over/under this one
  // uses content slot book
  over?: string
  under?: string
  // common stats
  exitnorth?: string
  exitsouth?: string
  exitwest?: string
  exiteast?: string
  timelimit?: number
  restartonzap?: number
  maxplayershots?: number
  // runtime only
  id: string
  lookup?: MAYBE_STRING[]
  named?: Record<string, Set<string | number>>
}

export const BOARD_WIDTH = 60
export const BOARD_HEIGHT = 25
export const BOARD_SIZE = BOARD_WIDTH * BOARD_HEIGHT

// 8tracks

export enum EIGHT_FX {
  ECHO,
  REVERB,
  DISTORTION,
}

export type EIGHT_FX_CONFIG = {
  fx: EIGHT_FX
  settings: Record<number, WORD>
}

export enum EIGHT_SYNTH {
  SQUARE,
  TRIANGLE,
}

export type EIGHT_SYNTH_CONFIG = {
  synth: EIGHT_SYNTH
  effects: EIGHT_FX_CONFIG[]
  settings: Record<number, WORD>
}

export type EIGHT_MEASURE = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

export type EIGHT_TRACK = {
  tempo: number
  synths: [
    EIGHT_SYNTH_CONFIG,
    EIGHT_SYNTH_CONFIG,
    EIGHT_SYNTH_CONFIG,
    EIGHT_SYNTH_CONFIG,
    EIGHT_SYNTH_CONFIG,
    EIGHT_SYNTH_CONFIG,
    EIGHT_SYNTH_CONFIG,
    EIGHT_SYNTH_CONFIG,
  ]
  measures: EIGHT_MEASURE[]
}

// codepages

export enum CODE_PAGE_TYPE {
  ERROR,
  LOADER,
  BOARD,
  OBJECT,
  TERRAIN,
  CHARSET,
  PALETTE,
  EIGHT_TRACK,
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
  eighttrack?: EIGHT_TRACK
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
  [CODE_PAGE_TYPE.EIGHT_TRACK]: EIGHT_TRACK
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
}

// readers

export type BINARY_READER = {
  filename: string
  cursor: number
  bytes: Uint8Array
  dataview: DataView
}
