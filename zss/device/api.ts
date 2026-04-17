/*
what is api? a set of common helper functions to send messages to devices
without having to include device code
*/
import type { BRIDGE_CHAT_START_OBJECT } from 'zss/device/bridge/chattypes'
import type { AGENTS_ROSTER } from 'zss/feature/heavy/agentsroster'
import type { HEAVY_LLM_PRESET } from 'zss/feature/heavy/heavyllmpreset'
import type {
  JSONSYNC_ANTI,
  JSONSYNC_PATCH,
  JSONSYNC_SNAPSHOT,
} from 'zss/feature/jsonsync'
import { INPUT, SYNTH_STATE } from 'zss/gadget/data/types'
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

/** Worker → client hook for Playwright E2E: loader lifecycle (forwarded as `register:e2eloaderevent`). */
export type E2E_LOADER_NOTIFY = {
  phase: 'start' | 'done'
  eventname: string
  format: string
}

export function apie2eloadernotify(
  device: DEVICELIKE,
  player: string,
  detail: E2E_LOADER_NOTIFY,
) {
  device.emit(player, 'register:e2eloaderevent', detail)
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

export function bridgechatlist(device: DEVICELIKE, player: string) {
  device.emit(player, 'bridge:chatlist', undefined)
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

// --- jsonsync ---------------------------------------------------------------

export type JSONSYNC_CHANGED = {
  streamid: string
  reason: 'snapshot' | 'serverpatch' | 'antipatch'
  cv: number
  sv: number
  document: unknown
}

export function jsonsyncsnapshot(
  device: DEVICELIKE,
  player: string,
  payload: JSONSYNC_SNAPSHOT,
) {
  device.emit(player, 'jsonsyncclient:snapshot', payload)
}

export function jsonsyncserverpatch(
  device: DEVICELIKE,
  player: string,
  payload: JSONSYNC_PATCH,
) {
  device.emit(player, 'jsonsyncclient:serverpatch', payload)
}

export function jsonsyncclientpatch(
  device: DEVICELIKE,
  player: string,
  payload: JSONSYNC_PATCH,
) {
  device.emit(player, 'jsonsyncserver:clientpatch', payload)
}

export function jsonsyncantipatch(
  device: DEVICELIKE,
  player: string,
  payload: JSONSYNC_ANTI,
) {
  device.emit(player, 'jsonsyncclient:antipatch', payload)
}

export function jsonsyncneedsnapshot(
  device: DEVICELIKE,
  player: string,
  streamid: string,
) {
  device.emit(player, 'jsonsyncserver:needsnapshot', { streamid })
}

export function jsonsyncserversnapshotrequest(
  device: DEVICELIKE,
  player: string,
  streamid: string,
) {
  device.emit(player, 'jsonsyncclient:needsnapshot', { streamid })
}

// poke: zero-payload "something changed" ping per Neil Fraser's DiffSync paper.
// the client responds by running its own diff cycle against its local shadow and
// emitting a clientpatch to pull the update.
export function jsonsyncpoke(
  device: DEVICELIKE,
  player: string,
  streamid: string,
) {
  device.emit(player, 'jsonsyncclient:poke', { streamid })
}

// local broadcast: any device that subscribes to the `jsonsync` topic (or `all`)
// will receive this whenever the client-side shadow mutates.
export function jsonsyncchanged(device: DEVICELIKE, payload: JSONSYNC_CHANGED) {
  device.emit('', 'jsonsync:changed', payload)
}

export function gadgetserverclearscroll(device: DEVICELIKE, player: string) {
  device.emit(player, 'gadgetserver:clearscroll')
}

export function heavyttsinfo(
  device: DEVICELIKE,
  player: string,
  engine: 'piper' | 'supertonic',
  info: string,
) {
  device.emit(player, 'heavy:ttsinfo', [engine, info])
}

export function heavyttsrequest(
  device: DEVICELIKE,
  player: string,
  engine: 'piper' | 'supertonic',
  config: string,
  voice: string | number,
  phrase: string,
) {
  device.emit(player, 'heavy:ttsrequest', [engine, config, voice, phrase])
}

type MODEL_PROMPT_ARGS = {
  prompt: string
  agentid: string
  agentname: string
  lastinputtime: number
  nearestrefid: string
  nearestrefname: string
  promptlogging: string
}

export function heavymodelprompt(
  device: DEVICELIKE,
  player: string,
  {
    prompt,
    agentid,
    agentname,
    lastinputtime,
    nearestrefid,
    nearestrefname,
    promptlogging,
  }: MODEL_PROMPT_ARGS,
) {
  device.emit(player, 'heavy:modelprompt', [
    prompt,
    agentid,
    agentname,
    lastinputtime,
    nearestrefid,
    nearestrefname,
    promptlogging,
  ])
}

export function heavymodelstop(
  device: DEVICELIKE,
  player: string,
  agentid: string,
) {
  device.emit(player, 'heavy:modelstop', agentid)
}

export function vmlastinputtouch(
  device: DEVICELIKE,
  player: string,
  targetplayer: string,
) {
  device.emit(player, 'vm:lastinputtouch', targetplayer)
}

export function vmpilotclear(
  device: DEVICELIKE,
  player: string,
  playerid: string,
) {
  device.emit(player, 'vm:pilotclear', playerid)
}

export function heavyagentstart(
  device: DEVICELIKE,
  player: string,
  agentname?: string,
) {
  device.emit(player, 'heavy:agentstart', agentname)
}

export function heavyagentname(
  device: DEVICELIKE,
  player: string,
  agentid: string,
  agentname: string,
) {
  device.emit(player, 'heavy:agentname', [agentid, agentname])
}

/** When `#set user` updates player flags, sync display name to heavy roster if `player` is an agent (no-op for humans). */
export function heavyagentsyncuserdisplay(
  device: DEVICELIKE,
  player: string,
  agentid: string,
  displayname: string,
) {
  device.emit(player, 'heavy:syncuserdisplay', [agentid, displayname])
}

export function heavyagentstop(
  device: DEVICELIKE,
  player: string,
  agentid: string,
) {
  device.emit(player, 'heavy:agentstop', agentid)
}

export function heavyagentlist(device: DEVICELIKE, player: string) {
  device.emit(player, 'heavy:agentlist')
}

export function heavyrestoreagents(
  device: DEVICELIKE,
  player: string,
  roster: AGENTS_ROSTER,
) {
  device.emit(player, 'heavy:restoreagents', roster)
}

/** Worker applies preset (dispose main generator). Use `{ toast: false }` after login restore. */
export function heavyllmpreset(
  device: DEVICELIKE,
  player: string,
  preset: HEAVY_LLM_PRESET,
  options?: { toast?: boolean },
) {
  const wantstoast = options?.toast !== false
  device.emit(player, 'heavy:llmpreset', wantstoast ? preset : [preset, false])
}

/** Main-thread register: start/stop per-agent vm:doot from client `second` ticks (heavy worker → client). */
export function registeragentdooton(
  device: DEVICELIKE,
  player: string,
  agentid: string,
) {
  device.emit(player, 'register:agentdooton', agentid)
}

export function registeragentdootoff(
  device: DEVICELIKE,
  player: string,
  agentid: string,
) {
  device.emit(player, 'register:agentdootoff', agentid)
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

export function registerloginready(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:loginready', true)
}

export function registerboardrunnerask(
  device: DEVICELIKE,
  player: string,
  board: string,
) {
  device.emit(player, 'register:boardrunnerask', board)
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

export function registerscreenshot(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:screenshot')
}

export function registerdownloadjsonfile(
  device: DEVICELIKE,
  player: string,
  data: any,
  filename: string,
) {
  device.emit(player, 'register:downloadjsonfile', [data, filename])
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
  device.emit(player, 'synth:audioenabled')
}

export function synthaudiobuffer(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  audiobuffer: AudioBuffer,
) {
  device.emit(player, 'synth:audiobuffer', [board, audiobuffer])
}

export function synthplay(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  buffer: string,
) {
  device.emit(player, 'synth:play', [board, buffer])
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

export function synthplayvolume(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  volume: number,
) {
  device.emit(player, 'synth:playvolume', [board, volume])
}

export function synthbgplayvolume(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  volume: number,
) {
  device.emit(player, 'synth:bgplayvolume', [board, volume])
}

export function synthttsvolume(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  volume: number,
) {
  device.emit(player, 'synth:ttsvolume', [board, volume])
}

export function synthttsengine(
  device: DEVICELIKE,
  player: string,
  board: string,
  engine: string,
  config: string,
) {
  device.emit(player, 'synth:ttsengine', [board, engine, config])
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

export function synthttsclearqueue(
  device: DEVICELIKE,
  player: string,
  board: string,
) {
  device.emit(player, 'synth:ttsclearqueue', [board])
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

export function synthupdate(
  device: DEVICELIKE,
  player: string,
  board: MAYBE<string>,
  synthstate: SYNTH_STATE,
) {
  device.emit(player, 'synth:update', [board, synthstate])
}

export function registerstore(
  device: DEVICELIKE,
  player: string,
  name: string,
  value: any,
) {
  device.emit(player, 'register:store', [name, value])
}

export function vmpullvarresult(
  device: DEVICELIKE,
  player: string,
  data: { id: string; value?: unknown; error?: string },
) {
  device.emit(player, 'vm:pullvarresult', data)
}

export function heavypullvarresult(
  device: DEVICELIKE,
  player: string,
  data: { id: string; value?: unknown; error?: string },
) {
  device.emit(player, 'heavy:pullvarresult', data)
}

export function registerbookmarkscroll(
  device: DEVICELIKE,
  player: string,
  includecodepages: boolean,
) {
  device.emit(player, 'register:bookmarkscroll', includecodepages)
}

export function registerbookmarkclisave(
  device: DEVICELIKE,
  player: string,
  line: string,
) {
  device.emit(player, 'register:bookmark:clisave', line)
}

export function registerbookmarkclirun(
  device: DEVICELIKE,
  player: string,
  id: string,
) {
  device.emit(player, 'register:bookmark:clirun', id)
}

export function registerbookmarkurlsave(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:bookmark:urlsave', true)
}

export function registerbookmarkurlnavigate(
  device: DEVICELIKE,
  player: string,
  href: string,
) {
  device.emit(player, 'register:bookmark:urlnavigate', href)
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

export function registerbookmarkcodepagecopytogame(
  device: DEVICELIKE,
  player: string,
  id: string,
) {
  device.emit(player, 'register:bookmark:codepagecopytogame', id)
}

export function registerbookmarkdelete(
  device: DEVICELIKE,
  player: string,
  id: string,
) {
  device.emit(player, 'register:bookmark:delete', id)
}

export type GADGET_SCROLL_LINES = {
  scrollname: string
  content: string
  chip?: string
}

export function vmbookmarkscroll(
  device: DEVICELIKE,
  player: string,
  urllist: any[],
  codepagelist: any[],
) {
  device.emit(player, 'vm:bookmarkscroll', [urllist, codepagelist])
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

export function vmcodepagesnapshot(
  device: DEVICELIKE,
  player: string,
  book: string,
  path: string[],
  edtype: string,
  edtitle: string,
) {
  device.emit(player, 'vm:codepagesnapshot', [book, path, edtype, edtitle])
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

export function registereditorclose(device: DEVICELIKE, player: string) {
  device.emit(player, 'register:editor:close')
}

export function vmtapeeditorclose(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:tapeeditorclose')
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

export function vmpage(device: DEVICELIKE, player: string, codepage: any) {
  device.emit(player, 'vm:page', codepage)
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

export function vmplayertoken(
  device: DEVICELIKE,
  player: string,
  token: string,
) {
  device.emit(player, 'vm:playertoken', token)
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

export function vmpilotstart(
  device: DEVICELIKE,
  player: string,
  x: number,
  y: number,
) {
  device.emit(player, 'vm:pilotstart', { x, y })
}

export function vmpilotstop(device: DEVICELIKE, player: string) {
  device.emit(player, 'vm:pilotstop')
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

export function vmgadgetscroll(
  device: DEVICELIKE,
  player: string,
  payload: GADGET_SCROLL_LINES,
) {
  device.emit(player, 'vm:gadgetscroll', payload)
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
