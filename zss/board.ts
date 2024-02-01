import { WORD_VALUE } from './chip'
import { range } from './mapping/array'
import { createguid } from './mapping/guid'

// generics
export type BOARD_STATS = {
  [key: string]: WORD_VALUE
}

export type BOARD_ELEMENT = Partial<{
  // objects get id & position
  id: string
  x: number
  y: number
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

export function boardcreateobject(
  board: BOARD,
  x: number,
  y: number,
  withid?: string,
): MAYBE_BOARD_ELEMENT {
  const object = {
    id: withid ?? createguid(),
    x,
    y,
    char: 1,
    color: 15,
    bg: -1,
  }

  // add to board
  board.objects[object.id] = object

  // return object
  return object
}

export function boardreadobject(board: BOARD, id: string): MAYBE_BOARD_ELEMENT {
  return board.objects[id]
}

export function boarddeleteobject(board: BOARD, id: string) {
  if (board.objects[id]) {
    delete board.objects[id]
    return true
  }
  return false
}
