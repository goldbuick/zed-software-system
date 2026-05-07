import {
  FORMAT_OBJECT,
  FORMAT_SKIP,
  formatobject,
  unformatobject,
} from 'zss/feature/format'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { STR_COLOR, isstrcolor, mapstrcolortoattributes } from 'zss/words/color'
import { CATEGORY, COLLISION } from 'zss/words/types'

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

export function memoryexportboardelementasjson(
  boardelement: MAYBE<BOARD_ELEMENT>,
): any {
  if (!ispresent(boardelement)) {
    return undefined
  }
  if (ispresent(boardelement.id)) {
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
      displaychar: boardelement.displaychar,
      displaycolor: boardelement.displaycolor,
      displaybg: boardelement.displaybg,
      displayname: boardelement.displayname,
      light: boardelement.light,
      lightdir: boardelement.lightdir,
      // interaction
      item: boardelement.item,
      group: boardelement.group,
      party: boardelement.party,
      player: boardelement.player,
      pushable: boardelement.pushable,
      collision: boardelement.collision,
      breakable: boardelement.breakable,
      tickertext: boardelement.tickertext,
      tickertime: boardelement.tickertime,
      // config
      p1: boardelement.p1,
      p2: boardelement.p2,
      p3: boardelement.p3,
      p4: boardelement.p4,
      p5: boardelement.p5,
      p6: boardelement.p6,
      p7: boardelement.p7,
      p8: boardelement.p8,
      p9: boardelement.p9,
      p10: boardelement.p10,
      cycle: boardelement.cycle,
      stepx: boardelement.stepx,
      stepy: boardelement.stepy,
      shootx: boardelement.shootx,
      shooty: boardelement.shooty,
      didfail: boardelement.didfail,
      // messages
      sender: boardelement.sender,
      arg: boardelement.arg,
      // cleanup
      removed: boardelement.removed,
    }
  }
  return {
    // this element is an instance of an element type
    kind: boardelement.kind,
    // display
    char: boardelement.char,
    color: boardelement.color,
    bg: boardelement.bg,
    displaychar: boardelement.displaychar,
    displaycolor: boardelement.displaycolor,
    displaybg: boardelement.displaybg,
    displayname: boardelement.displayname,
    // interaction
    item: boardelement.item,
    group: boardelement.group,
    party: boardelement.party,
    pushable: boardelement.pushable,
    collision: boardelement.collision,
    breakable: boardelement.breakable,
  }
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
