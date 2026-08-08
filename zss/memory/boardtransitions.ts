import { memorytrycontentdestination } from 'zss/feature/contenturlflow'
import { memorytryjoindestination } from 'zss/feature/joinurlflow'
import { ptwithin } from 'zss/mapping/2d'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import { memorymoveboardobject } from './boardmovement'
import { memoryreadboardbyaddress } from './boards'
import { memoryreadbookflag } from './bookoperations'
import { memorymoveplayertoboard } from './playermanagement'
import { memoryreadbookbysoftware } from './session'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  MEMORY_LABEL,
} from './types'

function memorytryexitaddress(
  elementid: string,
  address: string,
  destpt: PT,
): boolean {
  if (memorytryjoindestination(elementid, address)) {
    return true
  }
  if (memorytrycontentdestination(elementid, address)) {
    return true
  }
  const destboard = memoryreadboardbyaddress(address)
  if (!ispresent(destboard)) {
    return false
  }
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return false
  }
  memorymoveplayertoboard(mainbook, elementid, destboard.id, destpt)
  return true
}

export function memoryplayerblockedbyedge(
  board: MAYBE<BOARD>,
  element: BOARD_ELEMENT,
  dest: PT,
) {
  const elementid = element.id ?? ''
  if (dest.x < 0) {
    return memorytryexitaddress(elementid, board?.exitwest ?? '', {
      x: BOARD_WIDTH - 1,
      y: dest.y,
    })
  }
  if (dest.x >= BOARD_WIDTH) {
    return memorytryexitaddress(elementid, board?.exiteast ?? '', {
      x: 0,
      y: dest.y,
    })
  }
  if (dest.y < 0) {
    return memorytryexitaddress(elementid, board?.exitnorth ?? '', {
      x: dest.x,
      y: BOARD_HEIGHT - 1,
    })
  }
  if (dest.y >= BOARD_HEIGHT) {
    return memorytryexitaddress(elementid, board?.exitsouth ?? '', {
      x: dest.x,
      y: 0,
    })
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
