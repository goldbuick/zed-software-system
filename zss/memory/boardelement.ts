import { objectKeys } from 'ts-extras'
import { createsid } from 'zss/mapping/guid'
import { ispresent, MAYBE } from 'zss/mapping/types'

import { BIN_BOARD_ELEMENT } from './binary'
import { BOARD_ELEMENT, BOARD_ELEMENT_STAT, WORD } from './types'
import { exportword, importword } from './word'

export function createboardelement() {
  const boardelement: BOARD_ELEMENT = {
    id: createsid(),
  }
  return boardelement
}

// safe to serialize copy of boardelement
export function exportboardelement(
  boardelement: MAYBE<BOARD_ELEMENT>,
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
    tickertext: boardelement.tickertext,
    tickertime: boardelement.tickertime,
    // common
    p1: exportword(boardelement.p1),
    p2: exportword(boardelement.p2),
    p3: exportword(boardelement.p3),
    cycle: exportword(boardelement.cycle),
    stepx: exportword(boardelement.stepx),
    stepy: exportword(boardelement.stepy),
    sender: exportword(boardelement.sender),
    data: exportword(boardelement.data),
  }
}

// import json into boardelement
export function importboardelement(
  boardelement: MAYBE<BIN_BOARD_ELEMENT>,
): MAYBE<BOARD_ELEMENT> {
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
    tickertext: boardelement.tickertext,
    tickertime: boardelement.tickertime,
    // config
    p1: importword(boardelement.p1) as any,
    p2: importword(boardelement.p2) as any,
    p3: importword(boardelement.p3) as any,
    cycle: importword(boardelement.cycle) as any,
    stepx: importword(boardelement.stepx) as any,
    stepy: importword(boardelement.stepy) as any,
    sender: importword(boardelement.sender) as any,
    data: importword(boardelement.data) as any,
  }
}

export function boardelementreadstat(
  boardelement: MAYBE<BOARD_ELEMENT>,
  key: BOARD_ELEMENT_STAT,
  defaultvalue: WORD,
): WORD {
  if (!ispresent(boardelement)) {
    return
  }
  const value = boardelement[key]
  return value ?? defaultvalue
}

export function boardelementwritestat(
  boardelement: MAYBE<BOARD_ELEMENT>,
  key: BOARD_ELEMENT_STAT,
  value: WORD,
) {
  if (!ispresent(boardelement)) {
    return
  }
  boardelement[key] = value
}

export function boardelementwritestats(
  boardelement: MAYBE<BOARD_ELEMENT>,
  stats: Record<BOARD_ELEMENT_STAT, WORD>,
) {
  objectKeys(stats).forEach((key) =>
    boardelementwritestat(boardelement, key, stats[key]),
  )
}
