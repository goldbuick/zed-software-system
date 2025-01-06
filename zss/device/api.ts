/*
what is api? a set of common helper functions to send messages to devices
without having to include device code
*/

import { GADGET_STATE, INPUT } from 'zss/gadget/data/types'
import { hub } from 'zss/hub'
import { MAYBE } from 'zss/mapping/types'

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

export function broadcast_startstream(
  sender: string,
  streamkey: string,
  player: string,
) {
  hub.emit('broadcast:startstream', sender, streamkey, player)
}

export function broadcast_stopstream(sender: string, player: string) {
  hub.emit('broadcast:stopstream', sender, undefined, player)
}

export function chat_connect(sender: string, channel: string, player: string) {
  hub.emit('chat:connect', sender, channel, player)
}

export function chat_disconnect(sender: string, player: string) {
  hub.emit('chat:disconnect', sender, undefined, player)
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

export function gadgetserver_clearplayer(sender: string, player: string) {
  hub.emit('gadgetserver:clearplayer', sender, undefined, player)
}

export function peer_create(sender: string, joinid: string, player: string) {
  hub.emit('peer:create', sender, joinid, player)
}

export function peer_joincode(sender: string, player: string) {
  hub.emit('peer:joincode', sender, undefined, player)
}

export function peer_open(sender: string, player: string) {
  hub.emit('peer:open', sender, undefined, player)
}

export function peer_close(sender: string, player: string) {
  hub.emit('peer:close', sender, undefined, player)
}

export function peer_disconnected(sender: string, player: string) {
  hub.emit('peer:disconnected', sender, undefined, player)
}

export function platform_started(sender: string, player: string) {
  hub.emit('started', sender, undefined, player)
}

export function platform_init(sender: string, player: string) {
  hub.emit('init', sender, undefined, player)
}

export function register_ready(sender: string, player: string) {
  hub.emit('register:ready', sender, undefined, player)
}

export function register_ackbooks(sender: string, player: string) {
  hub.emit('register:ackbooks', sender, true, player)
}

export function register_flush(
  sender: string,
  historylabel: string,
  books: string,
  player: string,
) {
  hub.emit('register:flush', sender, [historylabel, books], player)
}

export function register_dev(sender: string, player: string) {
  hub.emit('register:dev', sender, undefined, player)
}

export function register_share(sender: string, player: string) {
  hub.emit('register:share', sender, undefined, player)
}

export function register_select(sender: string, book: string, player: string) {
  hub.emit('register:select', sender, book, player)
}

export function register_nuke(sender: string, player: string) {
  hub.emit('register:nuke', sender, undefined, player)
}

export function synth_tts(sender: string, voice: string, phrase: string) {
  hub.emit('synth:tts', sender, [voice, phrase])
}

export function synth_play(sender: string, priority: number, buffer: string) {
  hub.emit('synth:play', sender, [priority, buffer])
}

export function synth_mainvolume(
  sender: string,
  volume: number,
  player: string,
) {
  hub.emit('synth:mainvolume', sender, volume, player)
}

export function synth_drumvolume(
  sender: string,
  volume: number,
  player: string,
) {
  hub.emit('synth:drumvolume', sender, volume, player)
}

export function synth_ttsvolume(
  sender: string,
  volume: number,
  player: string,
) {
  hub.emit('synth:ttsvolume', sender, volume, player)
}

export function synth_voice(
  sender: string,
  idx: number,
  config: number | string,
  value: MAYBE<number | string | number[]>,
) {
  hub.emit('synth:voice', sender, [idx, config, value])
}

export function synth_voicefx(
  sender: string,
  idx: number,
  fx: string,
  config: number | string,
  value: MAYBE<number | string>,
) {
  hub.emit('synth:voicefx', sender, [idx, fx, config, value])
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

export function tape_terminal_open(sender: string, player: string) {
  hub.emit('tape:terminal:open', sender, undefined, player)
}

export function tape_terminal_close(sender: string, player: string) {
  hub.emit('tape:terminal:close', sender, undefined, player)
}

export function tape_terminal_toggle(sender: string, player: string) {
  hub.emit('tape:terminal:toggle', sender, undefined, player)
}

export function tape_terminal_inclayout(
  sender: string,
  inc: boolean,
  player: string,
) {
  hub.emit('tape:terminal:inclayout', sender, inc, player)
}

export function tape_crash(sender: string, player: string) {
  hub.emit('tape:crash', sender, undefined, player)
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

export function tape_editor_close(sender: string, player: string) {
  hub.emit('tape:editor:close', sender, undefined, player)
}

export function userinput_up(sender: string, input: INPUT, player: string) {
  hub.emit('userinput:up', sender, input, player)
}

export function userinput_down(sender: string, input: INPUT, player: string) {
  hub.emit('userinput:down', sender, input, player)
}

export function userinput_update(sender: string, player: string) {
  hub.emit('userinput:update', sender, undefined, player)
}

export function vm_books(
  sender: string,
  books: string,
  select: string,
  player: string,
) {
  hub.emit('vm:books', sender, [books, select], player)
}

export function vm_login(sender: string, player: string) {
  hub.emit('vm:login', sender, undefined, player)
}

export function vm_endgame(sender: string, player: string) {
  hub.emit('vm:endgame', sender, undefined, player)
}

export function vm_doot(sender: string, player: string) {
  hub.emit('vm:doot', sender, undefined, player)
}

export function vm_input(
  sender: string,
  input: INPUT,
  mods: number,
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

export function vm_flush(sender: string, tag: string, player: string) {
  hub.emit('vm:flush', sender, tag, player)
}

export function vm_loader(
  sender: string,
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
  hub.emit('vm:loader', sender, [event, withcontent], player)
}
