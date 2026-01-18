/*
what is api? a set of common helper functions to send messages to devices
without having to include device code
*/
import { INPUT } from 'zss/gadget/data/types'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { BOOK } from 'zss/memory/types'
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

export function sessionreset(device: DEVICELIKE) {
  device.emit('', 'sessionreset')
}

export function apierror(
  device: DEVICELIKE,
  player: string,
  kind: string,
  ...message: any[]
) {
  device.emit(player, 'log', [`$red${kind}$blue>>`, ...message])
  return false
}

export function apilog(device: DEVICELIKE, player: string, ...message: any[]) {
  device.emit(player, 'log', message)
  return true
}

export function apichat(device: DEVICELIKE, board: string, ...message: any[]) {
  device.emit(board, 'chat', message)
  return true
}

export function apitoast(device: DEVICELIKE, player: string, toast: string) {
  device.emit(player, 'toast', toast)
}

export function bridgestreamstart(
  device: DEVICELIKE,
  player: string,
  streamkey: string,
) {
  device.emit(player, 'bridge:streamstart', streamkey)
}

export function bridgestreamstop(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:streamstop', undefined)
}

export function bridgechatstart(
  device: DEVICELIKE,
  player: string,
  channel: string,
) {
  device.emit(player, 'bridge:chatstart', channel)
}

export function bridgechatstop(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:chatstop')
}

export function bridgefetch(
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

export function bridgejoin(device: DEVICELIKE, player: string, topic: string) {
  device.emit(player, 'bridge:join', topic)
}

export function bridgestart(
  device: DEVICELIKE,
  player: string,
  hidden: boolean,
) {
  device.emit(player, 'bridge:start', hidden)
}

export function bridgetab(device: DEVICELIKE, player: string, hidden: boolean) {
  device.emit(player, 'bridge:tab', hidden)
}

export function bridgetabopen(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:tabopen')
}

export function bridgeshowjoincode(
  device: DEVICELIKE,
  player: string,
  hidden: boolean,
) {
  device.emit(player, 'bridge:showjoincode', hidden)
}

export function gadgetclientpaint(
  device: DEVICELIKE,
  player: string,
  json: any,
) {
  device.emit(player, 'gadgetclient:paint', json)
}

export function gadgetclientpatch(
  device: DEVICELIKE,
  player: string,
  json: any,
) {
  device.emit(player, 'gadgetclient:patch', json)
}

export function gadgetserverdesync(device: DEVICELIKE, player: string) {
  device.emit(player, 'gadgetserver:desync')
}

export function gadgetserverclearscroll(device: DEVICELIKE, player: string) {
  device.emit(player, 'gadgetserver:clearscroll')
}

export function heavyttsinfo(
  device: DEVICELIKE,
  player: string,
  engine: 'kitten' | 'piper',
  info: string,
) {
  device.emit(player, 'heavy:ttsinfo', [engine, info])
}

export function heavyttsrequest(
  device: DEVICELIKE,
  player: string,
  engine: 'kitten' | 'piper',
  config: string,
  voice: string | number,
  phrase: string,
) {
  device.emit(player, 'heavy:ttsrequest', [engine, config, voice, phrase])
}

export function platformready(device: DEVICELIKE) {
  device.emit('', 'ready')
}

export function registerinput(
  device: DEVICELIKE,
  player: string,
  input: INPUT,
  shift: boolean,
) {
  device.emit(player, 'register:input', [input, shift])
}

export function registerloginfail(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:loginfail')
}

export function registerloginready(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:loginready', true)
}

export function registersavemem(
  device: DEVICELIKE,
  player: string,
  historylabel: string,
  compressedbooks: string,
  books: BOOK[],
) {
  device.emit(player, 'register:savemem', [
    historylabel,
    compressedbooks,
    books,
  ])
}

export function registerforkmem(
  device: DEVICELIKE,
  player: string,
  books: string,
  transfer: string,
) {
  device.emit(player, 'register:forkmem', [books, transfer])
}

export function registerpublishmem(
  device: DEVICELIKE,
  player: string,
  books: string,
  ...args: string[]
) {
  device.emit(player, 'register:publishmem', [books, ...args])
}

export function registercopy(
  device: DEVICELIKE,
  player: string,
  content: string,
) {
  device.emit(player, 'register:copy', content)
}

export function registerdownloadjsonfile(
  device: DEVICELIKE,
  player: string,
  data: any,
  filename: string,
) {
  device.emit(player, 'register:downloadjsonfile', [data, filename])
}

export function registerdev(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:dev', undefined)
}

export function registershare(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:share', undefined)
}

export function registernuke(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:nuke', undefined)
}

export function synthaudioenabled(device: DEVICELIKE, player: string) {
  device.emit(player, 'synth:audioenabled', undefined)
}

export function synthrestart(device: DEVICELIKE, player: string) {
  device.emit(player, 'synth:restart', undefined)
}

export function synthaudiobuffer(
  device: DEVICELIKE,
  player: string,
  audiobuffer: AudioBuffer,
) {
  device.emit(player, 'synth:audiobuffer', audiobuffer)
}

export function synthplay(
  device: DEVICELIKE,
  player: string,
  board: string,
  buffer: string,
) {
  device.emit(player, 'synth:play', [board, buffer])
}

export function synthbgplay(
  device: DEVICELIKE,
  player: string,
  board: string,
  buffer: string,
  quantize: string,
) {
  device.emit(player, 'synth:bgplay', [board, buffer, quantize])
}

export function synthbpm(device: DEVICELIKE, player: string, bpm: number) {
  device.emit(player, 'synth:bpm', bpm)
}

export function synthplayvolume(
  device: DEVICELIKE,
  player: string,
  volume: number,
) {
  device.emit(player, 'synth:playvolume', volume)
}

export function synthbgplayvolume(
  device: DEVICELIKE,
  player: string,
  volume: number,
) {
  device.emit(player, 'synth:bgplayvolume', volume)
}

export function synthttsvolume(
  device: DEVICELIKE,
  player: string,
  volume: number,
) {
  device.emit(player, 'synth:ttsvolume', volume)
}

export function synthttsengine(
  device: DEVICELIKE,
  player: string,
  engine: string,
  config: string,
) {
  device.emit(player, 'synth:ttsengine', [engine, config])
}

export function synthtts(
  device: DEVICELIKE,
  player: string,
  board: string,
  voice: string | number,
  phrase: string,
) {
  device.emit(player, 'synth:tts', [board, voice, phrase])
}

export function synthttsinfo(device: DEVICELIKE, player: string, info: string) {
  device.emit(player, 'synth:ttsinfo', info)
}

export function synthttsqueue(
  device: DEVICELIKE,
  player: string,
  board: string,
  voice: string | number,
  phrase: string,
) {
  device.emit(player, 'synth:ttsqueue', [board, voice, phrase])
}

export function synthttsclearqueue(device: DEVICELIKE, player: string) {
  device.emit(player, 'synth:ttsclearqueue')
}

export function synthvoice(
  device: DEVICELIKE,
  player: string,
  idx: number,
  config: number | string,
  value: MAYBE<number | string | number[]>,
) {
  device.emit(player, 'synth:voice', [idx, config, value])
}

export function synthvoicefx(
  device: DEVICELIKE,
  player: string,
  idx: number,
  fx: string,
  config: number | string,
  value: MAYBE<number | string>,
) {
  device.emit(player, 'synth:voicefx', [idx, fx, config, value])
}

export function synthrecord(
  device: DEVICELIKE,
  player: string,
  filename: string,
) {
  device.emit(player, 'synth:record', filename)
}

export function synthflush(device: DEVICELIKE, player: string) {
  device.emit(player, 'synth:flush')
}

export function registerstore(
  device: DEVICELIKE,
  player: string,
  name: string,
  value: any,
) {
  device.emit(player, 'register:store', [name, value])
}

export function registerinspector(
  device: DEVICELIKE,
  player: string,
  forcevalue: MAYBE<boolean>,
) {
  device.emit(player, 'register:inspector', forcevalue)
}

export function registerfindany(device: DEVICELIKE, player: string, pts: PT[]) {
  device.emit(player, 'register:findany', pts)
}

export function registerterminalopen(
  device: DEVICELIKE,
  player: string,
  openwith?: string,
) {
  device.emit(player, 'register:terminal:open', openwith)
}

export function registerterminalquickopen(
  device: DEVICELIKE,
  player: string,
  openwith: string,
) {
  device.emit(player, 'register:terminal:quickopen', openwith)
}

export function registerterminalclose(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:terminal:close')
}

export function registerterminaltoggle(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:terminal:toggle')
}

export function registerterminalinclayout(
  device: DEVICELIKE,
  player: string,
  inc: boolean,
) {
  device.emit(player, 'register:terminal:inclayout', inc)
}

export function registerterminalfull(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:terminal:full')
}

export function registereditoropen(
  device: DEVICELIKE,
  player: string,
  book: string,
  path: MAYBE<string>[],
  type: string,
  title: string,
) {
  device.emit(player, 'register:editor:open', [book, path, type, title])
}

export function registereditorclose(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:editor:close')
}

export function vmoperator(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:operator')
}

export function vmadmin(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:admin')
}

export function vmzztsearch(
  device: DEVICELIKE,
  player: string,
  field: string,
  text: string,
) {
  device.emit(player, 'vm:zztsearch', [field, text])
}

export function vmzztrandom(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:zztrandom')
}

export function vmzsswords(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:zsswords')
}

export function vmhalt(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:halt')
}

export function vmtopic(device: DEVICELIKE, player: string, topic: string) {
  device.emit(player, 'vm:topic', topic)
}

export function vmbooks(
  device: DEVICELIKE,
  player: string,
  books: string | BOOK[],
) {
  device.emit(player, 'vm:books', books)
}

export function vmsearch(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:search')
}

export function vmlogin(
  device: DEVICELIKE,
  player: string,
  storage: Record<string, any>,
) {
  device.emit(player, 'vm:login', storage)
}

export function vmlocal(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:local')
}

export function vmlogout(
  device: DEVICELIKE,
  player: string,
  isendgame: boolean,
) {
  device.emit(player, 'vm:logout', isendgame)
}

export function vmdoot(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:doot')
}

export function vminput(
  device: DEVICELIKE,
  player: string,
  input: INPUT,
  mods: number,
) {
  device.emit(player, 'vm:input', [input, mods])
}

export function vmmakeitscroll(
  device: DEVICELIKE,
  player: string,
  makeit: string,
) {
  device.emit(player, 'vm:makeitscroll', makeit)
}

export function vmrefscroll(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:refscroll')
}

export function vmreadzipfilelist(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:readzipfilelist')
}

export function vminspect(device: DEVICELIKE, player: string, p1: PT, p2: PT) {
  device.emit(player, 'vm:inspect', [p1, p2])
}

export function vmfindany(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:findany')
}

export function vmcodeaddress(book: string, path: MAYBE<string>[]) {
  const [main, element] = path
  return `${book}:${[main, element].filter(ispresent).join(':')}`
}

export function vmcodewatch(
  device: DEVICELIKE,
  player: string,
  book: string,
  path: string[],
) {
  device.emit(player, 'vm:codewatch', [book, path])
}

export function vmcoderelease(
  device: DEVICELIKE,
  player: string,
  book: string,
  path: string[],
) {
  device.emit(player, 'vm:coderelease', [book, path])
}

export function vmclearscroll(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:clearscroll')
}

export function vmcli(device: DEVICELIKE, player: string, input: string) {
  device.emit(player, 'vm:cli', input)
}

export function vmclirepeatlast(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:clirepeatlast')
}

export function vmrestart(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:restart')
}

export function vmflush(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:flush')
}

export function vmfork(device: DEVICELIKE, player: string, transfer: string) {
  device.emit(player, 'vm:fork', transfer)
}

export function vmpublish(
  device: DEVICELIKE,
  player: string,
  target: string,
  ...args: string[]
) {
  device.emit(player, 'vm:publish', [target, ...args])
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

export function vmloader(
  device: DEVICELIKE,
  player: string,
  arg: any,
  format: 'file' | 'text' | 'json' | 'binary', // maybe add xml ?
  idoreventname: string,
  content: any,
) {
  let withcontent: any
  switch (format) {
    case 'file':
      withcontent = content
      break
    case 'text':
      withcontent = createtextreader(idoreventname, content)
      break
    case 'json':
      withcontent = createjsonreader(idoreventname, content)
      break
    case 'binary':
      withcontent = createbinaryreader(idoreventname, content)
      break
  }
  setTimeout(() => {
    device.emit(player, 'vm:loader', [arg, format, idoreventname, withcontent])
  }, 1)
}
