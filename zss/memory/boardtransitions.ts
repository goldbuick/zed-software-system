import { vmplayermovetoboard } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ptwithin } from 'zss/mapping/2d'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import { memorymoveboardobject } from './boardmovement'
import { memoryreadboardbyaddress } from './boards'
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
    const destboard = memoryreadboardbyaddress(board?.exitwest ?? '')
    if (ispresent(destboard)) {
      vmplayermovetoboard(SOFTWARE, elementid, elementid, destboard.id, {
        x: BOARD_WIDTH - 1,
        y: dest.y,
      })
      return true
      // return memorymoveplayertoboard(book, elementid, destboard.id, {
      //   x: BOARD_WIDTH - 1,
      //   y: dest.y,
      // })
    }
  } else if (dest.x >= BOARD_WIDTH) {
    const destboard = memoryreadboardbyaddress(board?.exiteast ?? '')
    if (ispresent(destboard)) {
      vmplayermovetoboard(SOFTWARE, elementid, elementid, destboard.id, {
        x: 0,
        y: dest.y,
      })
      return true
      // return memorymoveplayertoboard(book, elementid, destboard.id, {
      //   x: 0,
      //   y: dest.y,
      // })
    }
  } else if (dest.y < 0) {
    const destboard = memoryreadboardbyaddress(board?.exitnorth ?? '')
    if (ispresent(destboard)) {
      vmplayermovetoboard(SOFTWARE, elementid, elementid, destboard.id, {
        x: dest.x,
        y: BOARD_HEIGHT - 1,
      })
      return true
      // return memorymoveplayertoboard(book, elementid, destboard.id, {
      //   x: dest.x,
      //   y: BOARD_HEIGHT - 1,
      // })
    }
  } else if (dest.y >= BOARD_HEIGHT) {
    const destboard = memoryreadboardbyaddress(board?.exitsouth ?? '')
    if (ispresent(destboard)) {
      vmplayermovetoboard(SOFTWARE, elementid, elementid, destboard.id, {
        x: dest.x,
        y: 0,
      })
      return true
      // return memorymoveplayertoboard(book, elementid, destboard.id, {
      //   x: dest.x,
      //   y: 0,
      // })
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
