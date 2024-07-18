import { CATEGORY, COLLISION, WORD } from 'zss/firmware/wordtypes'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, deepcopy, ispresent } from 'zss/mapping/types'

// simple built-ins go here
export type BOARD_ELEMENT_STATS = {
  cycle?: number
  stepx?: number
  stepy?: number
  player?: string
  sender?: string
  inputmove?: string[]
  inputalt?: number
  inputctrl?: number
  inputshift?: number
  inputok?: number
  inputcancel?: number
  inputmenu?: number
  data?: any
  [key: string]: WORD
}

export type MAYBE_BOARD_ELEMENT_STATS = MAYBE<BOARD_ELEMENT_STATS>

export function createboardelementstats() {
  return {}
}

// safe to serialize copy of board
export function exportboardelementstats(
  boardelementstats: MAYBE_BOARD_ELEMENT_STATS,
): MAYBE_BOARD_ELEMENT_STATS {
  if (!ispresent(boardelementstats)) {
    return
  }
  return deepcopy(boardelementstats)
}

// import json into board
export function importboardelementstats(
  boardelementstats: MAYBE_BOARD_ELEMENT_STATS,
): MAYBE_BOARD_ELEMENT_STATS {
  if (!ispresent(boardelementstats)) {
    return
  }
  return deepcopy(boardelementstats)
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
  // custom
  stats?: BOARD_ELEMENT_STATS
  // runtime
  category?: CATEGORY
  kinddata?: BOARD_ELEMENT
  kindcode?: string
  headless?: boolean
  removed?: number
}

export type MAYBE_BOARD_ELEMENT = MAYBE<BOARD_ELEMENT>

export function createboardelement() {
  const boardelement: BOARD_ELEMENT = {
    id: createsid(),
  }
  return boardelement
}

// safe to serialize copy of boardelement
export function exportboardelement(
  boardelement: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (!ispresent(boardelement)) {
    return
  }
  return {
    // this element is an instance of an element type
    kind: boardelement.kind,
    // objects only
    id: boardelement.id,
    x: boardelement.x,
    y: boardelement.y,
    lx: boardelement.lx,
    ly: boardelement.ly,
    code: boardelement.code,
    // this is a unique name for this instance
    name: boardelement.name,
    // display
    char: boardelement.char,
    color: boardelement.color,
    bg: boardelement.bg,
    // interaction
    pushable: boardelement.pushable,
    collision: boardelement.collision,
    destructible: boardelement.destructible,
    // custom
    stats: exportboardelementstats(boardelement.stats),
  }
}

// import json into boardelement
export function importboardelement(
  boardelement: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (!ispresent(boardelement)) {
    return
  }
  return {
    // this element is an instance of an element type
    kind: boardelement.kind,
    // objects only
    id: boardelement.id,
    x: boardelement.x,
    y: boardelement.y,
    lx: boardelement.lx,
    ly: boardelement.ly,
    code: boardelement.code,
    // this is a unique name for this instance
    name: boardelement.name,
    // display
    char: boardelement.char,
    color: boardelement.color,
    bg: boardelement.bg,
    // interaction
    pushable: boardelement.pushable,
    collision: boardelement.collision,
    destructible: boardelement.destructible,
    // custom
    stats: importboardelementstats(boardelement.stats),
  }
}

export function boardelementwritestat(
  boardelement: MAYBE_BOARD_ELEMENT,
  key: string,
  value: WORD,
) {
  if (!ispresent(boardelement)) {
    return
  }
  boardelement.stats = boardelement.stats ?? createboardelementstats()
  boardelement.stats[key] = value
}

export function boardelementwritestats(
  boardelement: MAYBE_BOARD_ELEMENT,
  stats: Record<string, WORD>,
) {
  Object.entries(stats).forEach(([key, value]) =>
    boardelementwritestat(boardelement, key, value),
  )
}
