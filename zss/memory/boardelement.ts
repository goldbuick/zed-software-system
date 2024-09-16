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

// simple built-ins go here
export type BOARD_ELEMENT_STATS = {
  p1?: string
  p2?: string
  p3?: string
  cycle?: number
  stepx?: number
  stepy?: number
  sender?: string
  data?: any
  [key: string]: WORD
}

export type MAYBE_BOARD_ELEMENT_STATS = MAYBE<BOARD_ELEMENT_STATS>

export function createboardelementstats() {
  return {}
}

const BIN_BOARD_ELEMENT_STATS = bin.object({
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
type BIN_BOARD_ELEMENT_STATS = bin.Parsed<typeof BIN_BOARD_ELEMENT_STATS>

// safe to serialize copy of board
export function exportboardelementstats(
  boardelementstats: MAYBE_BOARD_ELEMENT_STATS,
): MAYBE<BIN_BOARD_ELEMENT_STATS> {
  if (!ispresent(boardelementstats)) {
    return
  }
  const skip = [
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
  const custom = Object.keys(boardelementstats).filter(
    (key) => skip.includes(key) === false,
  )
  const bincustom = custom.map((name) => ({
    name,
    ...exportword(boardelementstats[name]),
  })) as BIN_WORD_ENTRY[]

  return {
    p1: exportword(boardelementstats.p1),
    p2: exportword(boardelementstats.p2),
    p3: exportword(boardelementstats.p3),
    cycle: exportword(boardelementstats.cycle),
    stepx: exportword(boardelementstats.stepx),
    stepy: exportword(boardelementstats.stepy),
    player: exportword(boardelementstats.player),
    sender: exportword(boardelementstats.sender),
    data: exportword(boardelementstats.data),
    custom: bincustom,
  }
}

// import json into board
export function importboardelementstats(
  boardelementstats: MAYBE<BIN_BOARD_ELEMENT_STATS>,
): MAYBE_BOARD_ELEMENT_STATS {
  if (!ispresent(boardelementstats)) {
    return
  }
  const stats: BOARD_ELEMENT_STATS = {
    p1: importword(boardelementstats.p1) as any,
    p2: importword(boardelementstats.p2) as any,
    p3: importword(boardelementstats.p3) as any,
    cycle: importword(boardelementstats.cycle) as any,
    stepx: importword(boardelementstats.stepx) as any,
    stepy: importword(boardelementstats.stepy) as any,
    player: importword(boardelementstats.player) as any,
    sender: importword(boardelementstats.sender) as any,
    data: importword(boardelementstats.data) as any,
  }
  boardelementstats.custom?.forEach((entry) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    stats[entry.name] = entry.value as any
  })
  return stats
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
  // custom
  stats: bin.optional(BIN_BOARD_ELEMENT_STATS),
})
type BIN_BOARD_ELEMENT = bin.Parsed<typeof BIN_BOARD_ELEMENT>

// safe to serialize copy of boardelement
export function exportboardelement(
  boardelement: MAYBE_BOARD_ELEMENT,
): MAYBE<BIN_BOARD_ELEMENT> {
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
    pushable: !!boardelement.pushable,
    collision: boardelement.collision,
    destructible: !!boardelement.destructible,
    // custom
    stats: exportboardelementstats(boardelement.stats),
  }
}

// import json into boardelement
export function importboardelement(
  boardelement: MAYBE<BIN_BOARD_ELEMENT>,
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
    pushable: boardelement.pushable ? 1 : undefined,
    collision: boardelement.collision,
    destructible: boardelement.destructible ? 1 : undefined,
    // custom
    stats: importboardelementstats(boardelement.stats),
  }
}

export function boardelementreadstat(
  boardelement: MAYBE_BOARD_ELEMENT,
  key: string,
  defaultvalue: WORD,
): WORD {
  if (!ispresent(boardelement)) {
    return
  }
  boardelement.stats = boardelement.stats ?? createboardelementstats()
  const value = boardelement.stats[key]
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
