/*
what is api? a set of common helper functions to send messages to devices
without having to include device code
*/

import { GADGET_STATE, INPUT } from 'zss/gadget/data/types'
import { ispresent, isstring, MAYBE } from 'zss/mapping/types'

// be careful to keep imports here minimal

export type DEVICELIKE = {
  emit: (target: string, data?: any, player?: string) => void
}

export type MESSAGE = {
  session: string
  id: string
  target: string
  data?: any
  sender: string
  player?: string
}

export function ismessage(value: any): value is MESSAGE {
  return (
    ispresent(value) &&
    typeof value === 'object' &&
    isstring(value.id) &&
    isstring(value.target) &&
    isstring(value.sender)
  )
}

// track which messages go from server -> client
// track which messages go from client -> server

export function api_error(
  device: DEVICELIKE,
  kind: string,
  message: string,
  maybeplayer?: string,
) {
  const player = maybeplayer ?? ''
  device.emit(`error:${kind}`, message, player)
  return tape_error(device, message, player)
}

export function broadcast_startstream(
  device: DEVICELIKE,
  streamkey: string,
  player: string,
) {
  device.emit('broadcast:startstream', streamkey, player)
}

export function broadcast_stopstream(device: DEVICELIKE, player: string) {
  device.emit('broadcast:stopstream', undefined, player)
}

export function chat_connect(
  device: DEVICELIKE,
  channel: string,
  player: string,
) {
  device.emit('chat:connect', channel, player)
}

export function chat_disconnect(device: DEVICELIKE, player: string) {
  device.emit('chat:disconnect', undefined, player)
}

export function gadgetclient_paint(
  device: DEVICELIKE,
  gadgetstate: GADGET_STATE,
  player: string,
) {
  device.emit('gadgetclient:paint', gadgetstate, player)
}

export function gadgetclient_patch(
  device: DEVICELIKE,
  json: any,
  player: string,
) {
  device.emit('gadgetclient:patch', json, player)
}

export function gadgetserver_desync(device: DEVICELIKE, player: string) {
  device.emit('gadgetserver:desync', undefined, player)
}

export function gadgetserver_clearscroll(device: DEVICELIKE, player: string) {
  device.emit('gadgetserver:clearscroll', undefined, player)
}

export function network_fetch(
  device: DEVICELIKE,
  arg: any,
  label: string,
  url: string,
  method: string,
  words: any[],
  player: string,
) {
  device.emit('network:fetch', [arg, label, url, method, words], player)
}

export function network_join(
  device: DEVICELIKE,
  topic: string,
  player: string,
) {
  device.emit('network:join', topic, player)
}

export function network_start(device: DEVICELIKE, player: string) {
  device.emit('network:start', undefined, player)
}

export function network_showjoincode(
  device: DEVICELIKE,
  topic: string,
  player: string,
) {
  device.emit('network:showjoincode', topic, player)
}

export function platform_ready(device: DEVICELIKE) {
  device.emit('ready')
}

export function register_ackbooks(device: DEVICELIKE) {
  device.emit('register:ackbooks', true)
}

export function register_savemem(
  device: DEVICELIKE,
  historylabel: string,
  books: string,
  player: string,
) {
  device.emit('register:savemem', [historylabel, books], player)
}

export function register_dev(device: DEVICELIKE, player: string) {
  device.emit('register:dev', undefined, player)
}

export function register_share(device: DEVICELIKE, player: string) {
  device.emit('register:share', undefined, player)
}

export function register_select(
  device: DEVICELIKE,
  book: string,
  player: string,
) {
  device.emit('register:select', book, player)
}

export function register_restart(device: DEVICELIKE, player: string) {
  device.emit('register:restart', undefined, player)
}

export function register_nuke(device: DEVICELIKE, player: string) {
  device.emit('register:nuke', undefined, player)
}

export function synth_audioenabled(device: DEVICELIKE, player: string) {
  device.emit('synth:audioenabled', undefined, player)
}

export function synth_tts(device: DEVICELIKE, voice: string, phrase: string) {
  device.emit('synth:tts', [voice, phrase])
}

export function synth_play(
  device: DEVICELIKE,
  buffer: string,
  bgplay: boolean,
) {
  device.emit('synth:play', [buffer, bgplay])
}

export function synth_bpm(device: DEVICELIKE, bpm: number) {
  device.emit('synth:bpm', bpm)
}

export function synth_mainvolume(device: DEVICELIKE, volume: number) {
  device.emit('synth:mainvolume', volume)
}

export function synth_drumvolume(device: DEVICELIKE, volume: number) {
  device.emit('synth:drumvolume', volume)
}

export function synth_ttsvolume(device: DEVICELIKE, volume: number) {
  device.emit('synth:ttsvolume', volume)
}

export function synth_voice(
  device: DEVICELIKE,
  idx: number,
  config: number | string,
  value: MAYBE<number | string | number[]>,
) {
  device.emit('synth:voice', [idx, config, value])
}

export function synth_voicefx(
  device: DEVICELIKE,
  idx: number,
  fx: string,
  config: number | string,
  value: MAYBE<number | string>,
) {
  device.emit('synth:voicefx', [idx, fx, config, value])
}

export function tape_info(device: DEVICELIKE, ...message: any[]) {
  device.emit('tape:info', message)
  return true
}

export function tape_debug(device: DEVICELIKE, ...message: any[]) {
  device.emit('tape:debug', message)
  return true
}

// internal only, use api_error
function tape_error(device: DEVICELIKE, ...message: any[]) {
  device.emit('tape:error', message)
  return false
}

export function tape_terminal_open(device: DEVICELIKE, player: string) {
  device.emit('tape:terminal:open', undefined, player)
}

export function tape_terminal_close(device: DEVICELIKE, player: string) {
  device.emit('tape:terminal:close', undefined, player)
}

export function tape_terminal_toggle(device: DEVICELIKE, player: string) {
  device.emit('tape:terminal:toggle', undefined, player)
}

export function tape_terminal_inclayout(
  device: DEVICELIKE,
  inc: boolean,
  player: string,
) {
  device.emit('tape:terminal:inclayout', inc, player)
}

export function tape_crash(device: DEVICELIKE, player: string) {
  device.emit('tape:crash', undefined, player)
}

export function tape_editor_open(
  device: DEVICELIKE,
  book: string,
  page: string,
  type: string,
  title: string,
  player: string,
) {
  device.emit('tape:editor:open', [book, page, type, title], player)
}

export function tape_editor_close(device: DEVICELIKE, player: string) {
  device.emit('tape:editor:close', undefined, player)
}

export function userinput_up(device: DEVICELIKE, input: INPUT, player: string) {
  device.emit('userinput:up', input, player)
}

export function userinput_down(
  device: DEVICELIKE,
  input: INPUT,
  player: string,
) {
  device.emit('userinput:down', input, player)
}

export function vm_operator(device: DEVICELIKE, player: string) {
  device.emit('vm:operator', undefined, player)
}

export function vm_books(
  device: DEVICELIKE,
  books: string,
  select: string,
  player: string,
) {
  device.emit('vm:books', [books, select], player)
}

export function vm_login(device: DEVICELIKE, player: string) {
  device.emit('vm:login', undefined, player)
}

export function vm_logout(device: DEVICELIKE, player: string) {
  device.emit('vm:logout', undefined, player)
}

export function vm_doot(device: DEVICELIKE, player: string) {
  device.emit('vm:doot', undefined, player)
}

export function vm_input(
  device: DEVICELIKE,
  input: INPUT,
  mods: number,
  player: string,
) {
  device.emit('vm:input', [input, mods], player)
}

// odd one out here as this is not a message
export function vm_codeaddress(book: string, codepage: string) {
  return `${book}${codepage}`
}

export function vm_codewatch(
  device: DEVICELIKE,
  book: string,
  codepage: string,
  player: string,
) {
  device.emit('vm:codewatch', [book, codepage], player)
}

export function vm_coderelease(
  device: DEVICELIKE,
  book: string,
  codepage: string,
  player: string,
) {
  device.emit('vm:coderelease', [book, codepage], player)
}

export function vm_cli(device: DEVICELIKE, input: string, player: string) {
  device.emit('vm:cli', input, player)
}

export function vm_flush(device: DEVICELIKE, tag: string, player: string) {
  device.emit('vm:flush', tag, player)
}

export type TEXT_READER = {
  filename: string
  cursor: number
  lines: string[]
}

function createtextreader(filename: string, content: string): TEXT_READER {
  return {
    filename,
    cursor: 0,
    lines: content.split('\n'),
  }
}

export type JSON_READER = {
  filename: string
  json: string
}

function createjsonreader(filename: string, content: any): JSON_READER {
  return {
    filename,
    json: content,
  }
}

export type BINARY_READER = {
  filename: string
  cursor: number
  bytes: Uint8Array
  dataview: DataView
}

export function createbinaryreader(
  filename: string,
  content: Uint8Array,
): BINARY_READER {
  return {
    filename,
    cursor: 0,
    bytes: content,
    dataview: new DataView(content.buffer),
  }
}

export function vm_loader(
  device: DEVICELIKE,
  arg: any,
  format: 'file' | 'text' | 'json' | 'binary',
  filename: string,
  content: any,
  player: string,
) {
  let withcontent: any
  switch (format) {
    case 'file':
      withcontent = content
      break
    case 'text':
      withcontent = createtextreader(filename, content)
      break
    case 'json':
      withcontent = createjsonreader(filename, content)
      break
    case 'binary':
      withcontent = createbinaryreader(filename, content)
      break
  }
  setTimeout(() => {
    device.emit('vm:loader', [arg, format, filename, withcontent], player)
  }, 1)
}
