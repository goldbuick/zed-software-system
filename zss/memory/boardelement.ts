import { objectKeys } from 'ts-extras'
import { createsid } from 'zss/mapping/guid'
import { ispresent, MAYBE } from 'zss/mapping/types'

import {
  FORMAT_OBJECT,
  FORMAT_SKIP,
  formatobject,
  unformatobject,
} from './format'
import { BOARD_ELEMENT, WORD } from './types'

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
  return formatobject(boardelement, BOARD_ELEMENT_KEYS, {
    category: FORMAT_SKIP,
    kinddata: FORMAT_SKIP,
    kindcode: FORMAT_SKIP,
    headless: FORMAT_SKIP,
    removed: FORMAT_SKIP,
    inputmove: FORMAT_SKIP,
    inputok: FORMAT_SKIP,
    inputcancel: FORMAT_SKIP,
    inputmenu: FORMAT_SKIP,
    inputalt: FORMAT_SKIP,
    inputctrl: FORMAT_SKIP,
    inputshift: FORMAT_SKIP,
  })
}

// import json into boardelement
export function importboardelement(
  boardelemententry: MAYBE<FORMAT_OBJECT>,
): MAYBE<BOARD_ELEMENT> {
  return unformatobject(boardelemententry, BOARD_ELEMENT_KEYS)
}

export function boardelementreadstat(
  boardelement: MAYBE<BOARD_ELEMENT>,
  key: keyof BOARD_ELEMENT,
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
  key: keyof BOARD_ELEMENT,
  value: WORD,
) {
  if (!ispresent(boardelement)) {
    return
  }
  boardelement[key] = value
}

export function boardelementwritestats(
  boardelement: MAYBE<BOARD_ELEMENT>,
  stats: BOARD_ELEMENT,
) {
  objectKeys(stats).forEach((key) =>
    boardelementwritestat(boardelement, key, stats[key]),
  )
}
