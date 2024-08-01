/*
what is api? a set of common helper functions to send messages to devices
without having to include device code
*/

import { GADGET_STATE, INPUT } from 'zss/gadget/data/types'
import { hub } from 'zss/hub'

// be careful to keep imports here minimal

export function api_error(
  sender: string,
  kind: string,
  message: string,
  maybeplayer?: string,
) {
  const player = maybeplayer ?? ''
  hub.emit(`error:${kind}`, sender, message, player)
  return tape_error(sender, message, player)
}

export function bip_retry(sender: string, player: string) {
  hub.emit('bip:retry', sender, undefined, player)
}

export function bip_loginfailed(sender: string, player: string) {
  hub.emit('bip:loginfailed', sender, undefined, player)
}

export function bip_rebootfailed(sender: string, player: string) {
  hub.emit('bip:rebootfailed', sender, undefined, player)
}

export function gadgetclient_reset(
  sender: string,
  gadgetstate: GADGET_STATE,
  player: string,
) {
  hub.emit('gadgetclient:reset', sender, gadgetstate, player)
}

export function gadgetclient_patch(sender: string, json: any, player: string) {
  hub.emit('gadgetclient:patch', sender, json, player)
}

export function gadgetserver_desync(sender: string, player: string) {
  hub.emit('gadgetserver:desync', sender, undefined, player)
}

export function gadgetserver_clearscroll(sender: string, player: string) {
  hub.emit('gadgetserver:clearscroll', sender, undefined, player)
}

export function pcspeaker_play(
  sender: string,
  priority: number,
  buffer: string,
) {
  hub.emit('pcspeaker:play', sender, [priority, buffer])
}

export function register_reboot(sender: string, player: string) {
  hub.emit('register:reboot', sender, undefined, player)
}

export function register_flush(sender: string, books: any[]) {
  hub.emit('register:flush', sender, books)
}

export function register_biosflash(sender: string) {
  hub.emit('register:biosflash', sender)
}

export function register_bioserase(sender: string) {
  hub.emit('register:bioserase', sender)
}

export function tape_info(sender: string, ...message: any[]) {
  hub.emit('tape:info', sender, message)
  return true
}

export function tape_debug(sender: string, ...message: any[]) {
  hub.emit('tape:debug', sender, message)
  return true
}

// internal only, use api_error
function tape_error(sender: string, ...message: any[]) {
  hub.emit('tape:error', sender, message)
  return false
}

export function tape_terminal_open(sender: string) {
  hub.emit('tape:terminal:open', sender)
}

export function tape_terminal_close(sender: string) {
  hub.emit('tape:terminal:close', sender)
}

export function tape_terminal_inclayout(sender: string, inc: number) {
  hub.emit('tape:terminal:inclayout', sender, inc)
}

export function tape_crash(sender: string) {
  hub.emit('tape:crash', sender)
}

export function tape_editor_open(
  sender: string,
  book: string,
  page: string,
  type: string,
  title: string,
  player: string,
) {
  hub.emit('tape:editor:open', sender, [book, page, type, title], player)
}

export function tape_editor_close(sender: string) {
  hub.emit('tape:editor:close', sender)
}

export function vm_books(sender: string, books: any[], player: string) {
  hub.emit('vm:books', sender, books, player)
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

export function vm_codeaddress(book: string, codepage: string) {
  return `${book}${codepage}`
}

export function vm_codewatch(
  sender: string,
  book: string,
  codepage: string,
  player: string,
) {
  hub.emit('vm:codewatch', sender, [book, codepage], player)
}

export function vm_coderelease(
  sender: string,
  book: string,
  codepage: string,
  player: string,
) {
  hub.emit('vm:coderelease', sender, [book, codepage], player)
}

export function vm_cli(sender: string, input: string, player: string) {
  hub.emit('vm:cli', sender, input, player)
}

export function vm_flush(sender: string) {
  hub.emit('vm:flush', sender)
}
