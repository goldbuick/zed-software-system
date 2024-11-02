import { objectKeys } from 'ts-extras'
import { createsid } from 'zss/mapping/guid'
import { ispresent, MAYBE } from 'zss/mapping/types'

import {
  FORMAT_ENTRY,
  formatentrystring,
  formatlist,
  formatentrybyte,
  formatentryint,
  unpackformatlist,
} from './format'
import { BOARD_ELEMENT, BOARD_ELEMENT_STAT, WORD } from './types'
import { exportwordcustom, exportwordentry } from './word'

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
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(boardelement)) {
    return
  }
  return formatlist([
    formatentrystring(BOARD_ELEMENT_KEYS.kind, boardelement.kind),
    formatentrystring(BOARD_ELEMENT_KEYS.id, boardelement.id),
    formatentrybyte(BOARD_ELEMENT_KEYS.x, boardelement.x),
    formatentrybyte(BOARD_ELEMENT_KEYS.y, boardelement.y),
    formatentrybyte(BOARD_ELEMENT_KEYS.lx, boardelement.lx),
    formatentrybyte(BOARD_ELEMENT_KEYS.ly, boardelement.ly),
    formatentrystring(BOARD_ELEMENT_KEYS.code, boardelement.code),
    formatentrystring(BOARD_ELEMENT_KEYS.name, boardelement.name),
    formatentrybyte(BOARD_ELEMENT_KEYS.char, boardelement.char),
    formatentrybyte(BOARD_ELEMENT_KEYS.color, boardelement.color),
    formatentrybyte(BOARD_ELEMENT_KEYS.bg, boardelement.bg),
    formatentrybyte(BOARD_ELEMENT_KEYS.pushable, boardelement.pushable),
    formatentrybyte(BOARD_ELEMENT_KEYS.collision, boardelement.collision),
    formatentrybyte(BOARD_ELEMENT_KEYS.destructible, boardelement.destructible),
    formatentrystring(BOARD_ELEMENT_KEYS.tickertext, boardelement.tickertext),
    formatentryint(BOARD_ELEMENT_KEYS.tickertime, boardelement.tickertime),
    exportwordentry(BOARD_ELEMENT_KEYS.p1, boardelement.p1),
    exportwordentry(BOARD_ELEMENT_KEYS.p2, boardelement.p2),
    exportwordentry(BOARD_ELEMENT_KEYS.p3, boardelement.p3),
    formatentrybyte(BOARD_ELEMENT_KEYS.cycle, boardelement.cycle),
    formatentrybyte(BOARD_ELEMENT_KEYS.stepx, boardelement.stepx),
    formatentrybyte(BOARD_ELEMENT_KEYS.stepy, boardelement.stepy),
    formatentrystring(BOARD_ELEMENT_KEYS.sender, boardelement.sender),
    exportwordentry(BOARD_ELEMENT_KEYS.data, boardelement.data),
    ...exportwordcustom(BOARD_ELEMENT_KEYS, boardelement),
  ])
}

// import json into boardelement
export function importboardelement(
  boardelemententry: MAYBE<FORMAT_ENTRY>,
): MAYBE<BOARD_ELEMENT> {
  const boardelement = unpackformatlist<BOARD_ELEMENT>(
    boardelemententry,
    BOARD_ELEMENT_KEYS,
  )
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
