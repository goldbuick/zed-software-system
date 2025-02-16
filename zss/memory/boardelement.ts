import { createsid } from 'zss/mapping/guid'
import { ispresent, MAYBE } from 'zss/mapping/types'
import { isstrcolor, mapstrcolortoattributes, STR_COLOR } from 'zss/words/color'
import { NAME } from 'zss/words/types'

import {
  FORMAT_OBJECT,
  FORMAT_SKIP,
  formatobject,
  unformatobject,
} from './format'
import { BOARD_ELEMENT } from './types'

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
  light,
  player,
  bucket,
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
  arg,
  stopped,
  removed,
}

// safe to serialize copy of boardelement
export function exportboardelement(
  boardelement: MAYBE<BOARD_ELEMENT>,
): MAYBE<FORMAT_OBJECT> {
  if (ispresent(boardelement?.id)) {
    return formatobject(boardelement, BOARD_ELEMENT_KEYS, {
      category: FORMAT_SKIP,
      kinddata: FORMAT_SKIP,
    })
  }
  // terrain
  return formatobject(boardelement, BOARD_ELEMENT_KEYS, {
    id: FORMAT_SKIP,
    x: FORMAT_SKIP,
    y: FORMAT_SKIP,
    lx: FORMAT_SKIP,
    ly: FORMAT_SKIP,
    code: FORMAT_SKIP,
    category: FORMAT_SKIP,
    kinddata: FORMAT_SKIP,
  })
}

// import json into boardelement
export function importboardelement(
  boardelemententry: MAYBE<FORMAT_OBJECT>,
): MAYBE<BOARD_ELEMENT> {
  return unformatobject(boardelemententry, BOARD_ELEMENT_KEYS)
}

export function boardelementisobject(element: MAYBE<BOARD_ELEMENT>) {
  return element?.id?.length ?? 0 > 0
}

export function boardelementapplycolor(
  element: MAYBE<BOARD_ELEMENT>,
  strcolor: STR_COLOR | undefined,
) {
  if (!ispresent(element) || !isstrcolor(strcolor)) {
    return
  }
  const { color, bg } = mapstrcolortoattributes(strcolor)
  if (ispresent(color)) {
    element.color = color
  }
  if (ispresent(bg)) {
    element.bg = bg
  }
}

export function boardelementname(element: MAYBE<BOARD_ELEMENT>) {
  return NAME(element?.name ?? element?.kinddata?.name ?? '')
}
