import {
  FORMAT_OBJECT,
  FORMAT_SKIP,
  formatobject,
  unformatobject,
} from 'zss/feature/format'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { STR_COLOR, isstrcolor, mapstrcolortoattributes } from 'zss/words/color'
import { CATEGORY } from 'zss/words/types'

import {
  memoryensureboardelementruntime,
  memoryreadboardelementruntime,
} from './runtimeboundary'
import { BOARD_ELEMENT, BOARD_ELEMENT_KEYS } from './types'

export function memoryapplyboardelementcolor(
  element: MAYBE<BOARD_ELEMENT>,
  strcolor: MAYBE<STR_COLOR>,
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

export function memoryexportboardelement(
  boardelement: MAYBE<BOARD_ELEMENT>,
): MAYBE<FORMAT_OBJECT> {
  if (ispresent(boardelement?.id)) {
    return formatobject(boardelement, BOARD_ELEMENT_KEYS, {
      runtime: FORMAT_SKIP,
      stopped: FORMAT_SKIP,
      removed: FORMAT_SKIP,
      bucket: FORMAT_SKIP,
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
    runtime: FORMAT_SKIP,
    stopped: FORMAT_SKIP,
    removed: FORMAT_SKIP,
    bucket: FORMAT_SKIP,
  })
}

export function memoryimportboardelement(
  boardelemententry: MAYBE<FORMAT_OBJECT>,
): MAYBE<BOARD_ELEMENT> {
  const element = unformatobject<BOARD_ELEMENT>(
    boardelemententry,
    BOARD_ELEMENT_KEYS,
  )
  if (!ispresent(element)) {
    return undefined
  }
  memoryensureboardelementruntime(element)
  return element
}

export function memoryboardelementisobject(
  element: MAYBE<BOARD_ELEMENT>,
): boolean {
  return memoryreadboardelementruntime(element)?.category === CATEGORY.ISOBJECT
}

export function memorycreateboardelement() {
  const boardelement: BOARD_ELEMENT = {
    id: createsid(),
    runtime: '',
  }
  memoryensureboardelementruntime(boardelement)
  return boardelement
}
