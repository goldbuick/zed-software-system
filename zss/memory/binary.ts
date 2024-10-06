import * as bin from 'typed-binary'
import { BITMAP } from 'zss/gadget/data/bitmap'
import { ispresent, MAYBE } from 'zss/mapping/types'

export const BIN_WORD = bin.keyed('bin-word', (binword) =>
  bin.generic(
    {},
    {
      wordnumber: bin.object({
        value: bin.i32,
      }),
      wordstring: bin.object({
        value: bin.string,
      }),
      wordarray: bin.object({
        value: bin.dynamicArrayOf(binword),
      }),
    },
  ),
)
export type BIN_WORD = bin.Parsed<typeof BIN_WORD>

export const BIN_WORD_ENTRY = bin.generic(
  {
    name: bin.string,
  },
  {
    wordnumber: bin.object({
      value: bin.i32,
    }),
    wordstring: bin.object({
      value: bin.string,
    }),
    wordarray: bin.object({
      value: bin.dynamicArrayOf(BIN_WORD),
    }),
  },
)
export type BIN_WORD_ENTRY = bin.Parsed<typeof BIN_WORD_ENTRY>

export const BIN_BOARD_ELEMENT = bin.object({
  // this element is an instance of an element type
  kind: bin.optional(bin.string),
  // objects only
  id: bin.optional(bin.string),
  x: bin.optional(bin.byte),
  y: bin.optional(bin.byte),
  lx: bin.optional(bin.byte),
  ly: bin.optional(bin.byte),
  code: bin.optional(bin.string),
  // this is a unique name for this instance
  name: bin.optional(bin.string),
  // display
  char: bin.optional(bin.byte),
  color: bin.optional(bin.byte),
  bg: bin.optional(bin.byte),
  // interaction
  pushable: bin.optional(bin.bool),
  collision: bin.optional(bin.byte),
  destructible: bin.optional(bin.bool),
  // common
  p1: bin.optional(BIN_WORD),
  p2: bin.optional(BIN_WORD),
  p3: bin.optional(BIN_WORD),
  cycle: bin.optional(BIN_WORD),
  stepx: bin.optional(BIN_WORD),
  stepy: bin.optional(BIN_WORD),
  player: bin.optional(BIN_WORD),
  sender: bin.optional(BIN_WORD),
  data: bin.optional(BIN_WORD),
  custom: bin.optional(bin.dynamicArrayOf(BIN_WORD_ENTRY)),
})
export type BIN_BOARD_ELEMENT = bin.Parsed<typeof BIN_BOARD_ELEMENT>

export const BIN_BOARD_STATS = bin.object({
  isdark: bin.optional(BIN_WORD),
  over: bin.optional(BIN_WORD),
  under: bin.optional(BIN_WORD),
  exitnorth: bin.optional(BIN_WORD),
  exitsouth: bin.optional(BIN_WORD),
  exitwest: bin.optional(BIN_WORD),
  exiteast: bin.optional(BIN_WORD),
  timelimit: bin.optional(BIN_WORD),
  maxplayershots: bin.optional(BIN_WORD),
  custom: bin.optional(bin.dynamicArrayOf(BIN_WORD_ENTRY)),
})
export type BIN_BOARD_STATS = bin.Parsed<typeof BIN_BOARD_STATS>

export const BIN_BOARD = bin.object({
  // specifics
  terrain: bin.dynamicArrayOf(BIN_BOARD_ELEMENT),
  objects: bin.dynamicArrayOf(BIN_BOARD_ELEMENT),
  // custom
  stats: bin.optional(BIN_BOARD_STATS),
})
export type BIN_BOARD = bin.Parsed<typeof BIN_BOARD>

export const BIN_BITMAP = bin.object({
  id: bin.string,
  width: bin.u32,
  height: bin.u32,
  size: bin.u32,
  bits: bin.dynamicArrayOf(bin.byte),
})
export type BIN_BITMAP = bin.Parsed<typeof BIN_BITMAP>

export const BIN_EIGHT_TRACK = bin.object({
  tempo: bin.i32,
  measures: bin.dynamicArrayOf(bin.arrayOf(bin.i32, 8)),
})
export type BIN_EIGHT_TRACK = bin.Parsed<typeof BIN_EIGHT_TRACK>

export const BIN_CODEPAGE = bin.object({
  // all pages have id, and code
  id: bin.string,
  code: bin.string,
  // content data
  board: bin.optional(BIN_BOARD),
  object: bin.optional(BIN_BOARD_ELEMENT),
  terrain: bin.optional(BIN_BOARD_ELEMENT),
  charset: bin.optional(BIN_BITMAP),
  palette: bin.optional(BIN_BITMAP),
  eighttrack: bin.optional(BIN_EIGHT_TRACK),
})
export type BIN_CODEPAGE = bin.Parsed<typeof BIN_CODEPAGE>

export const BIN_BOOK = bin.object({
  id: bin.string,
  name: bin.string,
  flags: bin.dynamicArrayOf(
    bin.object({
      player: bin.string,
      values: bin.dynamicArrayOf(BIN_WORD_ENTRY),
    }),
  ),
  players: bin.dynamicArrayOf(
    bin.object({
      player: bin.string,
      board: bin.string,
    }),
  ),
  pages: bin.dynamicArrayOf(BIN_CODEPAGE),
})
export type BIN_BOOK = bin.Parsed<typeof BIN_BOOK>

export function exportbitmap(bitmap: MAYBE<BITMAP>): MAYBE<BIN_BITMAP> {
  if (!ispresent(bitmap)) {
    return
  }
  return {
    ...bitmap,
    bits: Array.from(bitmap?.bits ?? []),
  }
}

export function importbitmap(bitmap: MAYBE<BIN_BITMAP>): MAYBE<BITMAP> {
  if (!ispresent(bitmap)) {
    return
  }
  return {
    ...bitmap,
    bits: Uint8Array.from(bitmap.bits),
  }
}
