/*
what is api? a set of common helper functions to send messages to devices
without having to include device code
*/

import { GADGET_STATE, INPUT } from 'zss/gadget/data/types'
import { hub } from 'zss/hub'
import { MAYBE } from 'zss/mapping/types'

// be careful to keep imports here minimal

export function api_error(
  session: string,
  sender: string,
  kind: string,
  message: string,
  maybeplayer?: string,
) {
  const player = maybeplayer ?? ''
  hub.emit(session, `error:${kind}`, sender, message, player)
  return tape_error(sender, message, player)
}

export function broadcast_startstream(
  session: string,
  sender: string,
  streamkey: string,
  player: string,
) {
  hub.emit(session, 'broadcast:startstream', sender, streamkey, player)
}

export function broadcast_stopstream(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'broadcast:stopstream', sender, undefined, player)
}

export function chat_connect(
  session: string,
  sender: string,
  channel: string,
  player: string,
) {
  hub.emit(session, 'chat:connect', sender, channel, player)
}

export function chat_disconnect(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'chat:disconnect', sender, undefined, player)
}

export function gadgetclient_reset(
  session: string,
  sender: string,
  gadgetstate: GADGET_STATE,
  player: string,
) {
  hub.emit(session, 'gadgetclient:reset', sender, gadgetstate, player)
}

export function gadgetclient_patch(
  session: string,
  sender: string,
  json: any,
  player: string,
) {
  hub.emit(session, 'gadgetclient:patch', sender, json, player)
}

export function gadgetserver_desync(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'gadgetserver:desync', sender, undefined, player)
}

export function gadgetserver_clearscroll(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'gadgetserver:clearscroll', sender, undefined, player)
}

export function gadgetserver_clearplayer(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'gadgetserver:clearplayer', sender, undefined, player)
}

export function peer_create(
  session: string,
  sender: string,
  joinid: string,
  player: string,
) {
  hub.emit(session, 'peer:create', sender, joinid, player)
}

export function peer_joincode(session: string, sender: string, player: string) {
  hub.emit(session, 'peer:joincode', sender, undefined, player)
}

export function peer_open(session: string, sender: string, player: string) {
  hub.emit(session, 'peer:open', sender, undefined, player)
}

export function peer_close(session: string, sender: string, player: string) {
  hub.emit(session, 'peer:close', sender, undefined, player)
}

export function peer_disconnected(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'peer:disconnected', sender, undefined, player)
}

export function platform_started(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'started', sender, undefined, player)
}

export function platform_init(session: string, sender: string, player: string) {
  hub.emit(session, 'init', sender, undefined, player)
}

export function register_ready(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'register:ready', sender, undefined, player)
}

export function register_ackbooks(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'register:ackbooks', sender, true, player)
}

export function register_flush(
  session: string,
  sender: string,
  historylabel: string,
  books: string,
  player: string,
) {
  hub.emit(session, 'register:flush', sender, [historylabel, books], player)
}

export function register_dev(session: string, sender: string, player: string) {
  hub.emit(session, 'register:dev', sender, undefined, player)
}

export function register_share(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'register:share', sender, undefined, player)
}

export function register_select(
  session: string,
  sender: string,
  book: string,
  player: string,
) {
  hub.emit(session, 'register:select', sender, book, player)
}

export function register_nuke(session: string, sender: string, player: string) {
  hub.emit(session, 'register:nuke', sender, undefined, player)
}

export function synth_audioenabled(session: string, sender: string) {
  hub.emit(session, 'synth:audioenabled', sender, undefined)
}

export function synth_tts(
  session: string,
  sender: string,
  voice: string,
  phrase: string,
) {
  hub.emit(session, 'synth:tts', sender, [voice, phrase])
}

export function synth_play(
  session: string,
  sender: string,
  priority: number,
  buffer: string,
) {
  hub.emit(session, 'synth:play', sender, [priority, buffer])
}

export function synth_mainvolume(
  session: string,
  sender: string,
  volume: number,
  player: string,
) {
  hub.emit(session, 'synth:mainvolume', sender, volume, player)
}

export function synth_drumvolume(
  session: string,
  sender: string,
  volume: number,
  player: string,
) {
  hub.emit(session, 'synth:drumvolume', sender, volume, player)
}

export function synth_ttsvolume(
  session: string,
  sender: string,
  volume: number,
  player: string,
) {
  hub.emit(session, 'synth:ttsvolume', sender, volume, player)
}

export function synth_voice(
  session: string,
  sender: string,
  idx: number,
  config: number | string,
  value: MAYBE<number | string | number[]>,
) {
  hub.emit(session, 'synth:voice', sender, [idx, config, value])
}

export function synth_voicefx(
  session: string,
  sender: string,
  idx: number,
  fx: string,
  config: number | string,
  value: MAYBE<number | string>,
) {
  hub.emit(session, 'synth:voicefx', sender, [idx, fx, config, value])
}

export function tape_info(session: string, sender: string, ...message: any[]) {
  hub.emit(session, 'tape:info', sender, message)
  return true
}

export function tape_debug(session: string, sender: string, ...message: any[]) {
  hub.emit(session, 'tape:debug', sender, message)
  return true
}

// internal only, use api_error
function tape_error(session: string, sender: string, ...message: any[]) {
  hub.emit(session, 'tape:error', sender, message)
  return false
}

export function tape_terminal_open(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'tape:terminal:open', sender, undefined, player)
}

export function tape_terminal_close(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'tape:terminal:close', sender, undefined, player)
}

export function tape_terminal_toggle(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'tape:terminal:toggle', sender, undefined, player)
}

export function tape_terminal_inclayout(
  session: string,
  sender: string,
  inc: boolean,
  player: string,
) {
  hub.emit(session, 'tape:terminal:inclayout', sender, inc, player)
}

export function tape_crash(session: string, sender: string, player: string) {
  hub.emit(session, 'tape:crash', sender, undefined, player)
}

export function tape_editor_open(
  session: string,
  sender: string,
  book: string,
  page: string,
  type: string,
  title: string,
  player: string,
) {
  hub.emit(
    session,
    'tape:editor:open',
    sender,
    [book, page, type, title],
    player,
  )
}

export function tape_editor_close(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'tape:editor:close', sender, undefined, player)
}

export function userinput_up(
  session: string,
  sender: string,
  input: INPUT,
  player: string,
) {
  hub.emit(session, 'userinput:up', sender, input, player)
}

export function userinput_down(
  session: string,
  sender: string,
  input: INPUT,
  player: string,
) {
  hub.emit(session, 'userinput:down', sender, input, player)
}

export function userinput_update(
  session: string,
  sender: string,
  player: string,
) {
  hub.emit(session, 'userinput:update', sender, undefined, player)
}

export function vm_books(
  session: string,
  sender: string,
  books: string,
  select: string,
  player: string,
) {
  hub.emit(session, 'vm:books', sender, [books, select], player)
}

export function vm_login(session: string, sender: string, player: string) {
  hub.emit(session, 'vm:login', sender, undefined, player)
}

export function vm_endgame(session: string, sender: string, player: string) {
  hub.emit(session, 'vm:endgame', sender, undefined, player)
}

export function vm_doot(session: string, sender: string, player: string) {
  hub.emit(session, 'vm:doot', sender, undefined, player)
}

export function vm_input(
  session: string,
  sender: string,
  input: INPUT,
  mods: number,
  player: string,
) {
  hub.emit(session, 'vm:input', sender, [input, mods], player)
}

export function vm_codeaddress(
  session: string,
  book: string,
  codepage: string,
) {
  return `${book}${codepage}`
}

export function vm_codewatch(
  session: string,
  sender: string,
  book: string,
  codepage: string,
  player: string,
) {
  hub.emit(session, 'vm:codewatch', sender, [book, codepage], player)
}

export function vm_coderelease(
  session: string,
  sender: string,
  book: string,
  codepage: string,
  player: string,
) {
  hub.emit(session, 'vm:coderelease', sender, [book, codepage], player)
}

export function vm_cli(
  session: string,
  sender: string,
  input: string,
  player: string,
) {
  hub.emit(session, 'vm:cli', sender, input, player)
}

export function vm_flush(
  session: string,
  sender: string,
  tag: string,
  player: string,
) {
  hub.emit(session, 'vm:flush', sender, tag, player)
}

export function vm_loader(
  session: string,
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
  hub.emit(session, 'vm:loader', sender, [event, withcontent], player)
}
