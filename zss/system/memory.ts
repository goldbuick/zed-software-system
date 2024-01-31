/*

what is system memory ?
this is an active sim state + API to change said state

*/
import { proxy } from 'valtio'
import { readaddress, readboard, readobject } from 'zss/system/book'

import { BIOS } from './bios'

// sim state
const VM_MEMORY = proxy({
  book: BIOS, // starting software to run
  flags: {} as Record<string, any>, // global flags by player
  players: {} as Record<string, string>, // map of player to board
})

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
  const [pagename, entryname] = readaddress(address)
  return readboard(VM_MEMORY.book, pagename, entryname)
}

export function vmplayerreadboard(player: string) {
  return vmreadboard(VM_MEMORY.players[player] ?? '')
}

export function vmreadobject(address: string) {
  const [pagename, entryname] = readaddress(address)
  return readobject(VM_MEMORY.book, pagename, entryname)
}
