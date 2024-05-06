/*

what is api? a set of common helper functions to send messages to devices
without having to include device code

*/

import { hub } from 'zss/hub'
import { BOOK } from 'zss/memory/book'

export function tape_log(sender: string, ...message: any[]) {
  hub.emit('tape:log', sender, message)
  return true
}

export function tape_error(sender: string, ...message: any[]) {
  hub.emit('tape:error', sender, message)
  return false
}

export function register_read(sender: string, name: string) {
  hub.emit('register:read', sender, [name])
}

export function register_write(sender: string, name: string, value: any) {
  hub.emit('register:write', sender, [name, value])
}

export function vm_mem(sender: string, book: BOOK) {
  hub.emit('vm:mem', sender, book)
}
