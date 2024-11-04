import { objectKeys } from 'ts-extras'
import { createsid } from 'zss/mapping/guid'
import { ispresent, MAYBE } from 'zss/mapping/types'

import {
  FORMAT_ENTRY,
  FORMAT_KEY,
  formatlist,
  formatnumber,
  formatstring,
  unpackformatlist,
} from './format'
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
  key?: FORMAT_KEY,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(boardelement)) {
    return
  }
  return formatlist(
    [
      formatstring(boardelement.kind, BOARD_ELEMENT_KEYS.kind),
      formatstring(boardelement.id, BOARD_ELEMENT_KEYS.id),
      formatnumber(boardelement.x, BOARD_ELEMENT_KEYS.x),
      formatnumber(boardelement.y, BOARD_ELEMENT_KEYS.y),
      formatnumber(boardelement.lx, BOARD_ELEMENT_KEYS.lx),
      formatnumber(boardelement.ly, BOARD_ELEMENT_KEYS.ly),
      formatstring(boardelement.code, BOARD_ELEMENT_KEYS.code),
      formatstring(boardelement.name, BOARD_ELEMENT_KEYS.name),
      formatnumber(boardelement.char, BOARD_ELEMENT_KEYS.char),
      formatnumber(boardelement.color, BOARD_ELEMENT_KEYS.color),
      formatnumber(boardelement.bg, BOARD_ELEMENT_KEYS.bg),
      formatnumber(boardelement.pushable, BOARD_ELEMENT_KEYS.pushable),
      formatnumber(boardelement.collision, BOARD_ELEMENT_KEYS.collision),
      formatnumber(boardelement.destructible, BOARD_ELEMENT_KEYS.destructible),
      formatstring(boardelement.tickertext, BOARD_ELEMENT_KEYS.tickertext),
      formatnumber(boardelement.tickertime, BOARD_ELEMENT_KEYS.tickertime),
      exportword(boardelement.p1, BOARD_ELEMENT_KEYS.p1),
      exportword(boardelement.p2, BOARD_ELEMENT_KEYS.p2),
      exportword(boardelement.p3, BOARD_ELEMENT_KEYS.p3),
      formatnumber(boardelement.cycle, BOARD_ELEMENT_KEYS.cycle),
      formatnumber(boardelement.stepx, BOARD_ELEMENT_KEYS.stepx),
      formatnumber(boardelement.stepy, BOARD_ELEMENT_KEYS.stepy),
      formatstring(boardelement.sender, BOARD_ELEMENT_KEYS.sender),
      exportword(boardelement.data, BOARD_ELEMENT_KEYS.data),
      ...exportwordcustom(boardelement, BOARD_ELEMENT_KEYS),
    ],
    key,
  )
}

// import json into boardelement
export function importboardelement(
  boardelemententry: MAYBE<FORMAT_ENTRY>,
): MAYBE<BOARD_ELEMENT> {
  const boardelement = unpackformatlist<BOARD_ELEMENT>(
    boardelemententry,
    BOARD_ELEMENT_KEYS,
  )
  importwordcustom(boardelement, BOARD_ELEMENT_KEYS)
  return boardelement
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
