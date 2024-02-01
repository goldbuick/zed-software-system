/*

what is system memory ?
this is an active sim state + API to change said state

*/
import { proxy } from 'valtio'

import { BIOS } from './bios'
import { boardcreateobject, boarddeleteobject } from './board'
import { readaddress } from './book'
import { CONTENT_TYPE } from './codepage'

// sim state
const VM_MEMORY = proxy({
  book: BIOS, // starting software to run
  flags: {} as Record<string, any>, // global flags by player
  players: {} as Record<string, string>, // map of player to board
})

export function vmplayerlogin(player: string) {
  const title = vmreadboard('app:title')
  const playerkind = vmreadobject('app:player')
  if (title && playerkind) {
    boardcreateobject(title, 0, 0, player)
  }
}

export function vmplayerlogout(player: string) {
  const board = vmplayerreadboard(player)
  if (board) {
    boarddeleteobject(board, player)
  }
}

function vmplayercheckflags(player: string) {
  if (!VM_MEMORY.flags[player]) {
    VM_MEMORY.flags[player] = {}
  }
}

export function vmplayerreadflag(player: string, flag: string) {
  vmplayercheckflags(player)
  return VM_MEMORY.flags[player][flag]
}

export function vmplayersetflag(player: string, flag: string, value: any) {
  vmplayercheckflags(player)
  VM_MEMORY.flags[player][flag] = value
}

export function vmreadboard(address: string) {
  return readaddress(VM_MEMORY.book, CONTENT_TYPE.BOARD, address)
}

export function vmplayerreadboard(player: string) {
  return vmreadboard(VM_MEMORY.players[player] ?? '')
}

export function vmreadobject(address: string) {
  return readaddress(VM_MEMORY.book, CONTENT_TYPE.OBJECT, address)
}
