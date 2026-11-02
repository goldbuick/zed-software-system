import { memorytrycontentdestination } from 'zss/feature/contenturlflow'
import { memorytryjoindestination } from 'zss/feature/joinurlflow'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import { memorymoveboardobject } from './boardmovement'
import { memoryreadboardbyaddress } from './boards'
import { memoryreadflag } from './bookoperations'
import { memorymoveplayertoboard } from './playermanagement'
import { memoryreadmainbook } from './session'
import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH, BOOK } from './types'

function memorytryexitaddress(
  elementid: string,
  address: string,
  destpt: PT,
  pushdir: PT,
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
  const mainbook = memoryreadmainbook()
  if (!ispresent(mainbook)) {
    return false
  }
  memorymoveplayertoboard(mainbook, elementid, destboard.id, destpt, pushdir)
  return true
}

export function memoryplayerblockedbyedge(
  board: MAYBE<BOARD>,
  element: BOARD_ELEMENT,
  dest: PT,
) {
  const elementid = element.id ?? ''
  if (dest.x < 0) {
    return memorytryexitaddress(
      elementid,
      board?.exitwest ?? '',
      {
        x: BOARD_WIDTH - 1,
        y: dest.y,
      },
      { x: -1, y: 0 },
    )
  }
  if (dest.x >= BOARD_WIDTH) {
    return memorytryexitaddress(
      elementid,
      board?.exiteast ?? '',
      {
        x: 0,
        y: dest.y,
      },
      { x: 1, y: 0 },
    )
  }
  if (dest.y < 0) {
    return memorytryexitaddress(
      elementid,
      board?.exitnorth ?? '',
      {
        x: dest.x,
        y: BOARD_HEIGHT - 1,
      },
      { x: 0, y: -1 },
    )
  }
  if (dest.y >= BOARD_HEIGHT) {
    return memorytryexitaddress(
      elementid,
      board?.exitsouth ?? '',
      {
        x: dest.x,
        y: 0,
      },
      { x: 0, y: 1 },
    )
  }
  return false
}

export function memoryplayerwaszapped(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  player: string,
) {
  const enterx = memoryreadflag(book, player, 'enterx')
  const entery = memoryreadflag(book, player, 'entery')
  if (isnumber(enterx) && isnumber(entery) && ispresent(element)) {
    memorymoveboardobject(board, element, { x: enterx, y: entery })
  }
}
