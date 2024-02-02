import { isDefined } from 'ts-extras'
import { proxy } from 'valtio'

import { BIOS } from './bios'
import { BOARD, boardcreateobject, boarddeleteobject, boardtick } from './board'
import { readaddress } from './book'
import { CONTENT_TYPE } from './codepage'

// sim state
const MEMORY = proxy({
  book: BIOS, // starting software to run
  flags: {} as Record<string, any>, // global flags by player
  players: {} as Record<string, string>, // map of player to board
})

const PLAYER_KIND = 'app:player'
const PLAYER_START = 'app:title'

export function memoryplayerlogin(player: string) {
  const title = memoryreadboard(PLAYER_START)
  const playerkind = memoryreadobject(PLAYER_KIND)
  if (title && playerkind) {
    const obj = boardcreateobject(title, {
      id: player,
      x: 0,
      y: 0,
      kind: PLAYER_KIND,
    })
    if (obj && obj.id) {
      MEMORY.players[player] = obj.id
    }
  }
}

export function memoryplayerlogout(player: string) {
  const board = memoryplayerreadboard(player)
  if (board) {
    boarddeleteobject(board, player)
  }
}

function memoryplayercheckflags(player: string) {
  if (!MEMORY.flags[player]) {
    MEMORY.flags[player] = {}
  }
}

export function memoryplayerreadflag(player: string, flag: string) {
  memoryplayercheckflags(player)
  return MEMORY.flags[player][flag]
}

export function memoryplayersetflag(player: string, flag: string, value: any) {
  memoryplayercheckflags(player)
  MEMORY.flags[player][flag] = value
}

export function memoryplayerreadboard(player: string) {
  return memoryreadboard(MEMORY.players[player] ?? '')
}

export function memoryplayersetboard(player: string, board: string) {
  if (memoryreadboard(board)) {
    MEMORY.players[player] = board
  }
}

export function memoryreadboard(address: string) {
  return readaddress(MEMORY.book, CONTENT_TYPE.BOARD, address)
}

export function memoryreadobject(address: string) {
  return readaddress(MEMORY.book, CONTENT_TYPE.OBJECT, address)
}

export function memorytick() {
  // get a list of active boards
  const r = [...new Set(Object.values(MEMORY.players))]
    .map((address) => memoryreadboard(address))
    .filter(isDefined)
    .forEach(boardtick)
}
