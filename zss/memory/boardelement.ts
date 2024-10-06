import * as bin from 'typed-binary'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { BIN_WORD, BIN_WORD_ENTRY, WORD, exportword, importword } from './word'

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
  // @ts-expect-error special data
  kinddata?: BOARD_ELEMENT
  kindcode?: string
  // @ts-expect-error special data
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
): MAYBE<BIN_BOARD_ELEMENT> {
  if (!ispresent(boardelement)) {
    return
  }
  const skip = [
    'kind',
    // objects only
    'id',
    'x',
    'y',
    'lx',
    'ly',
    'code',
    // this is a unique name for this instance
    'name',
    // display
    'char',
    'color',
    'bg',
    // interaction
    'pushable',
    'collision',
    'destructible',
    // common
    'p1',
    'p2',
    'p3',
    'cycle',
    'stepx',
    'stepy',
    'player',
    'sender',
    'data',
  ]
  const custom = Object.keys(boardelement).filter(
    (key) => skip.includes(key) === false,
  )
  const bincustom = custom.map((name) => ({
    name,
    ...exportword(boardelement[name]),
  })) as BIN_WORD_ENTRY[]
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
    pushable: !!boardelement.pushable,
    collision: boardelement.collision,
    destructible: !!boardelement.destructible,
    // common
    p1: exportword(boardelement.p1),
    p2: exportword(boardelement.p2),
    p3: exportword(boardelement.p3),
    cycle: exportword(boardelement.cycle),
    stepx: exportword(boardelement.stepx),
    stepy: exportword(boardelement.stepy),
    player: exportword(boardelement.player),
    sender: exportword(boardelement.sender),
    data: exportword(boardelement.data),
    // custom
    custom: bincustom,
  }
}

// import json into boardelement
export function importboardelement(
  boardelement: MAYBE<BIN_BOARD_ELEMENT>,
): MAYBE_BOARD_ELEMENT {
  if (!ispresent(boardelement)) {
    return
  }
  const element = {
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
    pushable: boardelement.pushable ? 1 : undefined,
    collision: boardelement.collision,
    destructible: boardelement.destructible ? 1 : undefined,
    // common
    p1: importword(boardelement.p1) as any,
    p2: importword(boardelement.p2) as any,
    p3: importword(boardelement.p3) as any,
    cycle: importword(boardelement.cycle) as any,
    stepx: importword(boardelement.stepx) as any,
    stepy: importword(boardelement.stepy) as any,
    player: importword(boardelement.player) as any,
    sender: importword(boardelement.sender) as any,
    data: importword(boardelement.data) as any,
  }

  boardelement.custom?.forEach((entry) => {
    // @ts-expect-error ahhhhh
    element[entry.name] = entry.value as WORD
  })

  return element
}

export function boardelementreadstat(
  boardelement: MAYBE_BOARD_ELEMENT,
  key: string,
  defaultvalue: WORD,
): WORD {
  if (!ispresent(boardelement)) {
    return
  }
  const value = boardelement[key]
  return value ?? defaultvalue
}

export function boardelementwritestat(
  boardelement: MAYBE_BOARD_ELEMENT,
  key: string,
  value: WORD,
) {
  if (!ispresent(boardelement)) {
    return
  }
  boardelement[key] = value
}

export function boardelementwritestats(
  boardelement: MAYBE_BOARD_ELEMENT,
  stats: Record<string, WORD>,
) {
  Object.entries(stats).forEach(([key, value]) =>
    boardelementwritestat(boardelement, key, value),
  )
}
