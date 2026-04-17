import { ptwithin } from 'zss/mapping/2d'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import { memorymoveboardobject } from './boardmovement'
import { memoryreadbookflag } from './bookoperations'
import { memorymoveplayertoboard } from './playermanagement'
import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH, BOOK } from './types'

export function memoryplayerblockedbyedge(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: BOARD_ELEMENT,
  dest: PT,
) {
  const elementid = element.id ?? ''
  if (dest.x < 0) {
    const exit = board?.exitwest
    if (isstring(exit) && exit) {
      return memorymoveplayertoboard(book, elementid, exit, {
        x: BOARD_WIDTH - 1,
        y: dest.y,
      })
    }
  } else if (dest.x >= BOARD_WIDTH) {
    const exit = board?.exiteast
    if (isstring(exit) && exit) {
      return memorymoveplayertoboard(book, elementid, exit, {
        x: 0,
        y: dest.y,
      })
    }
  } else if (dest.y < 0) {
    const exit = board?.exitnorth
    if (isstring(exit) && exit) {
      return memorymoveplayertoboard(book, elementid, exit, {
        x: dest.x,
        y: BOARD_HEIGHT - 1,
      })
    }
  } else if (dest.y >= BOARD_HEIGHT) {
    const exit = board?.exitsouth
    if (isstring(exit) && exit) {
      return memorymoveplayertoboard(book, elementid, exit, {
        x: dest.x,
        y: 0,
      })
    }
  }
  return false
}

export function memoryplayerwaszapped(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  player: string,
) {
  const enterx = memoryreadbookflag(book, player, 'enterx')
  const entery = memoryreadbookflag(book, player, 'entery')
  if (isnumber(enterx) && isnumber(entery) && ispresent(element)) {
    memorymoveboardobject(board, element, { x: enterx, y: entery })
  }
}

export function memoryptwithinboard(pt: PT) {
  return ptwithin(pt.x, pt.y, 0, BOARD_WIDTH - 1, BOARD_HEIGHT - 1, 0)
}
