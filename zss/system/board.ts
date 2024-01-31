import { range } from '../mapping/array'
import { createguid } from '../mapping/guid'

import { WORD_VALUE } from './chip'

// generics
export type BOARD_STATS = {
  [key: string]: WORD_VALUE
}

export type BOARD_ELEMENT = Partial<{
  // objects get id
  id: string
  // this element has a code associated with it
  code: string
  // this element is an instance of an element type
  kind: string
  // this is a unique name for this instance
  name: string
  // display
  char: number
  color: number
  bg: number
  // interaction
  pushable: number
  collision: number
  // custom
  stats: BOARD_STATS
}>

export type MAYBE_BOARD_ELEMENT = BOARD_ELEMENT | undefined

export type BOARD_RECT = {
  x: number
  y: number
  width: number
  height: number
}

export type BOARD = {
  // lookup
  id?: string
  // dimensions
  x: number
  y: number
  width: number
  height: number
  // specifics
  terrain: MAYBE_BOARD_ELEMENT[]
  objects: Record<string, BOARD_ELEMENT>
  // custom
  stats?: BOARD_STATS
}

export function createboard(
  width: number,
  height: number,
  fn?: (board: BOARD) => BOARD,
) {
  const board: BOARD = {
    id: createguid(),
    x: 0,
    y: 0,
    width,
    height,
    terrain: range(width * height - 1).map(() => undefined),
    objects: {},
  }
  return fn ? fn(board) : board
}
