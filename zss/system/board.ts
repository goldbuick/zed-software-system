import { WORD_VALUE } from './chip'

// generics
export type BOARD_STATS = {
  [key: string]: WORD_VALUE
}

export type BOARD_ELEMENT = {
  // this element has a chip associated with it
  chip?: string
  // this element is an instance of an element type
  kind?: string
  // this is a unique name for this instance
  name?: string
  // display
  char?: number
  color?: number
  bg?: number
  // interaction
  pushable?: number
  collision?: number
  // custom
  stats?: BOARD_STATS
}

export type MAYBE_BOARD_ELEMENT = BOARD_ELEMENT | undefined

export type BOARD_RECT = {
  x: number
  y: number
  width: number
  height: number
}

export type BOARD = BOARD_RECT & {
  // specifics
  terrain: MAYBE_BOARD_ELEMENT[]
  objects: MAYBE_BOARD_ELEMENT[]
  // custom
  stats?: BOARD_STATS
}
