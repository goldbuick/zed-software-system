/*
what is api? a set of common helper functions to send messages to devices
without having to include device code
*/
import type { BRIDGE_CHAT_START_OBJECT } from 'zss/device/bridge/chattypes'
import { modemreadtextsync } from 'zss/device/modem'
import type { DEVICELIKE } from 'zss/device/types'
import type { INPUT, SYNTH_STATE } from 'zss/gadget/data/types'
import { MAYBE, ispresent } from 'zss/mapping/types'
import type { BOOK } from 'zss/memory/types'
import type { PT } from 'zss/words/types'

// be careful to keep imports here minimal

export type BINARY_READER = {
  filename: string
  cursor: number
  bytes: Uint8Array
  dataview: DataView
}

export type GADGET_SCROLL_LINES = {
  scrollname: string
  content: string
  chip?: string
}

export type JSON_READER = {
  filename: string
  json: string
}

export type TEXT_READER = {
  filename: string
  cursor: number
  lines: string[]
}

export function apichat(device: DEVICELIKE, player: string, ...message: any[]) {
  device.emit(player, 'chat', message)
  return true
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

export function apitoast(device: DEVICELIKE, player: string, toast: string) {
  device.emit(player, 'toast', toast)
}

export function vminput(
  device: DEVICELIKE,
  player: string,
  input: INPUT,
  mods: number,
) {
  device.emit(player, 'vm:input', [input, mods])
}

export function bridgechatstart(
  device: DEVICELIKE,
  player: string,
  payload: string | BRIDGE_CHAT_START_OBJECT,
) {
  device.emit(player, 'bridge:chatstart', payload)
}

export function bridgechatstop(
  device: DEVICELIKE,
  player: string,
  kind: string,
) {
  device.emit(player, 'bridge:chatstop', kind)
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

export function bridgeshowjoincode(
  device: DEVICELIKE,
  player: string,
  hidden: boolean,
) {
  device.emit(player, 'bridge:showjoincode', hidden)
}

export function bridgemediapanel(
  device: DEVICELIKE,
  player: string,
  path: string,
  data?: unknown,
) {
  device.emit(player, 'bridge:mediapanel', { path, data })
}

export function bridgemediavol(
  device: DEVICELIKE,
  player: string,
  volume: number,
) {
  device.emit(player, 'bridge:mediavol', volume)
}

export function bridgestart(
  device: DEVICELIKE,
  player: string,
  hidden: boolean,
) {
  device.emit(player, 'bridge:start', hidden)
}

export function bridgestatus(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:status', undefined)
}

/** Host -> peers: player/peer roster for join clique. */
export function netterminalpeerroster(
  device: DEVICELIKE,
  player: string,
  entries: { player: string; peerid: string }[],
) {
  device.emit(player, 'netterminal:peerroster', entries)
}

export function bridgestreamstart(
  device: DEVICELIKE,
  player: string,
  payload: string | Record<string, unknown>,
) {
  device.emit(player, 'bridge:streamstart', payload)
}

export function bridgestreamstop(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:streamstop', undefined)
}

export function bridgetab(device: DEVICELIKE, player: string, hidden: boolean) {
  device.emit(player, 'bridge:tab', hidden)
}

export function bridgetabopen(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:tabopen')
}

export function chipmessage(
  device: DEVICELIKE,
  player: string,
  chip: string,
  target: string,
  data: any[],
) {
  device.emit(player, `chip:${chip}:${target}`, data)
}

function createbinaryreader(
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

function createjsonreader(filename: string, content: any): JSON_READER {
  return {
    filename,
    json: content,
  }
}

function createtextreader(filename: string, content: string): TEXT_READER {
  return {
    filename,
    cursor: 0,
    lines: content.split('\n'),
  }
}

export function gadgetclientbonk(device: DEVICELIKE, player: string) {
  device.emit(player, 'gadgetclient:bonk', undefined)
}

export function gadgetclientfadein(device: DEVICELIKE, player: string) {
  device.emit(player, 'gadgetclient:fadein', undefined)
}

export function gadgetclientfadeout(device: DEVICELIKE, player: string) {
  device.emit(player, 'gadgetclient:fadeout', undefined)
}

export function gadgetclientgotofade(
  device: DEVICELIKE,
  player: string,
  resetorigin = false,
) {
  device.emit(player, 'gadgetclient:gotofade', resetorigin || undefined)
}

export function gadgetclientpaint(
  device: DEVICELIKE,
  player: string,
  json: any,
) {
  device.emit(player, 'gadgetclient:paint', json)
}

export function gadgetclientzap(device: DEVICELIKE, player: string) {
  device.emit(player, 'gadgetclient:zap', undefined)
}

export function platformready(device: DEVICELIKE) {
  device.emit('', 'ready')
}

export function registerbookmarkclirun(
  device: DEVICELIKE,
  player: string,
  id: string,
) {
  device.emit(player, 'register:bookmark:clirun', id)
}

export function registerbookmarkclisave(
  device: DEVICELIKE,
  player: string,
  line: string,
) {
  device.emit(player, 'register:bookmark:clisave', line)
}

export function registerbookmarkcodepagecopytogame(
  device: DEVICELIKE,
  player: string,
  id: string,
) {
  device.emit(player, 'register:bookmark:codepagecopytogame', id)
}

export function registerbookmarkcodepagesave(
  device: DEVICELIKE,
  player: string,
  type: string,
  title: string,
  codepage: any,
) {
  device.emit(player, 'register:bookmark:codepagesave', [type, title, codepage])
}

export function registerbookmarkcodepagesaveover(
  device: DEVICELIKE,
  player: string,
  id: string,
  type: string,
  title: string,
  codepage: any,
) {
  device.emit(player, 'register:bookmark:codepagesaveover', [
    id,
    type,
    title,
    codepage,
  ])
}

export function registerbookmarkdelete(
  device: DEVICELIKE,
  player: string,
  id: string,
) {
  device.emit(player, 'register:bookmark:delete', id)
}

/** Open gadget confirm scroll before deleting (sim-side). */
export function vmbookmarkdeleteprompt(
  device: DEVICELIKE,
  player: string,
  id: string,
  label: string,
) {
  device.emit(player, 'vm:bookmarkdeleteprompt', [id, label])
}

export function registerbookmarkscroll(
  device: DEVICELIKE,
  player: string,
  includecodepages: boolean,
) {
  device.emit(player, 'register:bookmarkscroll', includecodepages)
}

export function registerbookmarkurlnavigate(
  device: DEVICELIKE,
  player: string,
  href: string,
) {
  device.emit(player, 'register:bookmark:urlnavigate', href)
}

export function registerjoincrosslogin(
  device: DEVICELIKE,
  player: string,
  payload: { peerid: string; flags: Record<string, unknown> },
) {
  device.emit(player, 'register:joincrosslogin', payload)
}

export function registercontentcrosslogin(
  device: DEVICELIKE,
  player: string,
  payload: { url: string; flags: Record<string, unknown> },
) {
  device.emit(player, 'register:contentcrosslogin', payload)
}

export function registerbookmarkurlsave(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:bookmark:urlsave', true)
}

export function registerbookmarkurlsaveover(
  device: DEVICELIKE,
  player: string,
  id: string,
) {
  device.emit(player, 'register:bookmark:urlsaveover', id)
}

export function registerbookmarkcontentsave(
  device: DEVICELIKE,
  player: string,
  bookmarkname: string,
  compressed: string,
) {
  device.emit(player, 'register:bookmark:contentsave', [
    bookmarkname,
    compressed,
  ])
}

export function registercopy(
  device: DEVICELIKE,
  player: string,
  content: string,
) {
  device.emit(player, 'register:copy', content)
}

export function registerdownloadbinaryfile(
  device: DEVICELIKE,
  player: string,
  bytes: Uint8Array,
  filename: string,
  mimetype = 'application/octet-stream',
) {
  device.emit(player, 'register:downloadbinaryfile', [
    bytes,
    filename,
    mimetype,
  ])
}

export function registerdownloadjsonfile(
  device: DEVICELIKE,
  player: string,
  data: any,
  filename: string,
) {
  device.emit(player, 'register:downloadjsonfile', [data, filename])
}

export function registereditorbookmarkscroll(
  device: DEVICELIKE,
  player: string,
  codepagename: string,
  codepagepath: string[],
) {
  device.emit(player, 'register:editorbookmarkscroll', [
    codepagename,
    codepagepath,
  ])
}

export function registereditorclose(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:editor:close')
}

export function registereditoropen(
  device: DEVICELIKE,
  player: string,
  book: string,
  path: MAYBE<string>[],
  type: string,
  title: string,
  scrollto?: number,
) {
  device.emit(player, 'register:editor:open', [
    book,
    path,
    type,
    title,
    scrollto ?? 0,
  ])
}

export function registerfindany(device: DEVICELIKE, player: string, pts: PT[]) {
  device.emit(player, 'register:findany', pts)
}

export function registerforkmem(
  device: DEVICELIKE,
  player: string,
  books: string,
  transfer: string,
) {
  device.emit(player, 'register:forkmem', [books, transfer])
}

export function registerinput(
  device: DEVICELIKE,
  player: string,
  input: INPUT,
  shift: boolean,
) {
  device.emit(player, 'register:input', [input, shift])
}

export function registerinspector(
  device: DEVICELIKE,
  player: string,
  forcevalue: MAYBE<boolean>,
) {
  device.emit(player, 'register:inspector', forcevalue)
}

export function registerloginready(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:loginready', true)
}

export function registernuke(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:nuke', undefined)
}

/** Main-thread only: keep FileSystemDirectoryHandle off BroadcastChannel. */
export function registermemoryfsattach(
  device: DEVICELIKE,
  player: string,
  dir: FileSystemDirectoryHandle,
) {
  device.emitlocal(player, 'register:memoryfsattach', dir)
}

export function registermemoryfsdetach(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:memoryfsdetach')
}

export function registermemoryfsstatus(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:memoryfsstatus')
}

export function registerperfmonitor(
  device: DEVICELIKE,
  player: string,
  forcevalue: MAYBE<boolean>,
) {
  device.emit(player, 'register:perfmonitor', forcevalue)
}

export function registerpublishmem(
  device: DEVICELIKE,
  player: string,
  ...args: string[]
) {
  device.emit(player, 'register:publishmem', args)
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

export function registerscreenshot(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:screenshot')
}

export function registershare(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:share', undefined)
}

export function registerairsharesend(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:airsharesend')
}

export function registerairsharereceive(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:airsharereceive')
}

export function registerairsharestop(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:airsharestop')
}

/** Invite confirmed: flush + compress MEMORY for optical stream. */
export function registerairsharestream(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:airsharestream')
}

export function registerairsharepayload(
  device: DEVICELIKE,
  player: string,
  compressed: string,
) {
  device.emit(player, 'register:airsharepayload', compressed)
}

export function vmairshare(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:airshare')
}

export function registerterminalclose(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:terminal:close')
}

export function registerterminalfull(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:terminal:full')
}

export function registerterminalinclayout(
  device: DEVICELIKE,
  player: string,
  inc: boolean,
) {
  device.emit(player, 'register:terminal:inclayout', inc)
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

export function sessionreset(device: DEVICELIKE) {
  device.emit('', 'sessionreset')
}

export function synthaudiobytes(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  bytes: ArrayBuffer,
) {
  device.emit(player, 'synth:audiobytes', [board, bytes])
}

export function synthaudioenabled(device: DEVICELIKE, player: string) {
  device.emit(player, 'synth:audioenabled')
}

export function synthbgplay(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  buffer: string,
  quantize: string,
) {
  device.emit(player, 'synth:bgplay', [board, buffer, quantize])
}

export function synthbgplayvolume(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  volume: number,
) {
  device.emit(player, 'synth:bgplayvolume', [board, volume])
}

export function synthflush(device: DEVICELIKE, player: string) {
  device.emit(player, 'synth:flush')
}

export function synthplay(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  buffer: string,
) {
  device.emit(player, 'synth:play', [board, buffer])
}

export function synthplayvolume(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  volume: number,
) {
  device.emit(player, 'synth:playvolume', [board, volume])
}

export function synthrecord(
  device: DEVICELIKE,
  player: string,
  filename: string,
) {
  device.emit(player, 'synth:record', filename)
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

export function synthttsclearqueue(
  device: DEVICELIKE,
  player: string,
  board: string,
) {
  device.emit(player, 'synth:ttsclearqueue', [board])
}

export function synthttsengine(
  device: DEVICELIKE,
  player: string,
  board: string,
  engine: string,
  config: string,
  model?: string,
) {
  device.emit(player, 'synth:ttsengine', [board, engine, config, model ?? ''])
}

export function synthttsinfo(
  device: DEVICELIKE,
  player: string,
  board: string,
  info: string,
) {
  device.emit(player, 'synth:ttsinfo', [board, info])
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

export function synthttsvolume(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  volume: number,
) {
  device.emit(player, 'synth:ttsvolume', [board, volume])
}

export function synthupdate(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  synthstate: SYNTH_STATE,
) {
  device.emit(player, 'synth:update', [board, synthstate])
}

export function synthvoice(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  idx: number,
  config: number | string,
  value: MAYBE<number | string | number[]>,
) {
  device.emit(player, 'synth:voice', [board, idx, config, value])
}

export function synthvoicefx(
  device: DEVICELIKE,
  player: string,
  board: string,
  idx: number,
  fx: string,
  config: number | string,
  value: MAYBE<number | string>,
) {
  device.emit(player, 'synth:voicefx', [board, idx, fx, config, value])
}

export function ttsinfo(
  device: DEVICELIKE,
  player: string,
  engine: 'piper' | 'supertonic' | 'fish',
  info: string,
  config = '',
  model = '',
) {
  device.emit(player, 'tts:info', [engine, info, config, model])
}

export function ttsrequest(
  device: DEVICELIKE,
  player: string,
  engine: 'piper' | 'supertonic' | 'fish',
  config: string,
  voice: string | number,
  phrase: string,
  model = '',
) {
  device.emit(player, 'tts:request', [engine, config, voice, phrase, model])
}

export function vmadmin(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:admin')
}

export function vmbookmarkscroll(
  device: DEVICELIKE,
  player: string,
  urllist: any[],
  codepagelist: any[],
) {
  device.emit(player, 'vm:bookmarkscroll', [urllist, codepagelist])
}

export function vmbooks(
  device: DEVICELIKE,
  player: string,
  books: string | BOOK[],
) {
  device.emit(player, 'vm:books', books)
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

export function vmcodeaddress(book: string, path: MAYBE<string>[]) {
  const [main, element] = path
  return `${book}:${[main, element].filter(ispresent).join(':')}`
}

export function vmcoderelease(
  device: DEVICELIKE,
  player: string,
  book: string,
  path: string[],
) {
  // Main-thread modem is authoritative for typing; worker Y.Doc can lag modem:sync.
  const code = modemreadtextsync(vmcodeaddress(book, path))
  device.emit(player, 'vm:coderelease', [book, path, code])
}

export function vmcodewatch(
  device: DEVICELIKE,
  player: string,
  book: string,
  path: string[],
) {
  device.emit(player, 'vm:codewatch', [book, path])
}

export function vmdoot(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:doot')
}

export function vmeditorbookmarkscroll(
  device: DEVICELIKE,
  player: string,
  editorlist: any[],
  codepagename: string,
  codepagepath: string[],
) {
  device.emit(player, 'vm:editorbookmarkscroll', [
    editorlist,
    codepagename,
    codepagepath,
  ])
}

export function vmfindany(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:findany')
}

export function vmflush(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:flush')
}

export function vmfork(device: DEVICELIKE, player: string, transfer: string) {
  device.emit(player, 'vm:fork', transfer)
}

export function vmgadgetdesync(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:gadgetdesync')
}

export function vmgadgetscroll(
  device: DEVICELIKE,
  player: string,
  payload: GADGET_SCROLL_LINES,
) {
  device.emit(player, 'vm:gadgetscroll', payload)
}

export function vmhalt(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:halt')
}

export function vminspect(device: DEVICELIKE, player: string, p1: PT, p2: PT) {
  device.emit(player, 'vm:inspect', [p1, p2])
}

export function vmlastinputtouch(
  device: DEVICELIKE,
  player: string,
  targetplayer: string,
) {
  device.emit(player, 'vm:lastinputtouch', targetplayer)
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

export function vmlocal(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:local')
}

export function vmlogin(
  device: DEVICELIKE,
  player: string,
  storage: Record<string, any>,
) {
  device.emit(player, 'vm:login', storage)
}

export function vmlogout(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:logout')
}

export function vmmakeitscroll(
  device: DEVICELIKE,
  player: string,
  makeit: string,
) {
  device.emit(player, 'vm:makeitscroll', makeit)
}

export function vmoperator(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:operator')
}

export function vmpage(device: DEVICELIKE, player: string, codepage: any) {
  device.emit(player, 'vm:page', codepage)
}

export function vmmediaqueueboard(
  device: DEVICELIKE,
  player: string,
  boardid: string,
  helperpeerid: string | undefined,
) {
  device.emit(player, 'vm:mediaqueueboard', {
    action: helperpeerid ? 'bind' : 'clear',
    boardid,
    helperpeerid: helperpeerid ?? '',
  })
}

export function vmplayermovetoboard(
  device: DEVICELIKE,
  player: string,
  targetplayer: string,
  board: string,
  dest: PT,
) {
  device.emit(player, 'vm:playermovetoboard', [targetplayer, board, dest])
}

export function vmplayertoken(
  device: DEVICELIKE,
  player: string,
  token: string,
) {
  device.emit(player, 'vm:playertoken', token)
}

export function vmpublish(
  device: DEVICELIKE,
  player: string,
  target: string,
  ...args: string[]
) {
  device.emit(player, 'vm:publish', [target, ...args])
}

export function vmreadimageimport(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:readimageimport')
}

export function vmreadzipfilelist(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:readzipfilelist')
}

export function vmrefscroll(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:refscroll')
}

export function vmrestart(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:restart')
}

export function vmsearch(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:search')
}

export function vmtapeeditorclose(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:tapeeditorclose')
}

export function vmtopic(device: DEVICELIKE, player: string, topic: string) {
  device.emit(player, 'vm:topic', topic)
}

export function vmzsswords(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:zsswords')
}

export function vmzztrandom(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:zztrandom')
}

export function vmzztsearch(
  device: DEVICELIKE,
  player: string,
  field: string,
  text: string,
) {
  device.emit(player, 'vm:zztsearch', [field, text])
}

export function workstatus(device: DEVICELIKE, player: string, status: string) {
  device.emit(player, 'workstatus', status)
}
