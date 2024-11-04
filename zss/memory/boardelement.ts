import { objectKeys } from 'ts-extras'
import { createsid } from 'zss/mapping/guid'
import { ispresent, MAYBE } from 'zss/mapping/types'

import { FORMAT_OBJECT, formatobject, unformatobject } from './format'
import { BOARD_ELEMENT, BOARD_ELEMENT_STAT, WORD } from './types'
import { exportword, exportwordcustom, importwordcustom } from './word'

export function createboardelement() {
  const boardelement: BOARD_ELEMENT = {
    id: createsid(),
  }
  return boardelement
}

enum BOARD_ELEMENT_KEYS {
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
  pushable,
  collision,
  destructible,
  tickertext,
  tickertime,
  p1,
  p2,
  p3,
  cycle,
  stepx,
  stepy,
  sender,
  data,
}

// safe to serialize copy of boardelement
export function exportboardelement(
  boardelement: MAYBE<BOARD_ELEMENT>,
): MAYBE<FORMAT_OBJECT> {
  if (!ispresent(boardelement)) {
    return
  }
  return formatobject(boardelement, BOARD_ELEMENT_KEYS)
}

// import json into boardelement
export function importboardelement(
  boardelemententry: MAYBE<FORMAT_OBJECT>,
): MAYBE<BOARD_ELEMENT> {
  return unformatobject(boardelemententry, BOARD_ELEMENT_KEYS)
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
