/*

what is api? a set of common helper functions to send messages to devices
without having to include device code

*/

import { INPUT } from 'zss/gadget/data/types'
import { hub } from 'zss/hub'
import { BOOK } from 'zss/memory/book'

export function api_error(sender: string, message: string, player: string) {
  hub.emit('error', sender, message, player)
  return tape_error(sender, [message, player])
}

export function tape_log(sender: string, ...message: any[]) {
  hub.emit('tape:log', sender, message)
  return true
}

// internal only, use api_error
function tape_error(sender: string, ...message: any[]) {
  hub.emit('tape:error', sender, message)
  return false
}

export function register_read(sender: string, name: string) {
  hub.emit('register:read', sender, [name])
}

export function register_write(sender: string, name: string, value: any) {
  hub.emit('register:write', sender, [name, value])
}

export function vm_mem(sender: string, book: BOOK, player: string) {
  hub.emit('vm:mem', sender, book, player)
}

export function vm_login(sender: string, player: string) {
  hub.emit('vm:login', sender, undefined, player)
}

export function vm_doot(sender: string, player: string) {
  hub.emit('vm:doot', sender, undefined, player)
}

export function vm_input(
  sender: string,
  input: INPUT,
  mods: Record<INPUT, number>,
  player: string,
) {
  hub.emit('vm:input', sender, [input, mods], player)
}
