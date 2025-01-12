/*
what is api? a set of common helper functions to send messages to devices
without having to include device code
*/

import { GADGET_STATE, INPUT } from 'zss/gadget/data/types'
import { MAYBE } from 'zss/mapping/types'

// be careful to keep imports here minimal

type DEVICELIKE = {
  emit: (target: string, data?: any, player?: string) => void
}

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

export function gadgetclient_reset(
  device: DEVICELIKE,
  gadgetstate: GADGET_STATE,
  player: string,
) {
  device.emit('gadgetclient:reset', gadgetstate, player)
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

export function gadgetserver_clearplayer(device: DEVICELIKE, player: string) {
  device.emit('gadgetserver:clearplayer', undefined, player)
}

export function peer_create(
  device: DEVICELIKE,
  joinid: string,
  player: string,
) {
  device.emit('peer:create', joinid, player)
}

export function peer_joincode(device: DEVICELIKE, player: string) {
  device.emit('peer:joincode', undefined, player)
}

export function peer_open(device: DEVICELIKE, player: string) {
  device.emit('peer:open', undefined, player)
}

export function peer_close(device: DEVICELIKE, player: string) {
  device.emit('peer:close', undefined, player)
}

export function peer_disconnected(device: DEVICELIKE, player: string) {
  device.emit('peer:disconnected', undefined, player)
}

export function platform_ready(device: DEVICELIKE) {
  device.emit('ready', '')
}

export function register_ackbooks(device: DEVICELIKE, player: string) {
  device.emit('register:ackbooks', true, player)
}

export function register_flush(
  device: DEVICELIKE,
  historylabel: string,
  books: string,
  player: string,
) {
  device.emit('register:flush', [historylabel, books], player)
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

export function register_nuke(device: DEVICELIKE, player: string) {
  device.emit('register:nuke', undefined, player)
}

export function synth_audioenabled(device: DEVICELIKE) {
  device.emit('synth:audioenabled', undefined)
}

export function synth_tts(device: DEVICELIKE, voice: string, phrase: string) {
  device.emit('synth:tts', [voice, phrase])
}

export function synth_play(
  device: DEVICELIKE,
  priority: number,
  buffer: string,
) {
  device.emit('synth:play', [priority, buffer])
}

export function synth_mainvolume(
  device: DEVICELIKE,
  volume: number,
  player: string,
) {
  device.emit('synth:mainvolume', volume, player)
}

export function synth_drumvolume(
  device: DEVICELIKE,
  volume: number,
  player: string,
) {
  device.emit('synth:drumvolume', volume, player)
}

export function synth_ttsvolume(
  device: DEVICELIKE,
  volume: number,
  player: string,
) {
  device.emit('synth:ttsvolume', volume, player)
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

export function userinput_update(device: DEVICELIKE, player: string) {
  device.emit('userinput:update', undefined, player)
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

export function vm_endgame(device: DEVICELIKE, player: string) {
  device.emit('vm:endgame', undefined, player)
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

export function vm_flush(device: DEVICELIKE, tag: string) {
  device.emit('vm:flush', tag)
}

export function vm_loader(
  device: DEVICELIKE,
  event: string,
  filename: string,
  content: any,
  player: string,
) {
  function createtextreader() {
    return {
      filename,
      cursor: 0,
      lines: content.split('\n'),
    }
  }
  function createbinaryreader() {
    return {
      filename,
      cursor: 0,
      bytes: content,
      dataview: new DataView(content.buffer),
    }
  }
  let withcontent: any
  switch (event) {
    case 'file':
      withcontent = content
      break
    case 'chat':
      withcontent = createtextreader()
      break
    case 'text':
      withcontent = createtextreader()
      break
    case 'binary':
      withcontent = createbinaryreader()
      break
  }
  device.emit('vm:loader', [event, withcontent], player)
}
