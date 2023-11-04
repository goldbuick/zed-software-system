import { WORD_VALUE } from './chip'

// generics
type BOARD_BUCKET = {
  [key: string]: WORD_VALUE
}

export type BOARD_ELEMENT = BOARD_BUCKET & {
  // instance / lookup info
  id: string
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
}

export type MAYBE_BOARD_ELEMENT = BOARD_ELEMENT | undefined

export type BOARD_RECT = {
  x: number
  y: number
  width: number
  height: number
}

export type BOARD = BOARD_BUCKET &
  BOARD_RECT & {
    // specifics
    id: string
    name: string
    terrain: MAYBE_BOARD_ELEMENT[]
    objects: MAYBE_BOARD_ELEMENT[]
  }
