import { BITMAP } from 'zss/gadget/data/bitmap'
import { MAYBE } from 'zss/mapping/types'
import { STR_DIR } from 'zss/words/dir'
import { CATEGORY, COLLISION, WORD } from 'zss/words/types'

// constants

export const BOARD_WIDTH = 60
export const BOARD_HEIGHT = 25
export const BOARD_SIZE = BOARD_WIDTH * BOARD_HEIGHT
export const CHAR_RAY_MARGIN = 3
export const FIXED_DATE = new Date('1980/09/02')

/** Gadget-only sentinel: cardinal paths to a corner disagree; show undiscovered placeholder, never cache tint. */
export const CORNER_EXIT_DISPUTED = '__corner_exit_disputed__'

// enums

export enum BITMAP_KEYS {
  width,
  height,
  bits,
}

export enum BOARD_ELEMENT_KEYS {
  kind,
  id,
  x,
  y,
  lx,
  ly,
  code,
  name,
  char,
  color,
  bg,
  light,
  player,
  bucket,
  pushable,
  collision,
  breakable,
  tickertext,
  tickertime,
  p1,
  p2,
  p3,
  cycle,
  stepx,
  stepy,
  sender,
  arg,
  stopped,
  removed,
  party,
  group,
  lightdir,
  item,
  p4,
  p5,
  p6,
  displaychar,
  displaycolor,
  displaybg,
  shootx,
  shooty,
  p7,
  p8,
  p9,
  p10,
  didfail,
  displayname,
}

export enum BOARD_KEYS {
  terrain,
  objects,
  isdark,
  over,
  under,
  exitnorth,
  exitsouth,
  exitwest,
  exiteast,
  timelimit,
  restartonzap,
  maxplayershots,
  camera,
  graphics,
  b1,
  b2,
  b3,
  b4,
  b5,
  b6,
  b7,
  b8,
  b9,
  b10,
  charset,
  palette,
}

export enum BOOK_KEYS {
  id,
  name,
  timestamp,
  activelist,
  pages,
  flags,
  token,
}

export enum CODE_PAGE_KEYS {
  id,
  code,
  board,
  object,
  terrain,
  charset,
  palette,
}

export enum CODE_PAGE_TYPE {
  ERROR,
  LOADER,
  BOARD,
  OBJECT,
  TERRAIN,
  CHARSET,
  PALETTE,
}

export enum MEMORY_LABEL {
  MAIN = 'main',
  TEMP = 'temp',
  TITLE = 'title',
  PLAYER = 'player',
}

// types

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
  runtime?: string
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
  displaychar?: number
  displaycolor?: number
  displaybg?: number
  displayname?: string
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
  didfail?: number
  // messages
  sender?: string
  arg?: any
  // cleanup
  removed?: number
  // runtime only
  runtime?: string
}

export type BOARD_ELEMENT_STAT = keyof BOARD_ELEMENT

export type BOOK = {
  id: string
  name: string
  token?: string // unique token
  timestamp: number
  activelist: string[]
  pages: CODE_PAGE[] // Ordered code page shells; shells may also be registered at `boundaries[page.id]` for sync.
  flags: Record<string, string> // Per-owner boundary ids; each owner id maps to a boundary-backed `BOOK_FLAGS` record.
}

export type BOOK_FLAGS = Record<string, WORD>

/** Slot payload stored at `boundaries[codepage.id]` (same id as the shell `id`). */
export type CODE_PAGE_RUNTIME = {
  board?: BOARD
  object?: BOARD_ELEMENT
  terrain?: BOARD_ELEMENT
  charset?: BITMAP
  palette?: BITMAP
}

export type CODE_PAGE = {
  id: string
  code: string
  stats?: CODE_PAGE_STATS
}

export type CODE_PAGE_STATS = {
  type?: CODE_PAGE_TYPE
  name?: string
  [key: string]: WORD
}

export type CODE_PAGE_TYPE_MAP = {
  [CODE_PAGE_TYPE.ERROR]: string
  [CODE_PAGE_TYPE.LOADER]: string
  [CODE_PAGE_TYPE.BOARD]: BOARD
  [CODE_PAGE_TYPE.OBJECT]: BOARD_ELEMENT
  [CODE_PAGE_TYPE.TERRAIN]: BOARD_ELEMENT
  [CODE_PAGE_TYPE.CHARSET]: BITMAP
  [CODE_PAGE_TYPE.PALETTE]: BITMAP
}

export type MAYBE_CODE_PAGE = MAYBE<CODE_PAGE>

export type BOARD_RUNTIME = {
  named?: Record<string, Set<string | number>>
  lookup?: MAYBE<string>[]
  distmaps?: Record<string, number[]>
  overboard?: string
  underboard?: string
  charsetpage?: string
  palettepage?: string
  drawlastfp?: Record<string, string> // post-tick draw fingerprints; keys match `memoryelementdrawreadid`
  drawlastxy?: Record<string, { x: number; y: number }> // last known cells for objects (ids); used when objects are removed
  drawallowids?: Set<string> // ids allowed for `:drawdisplay` next tick; undefined means full draw pass
  drawneedfull?: boolean // force full draw next tick (e.g. palette swap); cleared after dirty update
}

export type BOARD_ELEMENT_RUNTIME = {
  category?: CATEGORY
  kinddata?: BOARD_ELEMENT
}
