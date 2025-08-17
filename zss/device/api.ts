/*
what is api? a set of common helper functions to send messages to devices
without having to include device code
*/
import { GADGET_STATE, INPUT } from 'zss/gadget/data/types'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

// be careful to keep imports here minimal

export type DEVICELIKE = {
  emit: (player: string, target: string, data?: any) => void
}

export type MESSAGE = {
  session: string
  player: string
  id: string
  sender: string
  target: string
  data?: any
}

export function ismessage(value: any): value is MESSAGE {
  return (
    typeof value === 'object' &&
    isstring(value.session) &&
    isstring(value.player) &&
    isstring(value.id) &&
    isstring(value.sender) &&
    isstring(value.target)
  )
}

export function session_reset(device: DEVICELIKE) {
  device.emit('', 'session_reset')
}

export function api_error(
  device: DEVICELIKE,
  player: string,
  kind: string,
  ...message: any[]
) {
  device.emit(player, 'error', [`$red${kind}$blue>>`, ...message])
  return false
}

export function api_info(
  device: DEVICELIKE,
  player: string,
  ...message: any[]
) {
  device.emit(player, 'info', message)
  return true
}

export function api_log(device: DEVICELIKE, player: string, ...message: any[]) {
  device.emit(player, 'log', message)
  return true
}

export function api_toast(device: DEVICELIKE, player: string, toast: string) {
  device.emit(player, 'toast', toast)
}

export function bridge_streamstart(
  device: DEVICELIKE,
  player: string,
  streamkey: string,
) {
  device.emit(player, 'bridge:streamstart', streamkey)
}

export function bridge_streamstop(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:streamstop', undefined)
}

export function bridge_chatstart(
  device: DEVICELIKE,
  player: string,
  channel: string,
) {
  device.emit(player, 'bridge:chatstart', channel)
}

export function bridge_chatstop(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:chatstop')
}

export function bridge_fetch(
  device: DEVICELIKE,
  player: string,
  arg: any,
  label: string,
  url: string,
  method: string,
  words: any[],
) {
  device.emit(player, 'bridge:fetch', [arg, label, url, method, words])
}

export function bridge_talkstart(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:talkstart', player)
}

export function bridge_talkstop(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:talkstop', player)
}

export function bridge_mediastart(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:mediastart', player)
}

export function bridge_mediastop(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:mediastop', player)
}

export function bridge_join(device: DEVICELIKE, player: string, topic: string) {
  device.emit(player, 'bridge:join', topic)
}

export function bridge_start(
  device: DEVICELIKE,
  player: string,
  hidden: boolean,
) {
  device.emit(player, 'bridge:start', hidden)
}

export function bridge_tab(
  device: DEVICELIKE,
  player: string,
  hidden: boolean,
) {
  device.emit(player, 'bridge:tab', hidden)
}

export function bridge_tabopen(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:tabopen')
}

export function bridge_showjoincode(
  device: DEVICELIKE,
  player: string,
  hidden: boolean,
) {
  device.emit(player, 'bridge:showjoincode', hidden)
}

export function gadgetclient_paint(
  device: DEVICELIKE,
  player: string,
  gadgetstate: GADGET_STATE,
) {
  device.emit(player, 'gadgetclient:paint', gadgetstate)
}

export function gadgetclient_patch(
  device: DEVICELIKE,
  player: string,
  json: any,
) {
  device.emit(player, 'gadgetclient:patch', json)
}

export function gadgetserver_desync(device: DEVICELIKE, player: string) {
  device.emit(player, 'gadgetserver:desync')
}

export function gadgetserver_clearscroll(device: DEVICELIKE, player: string) {
  device.emit(player, 'gadgetserver:clearscroll')
}

export function gadgetserver_clearplayer(device: DEVICELIKE, player: string) {
  device.emit(player, 'gadgetserver:clearplayer')
}

export function platform_ready(device: DEVICELIKE) {
  device.emit('', 'ready')
}

export function register_loginfail(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:loginfail')
}

export function register_loginready(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:loginready', true)
}

export function register_savemem(
  device: DEVICELIKE,
  player: string,
  historylabel: string,
  books: string,
) {
  device.emit(player, 'register:savemem', [historylabel, books])
}

export function register_forkmem(
  device: DEVICELIKE,
  player: string,
  books: string,
) {
  device.emit(player, 'register:forkmem', [books])
}

export function register_itchiopublishmem(
  device: DEVICELIKE,
  player: string,
  name: string,
  books: string,
) {
  device.emit(player, 'register:itchiopublishmem', [name, books])
}

export function register_copy(
  device: DEVICELIKE,
  player: string,
  content: string,
) {
  device.emit(player, 'register:copy', content)
}

export function register_copyjsonfile(
  device: DEVICELIKE,
  player: string,
  data: any,
  filename: string,
) {
  device.emit(player, 'register:copyjsonfile', [data, filename])
}

export function register_downloadjsonfile(
  device: DEVICELIKE,
  player: string,
  data: any,
  filename: string,
) {
  device.emit(player, 'register:downloadjsonfile', [data, filename])
}

export function register_dev(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:dev', undefined)
}

export function register_share(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:share', undefined)
}

export function register_nuke(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:nuke', undefined)
}

export function register_enterar(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:enterar', undefined)
}

export function synth_audioenabled(device: DEVICELIKE, player: string) {
  device.emit(player, 'synth:audioenabled', undefined)
}

export function synth_tts(
  device: DEVICELIKE,
  player: string,
  voice: string,
  phrase: string,
) {
  device.emit(player, 'synth:tts', [voice, phrase])
}

export function synth_play(
  device: DEVICELIKE,
  player: string,
  board: string,
  buffer: string,
) {
  device.emit(player, 'synth:play', [board, buffer])
}

export function synth_bgplay(
  device: DEVICELIKE,
  player: string,
  board: string,
  buffer: string,
  quantize: string,
) {
  device.emit(player, 'synth:bgplay', [board, buffer, quantize])
}

export function synth_bpm(device: DEVICELIKE, player: string, bpm: number) {
  device.emit(player, 'synth:bpm', bpm)
}

export function synth_playvolume(
  device: DEVICELIKE,
  player: string,
  volume: number,
) {
  device.emit(player, 'synth:playvolume', volume)
}

export function synth_bgplayvolume(
  device: DEVICELIKE,
  player: string,
  volume: number,
) {
  device.emit(player, 'synth:bgplayvolume', volume)
}

export function synth_ttsvolume(
  device: DEVICELIKE,
  player: string,
  volume: number,
) {
  device.emit(player, 'synth:ttsvolume', volume)
}

export function synth_voice(
  device: DEVICELIKE,
  player: string,
  idx: number,
  config: number | string,
  value: MAYBE<number | string | number[]>,
) {
  device.emit(player, 'synth:voice', [idx, config, value])
}

export function synth_voicefx(
  device: DEVICELIKE,
  player: string,
  idx: number,
  fx: string,
  config: number | string,
  value: MAYBE<number | string>,
) {
  device.emit(player, 'synth:voicefx', [idx, fx, config, value])
}

export function synth_record(
  device: DEVICELIKE,
  player: string,
  filename: string,
) {
  device.emit(player, 'synth:record', filename)
}

export function register_refresh(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:refresh')
}

export function register_config(
  device: DEVICELIKE,
  player: string,
  name: string,
  value: string,
) {
  device.emit(player, 'register:config', [name, value])
}

export function register_configshow(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:configshow')
}

export function register_inspector(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:inspector')
}

export function register_terminal_open(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:terminal:open')
}

export function register_terminal_quickopen(
  device: DEVICELIKE,
  player: string,
  openwith: string,
) {
  device.emit(player, 'register:terminal:quickopen', openwith)
}

export function register_terminal_close(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:terminal:close')
}

export function register_terminal_toggle(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:terminal:toggle')
}

export function register_terminal_inclayout(
  device: DEVICELIKE,
  player: string,
  inc: boolean,
) {
  device.emit(player, 'register:terminal:inclayout', inc)
}

export function register_terminal_full(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:terminal:full')
}

export function register_editor_open(
  device: DEVICELIKE,
  player: string,
  book: string,
  path: MAYBE<string>[],
  type: string,
  title: string,
) {
  device.emit(player, 'register:editor:open', [book, path, type, title])
}

export function register_editor_close(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:editor:close')
}

export function register_t9words(
  device: DEVICELIKE,
  player: string,
  checknumbers: string,
  words: string[],
) {
  device.emit(player, 'register:t9words', [checknumbers, words])
}

export function register_t9wordsflag(
  device: DEVICELIKE,
  player: string,
  flag: string,
) {
  device.emit(player, 'register:t9wordsflag', flag)
}

export function vm_operator(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:operator')
}

export function vm_zztsearch(
  device: DEVICELIKE,
  player: string,
  field: string,
  text: string,
) {
  device.emit(player, 'vm:zztsearch', [field, text])
}

export function vm_zztrandom(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:zztrandom')
}

export function vm_zsswords(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:zsswords')
}

export function vm_halt(device: DEVICELIKE, player: string, halt: boolean) {
  device.emit(player, 'vm:halt', halt)
}

export function vm_books(
  device: DEVICELIKE,
  player: string,
  books: string,
  select: string,
) {
  device.emit(player, 'vm:books', [books, select])
}

export function vm_search(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:search')
}

export function vm_login(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:login')
}

export function vm_local(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:local')
}

export function vm_logout(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:logout')
}

export function vm_doot(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:doot')
}

export function vm_touched(
  device: DEVICELIKE,
  player: string,
  senderidorindex: string,
  toelementid: string,
  message: string,
) {
  device.emit(player, 'vm:touched', [senderidorindex, toelementid, message])
}

export function vm_input(
  device: DEVICELIKE,
  player: string,
  input: INPUT,
  mods: number,
) {
  device.emit(player, 'vm:input', [input, mods])
}

export function vm_copyjsonfile(
  device: DEVICELIKE,
  player: string,
  path: string[],
) {
  device.emit(player, 'vm:copyjsonfile', path)
}

export function vm_refscroll(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:refscroll')
}

export function vm_readzipfilelist(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:readzipfilelist')
}

export function vm_inspect(device: DEVICELIKE, player: string, p1: PT, p2: PT) {
  device.emit(player, 'vm:inspect', [p1, p2])
}

export function vm_codeaddress(book: string, path: MAYBE<string>[]) {
  const [main, element] = path
  return `${book}:${[main, element].filter(ispresent).join(':')}`
}

export function vm_codewatch(
  device: DEVICELIKE,
  player: string,
  book: string,
  path: string[],
) {
  device.emit(player, 'vm:codewatch', [book, path])
}

export function vm_coderelease(
  device: DEVICELIKE,
  player: string,
  book: string,
  path: string[],
) {
  device.emit(player, 'vm:coderelease', [book, path])
}

export function vm_cli(device: DEVICELIKE, player: string, input: string) {
  device.emit(player, 'vm:cli', input)
}

export function vm_clirepeatlast(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:clirepeatlast')
}

export function vm_restart(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:restart')
}

export function vm_synthsend(
  device: DEVICELIKE,
  player: string,
  message: string,
) {
  device.emit(player, 'vm:synthsend', message)
}

export function vm_flush(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:flush')
}

export function vm_fork(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:fork')
}

export function vm_itchiopublish(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:itchiopublish')
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
  player: string,
  arg: any,
  format: 'file' | 'text' | 'json' | 'binary', // maybe add xml ?
  eventname: string,
  content: any,
) {
  let withcontent: any
  switch (format) {
    case 'file':
      withcontent = content
      break
    case 'text':
      withcontent = createtextreader(eventname, content)
      break
    case 'json':
      withcontent = createjsonreader(eventname, content)
      break
    case 'binary':
      withcontent = createbinaryreader(eventname, content)
      break
  }
  setTimeout(() => {
    device.emit(player, 'vm:loader', [arg, format, eventname, withcontent])
  }, 1)
}
