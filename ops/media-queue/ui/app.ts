import Peer, { DataConnection, MediaConnection } from 'peerjs'

import type {
  MQ_DEV_CONFIG,
  MQ_INVOKE_COMMAND,
  MQ_INVOKE_MAP,
  MQ_JOB_STATE,
  MQ_PLAYLIST_ENTRY,
  MQ_PLAYLIST_EXPAND,
  MQ_PROBE_BATCH,
  MQ_PROBE_BATCH_ENTRY,
  MQ_PROBE_META,
  MQ_PROBE_PROGRESS,
  MQ_READY_EVENT,
} from '../src/shared/ipc'
import { mqqueueneedspending } from '../src/shared/queue'
import {
  mqqueuenormalizeurl,
  mqurlisplaylistcontainer,
} from '../src/shared/urlnormalize'

import { mqpeerserveroptions } from './peerserver'
import {
  attachpreview,
  readendedelement,
  setmqondownloadprogress,
  startdownload,
  startplayback,
  stopplayback,
} from './playback'
import type { MQ_PLAYBACK_RESULT } from './playback'
import {
  PLAYER_CALL_DISCONNECT_MS,
  type PLAYER_CALL_PC_SLICE,
  playercallpcreason,
} from './playercallice'
import {
  helperqueueadd,
  helperqueueallowlong,
  helperqueueapplydisk,
  helperqueueapprove,
  helperqueueaudioonly,
  helperqueueclear,
  helperqueuecountplayer,
  helperqueuecurrenturl,
  helperqueuedurationforurl,
  helperqueuelimit,
  helperqueuenexturl,
  helperqueuepend,
  helperqueuereaddisk,
  helperqueuereadsnapshot,
  helperqueuereject,
  helperqueuesetlimit,
  helperqueueshift,
  helperqueueskip,
  helperqueueurls,
} from './queue'
import {
  clearhudmetalines,
  readhudstate,
  sethudmetalines,
  sethudstate,
} from './statushud'
import { clearcompositorplayback, ensurecompositor } from './streamcompositor'

type MQ_PLAYER_CALL = {
  call: MediaConnection
  answerstream: MediaStream
}

type MQ_CALL_METADATA = {
  kind?: string
}

type MQ_CAFE_MESSAGE = {
  type?: string
  role?: string
  peerid?: string
  urls?: string[]
  names?: string[]
  index?: number
  url?: string
  player?: string
  name?: string
  limit?: number
}

type MQ_PREP_VIEW = Partial<MQ_JOB_STATE>

type MQ_PREP_READY_PAYLOAD = {
  path?: string
}

type MQ_PROGRESS_PAYLOAD = {
  percent?: number
  eta?: string
  status?: string
  payload?: MQ_PROGRESS_PAYLOAD
}

type MQ_ENDED_MEDIA = HTMLMediaElement & {
  __mqonended?: (() => void) | null
}

type MQ_ERRORLIKE = {
  message?: string
}

const PEER_HOST = 'terminal.zed.cafe'
const PROTOCOL = 'mediaqueue/v1'
const SIGNAL_RECONNECT_WAIT_MS = 15000

function readel<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) {
    throw new Error('missing element ' + id)
  }
  return el as T
}

const els = {
  localpeer: readel<HTMLInputElement>('localpeer'),
  copypeer: readel<HTMLButtonElement>('copypeer'),
  queue: readel<HTMLTextAreaElement>('queue'),
  cookiesbrowser: readel<HTMLSelectElement>('cookiesbrowser'),
  cookieshint: readel<HTMLElement>('cookieshint'),
  stopcall: readel<HTMLButtonElement>('stopcall'),
  cleardownloads: readel<HTMLButtonElement>('cleardownloads'),
  preview: readel<HTMLVideoElement>('preview'),
  players: readel<HTMLElement>('players'),
  frame: document.querySelector<HTMLElement>('.frame.mq'),
}

let peer: Peer | null = null
let signalreconnecttimer: number | null = null
let dataconnection: DataConnection | null = null
let mediastream: MediaStream | null = null
const playercalls = new Map<string, MQ_PLAYER_CALL>()
const pendingplayercalls = new Map<string, MediaConnection>()
const playercalldroptimers = new Map<MediaConnection, number>()
const playercallpcwired = new WeakSet<RTCPeerConnection>()
let localpeerid = ''
let playbackstarted = false
/** Latest cafe goto URL; coalesced while a start is in flight. */
let pendinggotourl = ''
let gotodraining = false
/** Bumped on each start and when a newer goto supersedes an in-flight one. */
let playbackgeneration = 0
let currentplaybackurl = ''
let currentplaybacktitle = ''
let currentplaybackartist = ''
let currentplaybackalbum = ''
let currentplaybackchannel = ''
let currentplaybackaudioonly = false
let cachebytes = 0
let downloadinflight = false
let lastdownloadpct = -1
let lastdownloadlabel = ''
let transcodepulsetimer: number | null = null
let extractpulsetimer: number | null = null
let extractstartedat = 0
let extractstep = 'starting'
let downloadpolltimer: number | null = null
let preppolltimer: number | null = null
let endedvideo: MQ_ENDED_MEDIA | null = null
let prepstate: MQ_PREP_VIEW | null = null
let preptarget = ''

function mqdevconfig(): MQ_DEV_CONFIG | null {
  return typeof window.mqdev === 'object' && window.mqdev ? window.mqdev : null
}

async function writemqdevfile(filepath: string, text: string) {
  if (!filepath || !window.mqdev || !window.mqdev.writetextfile) {
    return
  }
  try {
    await window.mqdev.writetextfile(filepath, text)
  } catch (_) {}
}

function writemqpeerid(id: string) {
  const cfg = mqdevconfig()
  if (cfg && cfg.peeridfile) {
    void writemqdevfile(cfg.peeridfile, id)
  }
}

function writemqstatus(text: string) {
  const cfg = mqdevconfig()
  if (cfg && cfg.statustextfile) {
    void writemqdevfile(cfg.statustextfile, text)
  }
}

function readdevplaybackpath() {
  const cfg = mqdevconfig()
  return cfg && cfg.playbackpath ? String(cfg.playbackpath).trim() : ''
}

function maybeautostartdevfixture() {
  const devpath = readdevplaybackpath()
  if (!devpath || playbackstarted || gotodraining || !dataconnection) {
    return
  }
  void startplaybackandcall('dev://fixture')
}

function issupersededplaybackerr(err: unknown, gen: number) {
  if (gen !== playbackgeneration) {
    return true
  }
  if (!err || typeof err !== 'object') {
    return false
  }
  const name = (err as { name?: string }).name
  return name === 'AbortError'
}

function cancelinflightdownload() {
  void invoke('cancel_media_download').catch(function () {})
}

function clearendedlistener() {
  if (endedvideo && endedvideo.__mqonended) {
    endedvideo.removeEventListener('ended', endedvideo.__mqonended)
    endedvideo.__mqonended = null
  }
  endedvideo = null
}

function cleardownloadpoll() {
  if (downloadpolltimer) {
    clearInterval(downloadpolltimer)
    downloadpolltimer = null
  }
}

function clearpreppoll() {
  if (preppolltimer) {
    clearInterval(preppolltimer)
    preppolltimer = null
  }
}

function handleprepprogress(payload: unknown) {
  const data = payload as MQ_PROGRESS_PAYLOAD | null
  const raw = data && data.payload ? data.payload : data
  if (!raw) {
    return
  }
  prepstate = {
    url: preptarget,
    phase: 'downloading',
    percent: Number(raw.percent != null ? raw.percent : 0),
    status: raw.status ? String(raw.status) : 'downloading',
    detail: raw.eta ? String(raw.eta) : '',
  }
  renderqueue()
}

function startpreppoll() {
  clearpreppoll()
  preppolltimer = setInterval(function () {
    if (!preptarget) {
      clearpreppoll()
      return
    }
    void invoke('read_media_prep_state')
      .then(function (state) {
        if (!preptarget || !state) {
          return
        }
        if (state.url && state.url !== preptarget) {
          return
        }
        prepstate = state
        if (state.phase === 'ready' || state.phase === 'downloading') {
          renderqueue()
        }
        if (state.phase === 'ready' || state.phase === 'idle') {
          clearpreppoll()
        }
      })
      .catch(function () {})
  }, 500)
}

function startdownloadpoll() {
  cleardownloadpoll()
  downloadpolltimer = setInterval(function () {
    if (!downloadinflight) {
      cleardownloadpoll()
      return
    }
    void invoke('get_media_download_state')
      .then(function (state) {
        if (!downloadinflight || !state) {
          return
        }
        handledownloadprogress({
          percent: Number(state.percent),
          eta: state.detail ? String(state.detail) : '',
          status: state.status ? String(state.status) : 'downloading',
        })
      })
      .catch(function () {})
  }, 200)
}

function cleardownloadpulse() {
  if (transcodepulsetimer) {
    clearInterval(transcodepulsetimer)
    transcodepulsetimer = null
  }
  if (extractpulsetimer) {
    clearInterval(extractpulsetimer)
    extractpulsetimer = null
  }
}

function sanitizeextractstep(raw: string) {
  const trimmed = String(raw || '')
    .replace(/[^a-zA-Z0-9 ._\-:/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!trimmed) {
    return 'starting'
  }
  return trimmed.slice(0, 24)
}

function extractdetaillabel() {
  const secs = extractstartedat
    ? Math.max(0, Math.floor((Date.now() - extractstartedat) / 1000))
    : 0
  return secs + 's|' + sanitizeextractstep(extractstep)
}

function beginextractphase(step: string) {
  if (!extractstartedat) {
    extractstartedat = Date.now()
  }
  extractstep = sanitizeextractstep(step)
}

function clearextractphase() {
  extractstartedat = 0
  extractstep = 'starting'
}

function ensureextractpulse() {
  if (extractpulsetimer) {
    return
  }
  extractpulsetimer = setInterval(function () {
    if (!downloadinflight) {
      cleardownloadpulse()
      return
    }
    const detail = extractdetaillabel()
    setlink('extracting', detail)
    sendstatus('extracting', detail)
  }, 1000)
}

function ensuretranscodepulse() {
  if (transcodepulsetimer) {
    return
  }
  clearextractphase()
  if (extractpulsetimer) {
    clearInterval(extractpulsetimer)
    extractpulsetimer = null
  }
  transcodepulsetimer = setInterval(function () {
    if (!downloadinflight) {
      cleardownloadpulse()
      return
    }
    const pct = lastdownloadpct >= 0 ? lastdownloadpct : 99
    sendstatus('transcoding', String(pct))
  }, 1500)
}

function invoke<K extends MQ_INVOKE_COMMAND>(
  cmd: K,
  args?: MQ_INVOKE_MAP[K]['args'],
): Promise<MQ_INVOKE_MAP[K]['result']> {
  if (!window.mq || !window.mq.core) {
    return Promise.reject(new Error('Electron API missing'))
  }
  return window.mq.core.invoke(cmd, (args || {}) as MQ_INVOKE_MAP[K]['args'])
}

function mediabasename(path: string) {
  if (!path) {
    return ''
  }
  const parts = String(path).split(/[/\\]/)
  return parts[parts.length - 1] || path
}

function playbacklabel(title: string, url: string, path: string) {
  const trimmed = String(title || '').trim()
  if (trimmed) {
    return trimmed
  }
  const fromurl = urlfallbacklabel(url)
  if (fromurl) {
    return fromurl
  }
  return mediabasename(path)
}

const PLAYBACK_STATUS_LABEL_MAX = 120

function formatplaybackoverlaylines(
  title: string,
  url: string,
  path: string,
  artist: string,
  album: string,
  channel: string,
  audioonly: boolean,
): string[] {
  const titlepart = playbacklabel(title, url, path)
  const artistpart = String(artist || '').trim()
  const albumpart = String(album || '').trim()
  const channelpart = String(channel || '').trim()
  const parts: string[] = []
  if (artistpart) {
    parts.push(artistpart)
  } else if (!audioonly && channelpart) {
    parts.push(channelpart)
  }
  if (albumpart) {
    parts.push(albumpart)
  }
  if (titlepart) {
    parts.push(titlepart)
  }
  if (!parts.length) {
    return []
  }
  return [parts.join(' - ')]
}

function formatplaybackstatuslabel(lines: string[]): string {
  const joined = lines.filter(Boolean).join(' | ')
  if (joined.length <= PLAYBACK_STATUS_LABEL_MAX) {
    return joined
  }
  return joined.slice(0, PLAYBACK_STATUS_LABEL_MAX - 3) + '...'
}

function syncplaybackoverlaymeta(url: string, path: string) {
  const lines = formatplaybackoverlaylines(
    currentplaybacktitle,
    url,
    path,
    currentplaybackartist,
    currentplaybackalbum,
    currentplaybackchannel,
    currentplaybackaudioonly,
  )
  sethudmetalines(lines)
  return formatplaybackstatuslabel(lines)
}

function clearplaybackmeta() {
  currentplaybackurl = ''
  currentplaybacktitle = ''
  currentplaybackartist = ''
  currentplaybackalbum = ''
  currentplaybackchannel = ''
  currentplaybackaudioonly = false
  clearhudmetalines()
}

function applyreadyplaybackmeta(
  ready:
    | Pick<
        MQ_READY_EVENT,
        'title' | 'artist' | 'album' | 'channel' | 'audioOnly'
      >
    | null
    | undefined,
) {
  currentplaybacktitle = ready && ready.title ? String(ready.title).trim() : ''
  currentplaybackartist =
    ready && ready.artist ? String(ready.artist).trim() : ''
  currentplaybackalbum = ready && ready.album ? String(ready.album).trim() : ''
  currentplaybackchannel =
    ready && ready.channel ? String(ready.channel).trim() : ''
  currentplaybackaudioonly = Boolean(ready && ready.audioOnly)
}

function urlfallbacklabel(url: string) {
  const trimmed = String(url || '').trim()
  if (!trimmed) {
    return ''
  }
  try {
    const parsed = new URL(trimmed)
    const v = parsed.searchParams.get('v')
    if (v) {
      return 'youtube:' + v
    }
    const host = parsed.hostname.replace(/^www\./i, '')
    const path = parsed.pathname.replace(/\/+$/, '')
    const tail = path.split('/').filter(Boolean).pop()
    if (tail) {
      return host + '/' + tail
    }
    return host
  } catch (_) {
    return trimmed.length > 80 ? trimmed.slice(0, 77) + '...' : trimmed
  }
}

function cookiesplatform(): 'mac' | 'win' | 'other' {
  const ua = navigator.userAgent || ''
  if (/Mac/i.test(ua)) {
    return 'mac'
  }
  if (/Win/i.test(ua)) {
    return 'win'
  }
  return 'other'
}

function cookiesbrowseroptions(platform: 'mac' | 'win' | 'other'): string[] {
  if (platform === 'win') {
    return ['firefox']
  }
  if (platform === 'mac') {
    return ['chrome', 'safari', 'firefox']
  }
  return ['chrome', 'firefox']
}

function defaultcookiesbrowser(): string {
  return cookiesplatform() === 'win' ? 'firefox' : 'chrome'
}

function cookieshinttext(platform: 'mac' | 'win' | 'other'): string {
  if (platform === 'win') {
    return 'YouTube cookies can only be read from Firefox. Sign in to YouTube in Firefox, then leave this set to firefox.'
  }
  if (platform === 'mac') {
    return "Sign in to YouTube in the browser you pick (Chrome recommended). The helper reads that browser's cookies."
  }
  return "Sign in to YouTube in the browser you pick. The helper reads that browser's cookies."
}

function fillcookiesbrowserselect(platform: 'mac' | 'win' | 'other') {
  const select = els.cookiesbrowser
  select.replaceChildren()
  const off = document.createElement('option')
  off.value = ''
  off.textContent = 'off'
  select.appendChild(off)
  const names = cookiesbrowseroptions(platform)
  for (let i = 0; i < names.length; ++i) {
    const opt = document.createElement('option')
    opt.value = names[i]
    opt.textContent = names[i]
    select.appendChild(opt)
  }
}

function shortenerr(message: unknown) {
  const text = String(message)
  const lower = text.toLowerCase()
  if (lower.includes('sign in') || lower.includes('cookies-from-browser')) {
    if (cookiesplatform() === 'win') {
      return 'youtube needs firefox login -- pick youtube cookies below'
    }
    return 'youtube needs browser login -- pick youtube cookies below'
  }
  if (text.length > 140) {
    return text.slice(0, 137) + '...'
  }
  return text
}

async function synccookiessetting() {
  const browser = els.cookiesbrowser.value || ''
  try {
    await invoke('set_media_cookies_browser', { browser: browser })
    localStorage.setItem('mq-cookies-browser', browser)
  } catch (_) {}
  schedulefitwindow()
}

function initcookiessetting() {
  const platform = cookiesplatform()
  fillcookiesbrowserselect(platform)
  els.cookieshint.textContent = cookieshinttext(platform)
  const allowed = cookiesbrowseroptions(platform)
  const saved = localStorage.getItem('mq-cookies-browser')
  if (saved === '' || (saved != null && allowed.includes(saved))) {
    els.cookiesbrowser.value = saved
  } else {
    els.cookiesbrowser.value = defaultcookiesbrowser()
  }
  els.cookiesbrowser.addEventListener('change', function () {
    void synccookiessetting()
  })
  void synccookiessetting()
}

function formatbytes(bytes: number) {
  if (!bytes || bytes < 1) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return value.toFixed(unit === 0 ? 0 : 1) + ' ' + units[unit]
}

function updateclearlabel() {
  if (!els.cleardownloads) {
    return
  }
  const label =
    cachebytes > 0
      ? 'Clear downloads (' + formatbytes(cachebytes) + ')'
      : 'Clear downloads'
  els.cleardownloads.textContent = label
  schedulefitwindow()
}

async function refreshcachebytes() {
  try {
    const state = await invoke('get_media_download_state')
    cachebytes = state && state.cacheBytes ? state.cacheBytes : 0
    updateclearlabel()
  } catch (_) {
    cachebytes = 0
    updateclearlabel()
  }
}

function bindcompositorstream() {
  const stream = ensurecompositor()
  mediastream = stream
  setpreviewstream(stream)
}

function setlink(text: string | null, detail?: string) {
  const phase = String(text || '')
  const current = readhudstate()
  sethudstate(phase, detail || '', current.secondary)
  bindcompositorstream()
  const cfg = mqdevconfig()
  if (cfg && cfg.statustextfile) {
    writemqstatus(phase + '|' + String(detail || ''))
  }
  schedulefitwindow()
}

function prepbadge(index: number, url: string) {
  const nextindex = helperqueuereadsnapshot().index + 1
  if (index !== nextindex || !url || url !== preptarget) {
    return ''
  }
  if (prepstate && prepstate.phase === 'ready') {
    return ' [ready]'
  }
  if (prepstate && prepstate.phase === 'downloading') {
    const pct = Math.round(Number(prepstate.percent || 0))
    return ' [prep ' + pct + '%]'
  }
  return ' [prep]'
}

function renderqueue() {
  const snap = helperqueuereadsnapshot()
  if (!snap.urls.length) {
    els.queue.value = '(empty)'
  } else {
    els.queue.value = snap.urls
      .map(function (url, i) {
        return (
          (i === snap.index ? '> ' : '  ') +
          '[' +
          i +
          '] ' +
          url +
          prepbadge(i, url)
        )
      })
      .join('\n')
  }
  schedulefitwindow()
}

async function prunequeuecache() {
  if (readdevplaybackpath()) {
    return
  }
  try {
    await invoke('prune_media_queue_cache', {
      urls: helperqueueurls(),
      playingUrl: currentplaybackurl,
    })
    void refreshcachebytes()
  } catch (_) {}
}

async function reconcileprep() {
  if (readdevplaybackpath()) {
    return
  }
  const nexturl = helperqueuenexturl()
  if (!nexturl) {
    preptarget = ''
    prepstate = null
    clearpreppoll()
    try {
      await invoke('cancel_media_prep')
    } catch (_) {}
    renderqueue()
    return
  }
  if (preptarget === nexturl && prepstate && prepstate.phase === 'ready') {
    renderqueue()
    return
  }
  try {
    const state = await invoke('read_media_prep_state')
    if (
      state &&
      state.url === nexturl &&
      (state.phase === 'downloading' || state.phase === 'ready')
    ) {
      preptarget = nexturl
      prepstate = state
      if (state.phase === 'downloading') {
        startpreppoll()
      }
      renderqueue()
      return
    }
    preptarget = nexturl
    prepstate = { url: nexturl, phase: 'downloading', percent: 0 }
    await invoke('start_media_prep', {
      url: nexturl,
      allowlong: helperqueueallowlong(nexturl),
      audioonly: helperqueueaudioonly(nexturl),
    })
    startpreppoll()
    renderqueue()
  } catch (_) {
    renderqueue()
  }
}

function send(msg: unknown) {
  if (!dataconnection || !dataconnection.open) {
    return
  }
  dataconnection.send(msg)
}

function sendqueuesnapshot() {
  const snap = helperqueuereadsnapshot()
  send({
    type: 'mediaqueue:queuesnapshot',
    urls: snap.urls,
    names: snap.names,
    titles: snap.titles,
    submittedats: snap.submittedats,
    index: snap.index,
    limit: snap.limit,
    pendingurls: snap.pendingurls,
    pendingnames: snap.pendingnames,
    pendingtitles: snap.pendingtitles,
    pendingdurations: snap.pendingdurations,
    playedurls: snap.playedurls,
    playednames: snap.playednames,
    playedtitles: snap.playedtitles,
    playedsubmittedats: snap.playedsubmittedats,
  })
}

async function persistqueue() {
  try {
    await invoke('write_media_queue', helperqueuereaddisk())
  } catch (err) {
    setlink('error', 'queue save failed: ' + String(err))
  }
}

function afterqueuemutate() {
  renderqueue()
  sendqueuesnapshot()
  void persistqueue()
  void prunequeuecache()
  void reconcileprep()
}

function helloandresume() {
  send({
    type: 'mediaqueue:hello',
    protocol: PROTOCOL,
    role: 'helper',
    peerid: localpeerid,
  })
  sendqueuesnapshot()
  void reconcileprep()
  if (playbackstarted) {
    answerpendingplayercalls()
    publishstreamtoplayers()
    syncplayerlinkstatus()
    const playinglabel = syncplaybackoverlaymeta(currentplaybackurl, '')
    sendstatus('playing', playinglabel)
  }
}

async function advancenextitem() {
  helperqueueshift()
  afterqueuemutate()
  const next = helperqueuecurrenturl()
  if (next) {
    void maybeautostartaftergoto(next)
    return
  }
  await endcall({ natural: true, keepplayers: true })
  setlink('connected', 'queue empty')
}

function handledownloadprogress(payload: unknown) {
  if (!downloadinflight) {
    return
  }
  const data = payload as MQ_PROGRESS_PAYLOAD | null
  const raw = data && data.payload ? data.payload : data
  const percent = Number(raw && raw.percent != null ? raw.percent : 0)
  const eta = raw && raw.eta ? raw.eta : ''
  const rawstatus = raw && raw.status ? raw.status : 'downloading'
  const phase =
    rawstatus === 'extracting'
      ? 'extracting'
      : percent >= 99.5 ||
          rawstatus === 'processing' ||
          rawstatus === 'transcoding'
        ? 'transcoding'
        : rawstatus === 'downloading'
          ? 'downloading'
          : rawstatus
  const pct = Math.round(percent || 0)
  if (phase === 'transcoding') {
    clearextractphase()
    const dedupekey = 'transcoding|' + pct
    if (dedupekey !== lastdownloadlabel) {
      lastdownloadlabel = dedupekey
      lastdownloadpct = pct
      setlink('transcoding', String(pct))
      sendstatus('transcoding', String(pct))
    }
    ensuretranscodepulse()
    return
  }
  if (phase === 'extracting') {
    beginextractphase(eta || 'starting')
    const detail = extractdetaillabel()
    const dedupekey = 'extracting|' + detail
    if (dedupekey !== lastdownloadlabel) {
      lastdownloadlabel = dedupekey
      lastdownloadpct = pct
      setlink('extracting', detail)
      sendstatus('extracting', detail)
    }
    ensureextractpulse()
    return
  }
  clearextractphase()
  cleardownloadpulse()
  const progressdetail = String(pct) + (eta ? '|' + eta : '')
  const dedupekey = phase + '|' + progressdetail
  if (dedupekey === lastdownloadlabel) {
    return
  }
  lastdownloadlabel = dedupekey
  lastdownloadpct = pct
  setlink('download-progress', progressdetail)
  sendstatus('download-progress', progressdetail)
}

function sendstatus(status: string, detail?: string, player?: string) {
  const payload: {
    type: 'mediaqueue:status'
    status: string
    detail?: string
    player?: string
  } = { type: 'mediaqueue:status', status: status, detail: detail }
  if (player) {
    payload.player = player
  }
  send(payload)
}

function measurecontentheight() {
  if (!els.frame) {
    return 0
  }
  return Math.ceil(els.frame.getBoundingClientRect().height)
}

let fitwindowtimer: number | null = null
function schedulefitwindow() {
  if (fitwindowtimer) {
    clearTimeout(fitwindowtimer)
  }
  fitwindowtimer = setTimeout(function () {
    fitwindowtimer = null
    void fitmainwindow()
  }, 16)
}

function setpreviewstream(stream: MediaStream | null) {
  if (!stream) {
    els.preview.srcObject = null
  } else {
    const previewstream = new MediaStream(stream.getVideoTracks())
    els.preview.srcObject = previewstream
  }
  els.preview.muted = true
  els.preview.classList.toggle('has-stream', Boolean(stream))
  schedulefitwindow()
}

function syncplayerlinkstatus() {
  const current = readhudstate()
  let secondary = ''
  let phase = current.phase
  const detail = current.detail
  let playerslabel = '0 players'
  if (playercalls.size > 0) {
    secondary = String(playercalls.size) + ' player(s)'
    playerslabel = String(playercalls.size) + ' players connected'
    if (!phase || phase === 'waiting') {
      phase = 'playing'
    }
  } else if (pendingplayercalls.size > 0) {
    secondary = String(pendingplayercalls.size) + ' player(s) waiting'
    playerslabel = String(pendingplayercalls.size) + ' players waiting'
    if (!phase) {
      phase = 'waiting'
    }
  } else if (playbackstarted) {
    secondary = '0 player(s)'
    playerslabel = '0 players connected'
    if (!phase) {
      phase = 'playing'
    }
  }
  els.players.textContent = playerslabel
  // secondary stays in hudstate for MQ_STATUS_TEXT_FILE only -- not drawn on overlay
  sethudstate(phase, detail, secondary)
  writemqstatus(phase + '|' + detail + (secondary ? '|' + secondary : ''))
}

async function fitmainwindow() {
  if (!window.mq || !window.mq.core) {
    return
  }
  const contentheight = measurecontentheight()
  if (contentheight < 1) {
    return
  }
  try {
    await invoke('resize_main_window', { contentHeight: contentheight })
  } catch (_) {
    // Browser-only preview.
  }
}

function startwindowfitobserver() {
  if (!els.frame || typeof ResizeObserver !== 'function') {
    return
  }
  const observer = new ResizeObserver(function () {
    schedulefitwindow()
  })
  observer.observe(els.frame)
}

function clearplayercalldroptimer(call: MediaConnection) {
  const timer = playercalldroptimers.get(call)
  if (timer) {
    clearTimeout(timer)
    playercalldroptimers.delete(call)
  }
}

function clearallplayercalldroptimers() {
  playercalldroptimers.forEach(function (timer) {
    clearTimeout(timer)
  })
  playercalldroptimers.clear()
}

function forgetplayercall(peerid: string, call: MediaConnection) {
  clearplayercalldroptimer(call)
  const entry = playercalls.get(peerid)
  if (entry && entry.call === call) {
    playercalls.delete(peerid)
  }
  if (pendingplayercalls.get(peerid) === call) {
    pendingplayercalls.delete(peerid)
  }
  syncplayerlinkstatus()
}

function dropplayercall(peerid: string, call: MediaConnection) {
  forgetplayercall(peerid, call)
  try {
    call.close()
  } catch (_) {}
}

function scheduleplayercalldrop(peerid: string, call: MediaConnection) {
  if (playercalldroptimers.has(call)) {
    return
  }
  const timer = window.setTimeout(function () {
    playercalldroptimers.delete(call)
    dropplayercall(peerid, call)
  }, PLAYER_CALL_DISCONNECT_MS)
  playercalldroptimers.set(call, timer)
}

function applyplayercallpcreason(
  peerid: string,
  call: MediaConnection,
  slice?: PLAYER_CALL_PC_SLICE,
) {
  const reason = playercallpcreason(slice ?? call.peerConnection)
  if (reason === 'up' || reason === 'connecting') {
    clearplayercalldroptimer(call)
    return
  }
  if (reason === 'dead') {
    dropplayercall(peerid, call)
    return
  }
  if (reason === 'disconnected') {
    scheduleplayercalldrop(peerid, call)
  }
}

function wireplayercallcleanup(call: MediaConnection, peerid: string) {
  call.on('close', function () {
    forgetplayercall(peerid, call)
  })
  call.on('error', function () {
    forgetplayercall(peerid, call)
  })
  call.on('iceStateChanged', function (state) {
    wireplayercallpc(call, peerid)
    applyplayercallpcreason(peerid, call, {
      iceConnectionState: state,
      connectionState: call.peerConnection?.connectionState,
    })
  })
}

function wireplayercallpc(call: MediaConnection, peerid: string) {
  const pc = call.peerConnection
  if (!pc || playercallpcwired.has(pc)) {
    return
  }
  playercallpcwired.add(pc)
  const onstate = function () {
    applyplayercallpcreason(peerid, call)
  }
  pc.addEventListener('iceconnectionstatechange', onstate)
  pc.addEventListener('connectionstatechange', onstate)
  onstate()
}

function droppreviousplayercall(peerid: string, next: MediaConnection) {
  const entry = playercalls.get(peerid)
  if (entry && entry.call !== next) {
    dropplayercall(peerid, entry.call)
  }
  const pending = pendingplayercalls.get(peerid)
  if (pending && pending !== next) {
    dropplayercall(peerid, pending)
  }
}

function closeplayercalls() {
  clearallplayercalldroptimers()
  playercalls.forEach(function (entry) {
    try {
      entry.call.close()
    } catch (_) {}
  })
  playercalls.clear()
}

function closependingplayercalls() {
  pendingplayercalls.forEach(function (call) {
    clearplayercalldroptimer(call)
    try {
      call.close()
    } catch (_) {}
  })
  pendingplayercalls.clear()
}

function answerplayercall(call: MediaConnection) {
  if (!mediastream) {
    return false
  }
  droppreviousplayercall(call.peer, call)
  call.answer(mediastream)
  playercalls.set(call.peer, { call: call, answerstream: mediastream })
  pendingplayercalls.delete(call.peer)
  wireplayercallpc(call, call.peer)
  return true
}

function answerpendingplayercalls() {
  if (!mediastream) {
    return
  }
  pendingplayercalls.forEach(function (call) {
    answerplayercall(call)
  })
  pendingplayercalls.clear()
  publishstreamtoplayers()
  syncplayerlinkstatus()
}

function publishstreamtoplayers() {
  if (!mediastream) {
    return
  }
  const publisherrors: string[] = []
  playercalls.forEach(function (entry) {
    const pc = entry.call.peerConnection
    if (!pc) {
      publisherrors.push('missing peer connection for ' + entry.call.peer)
      return
    }
    const senders = pc.getSenders()
    const transceivers =
      typeof pc.getTransceivers === 'function' ? pc.getTransceivers() : []
    mediastream!.getTracks().forEach(function (track) {
      let sender: RTCRtpSender | null = null
      for (let i = 0; i < senders.length; ++i) {
        if (senders[i].track && senders[i].track!.kind === track.kind) {
          sender = senders[i]
          break
        }
      }
      // Answer-time placeholder may have been cleared; still reuse that sender.
      if (!sender) {
        for (let i = 0; i < transceivers.length; ++i) {
          const tr = transceivers[i]
          if (!tr.sender) {
            continue
          }
          const senderkind = tr.sender.track ? tr.sender.track.kind : ''
          const receiverkind =
            tr.receiver && tr.receiver.track ? tr.receiver.track.kind : ''
          if (senderkind === track.kind || receiverkind === track.kind) {
            sender = tr.sender
            break
          }
        }
      }
      if (sender && sender.track === track) {
        return
      }
      if (sender && typeof sender.replaceTrack === 'function') {
        sender.replaceTrack(track).catch(function (err) {
          publisherrors.push(
            'replaceTrack ' +
              track.kind +
              ' failed: ' +
              String((err && err.message) || err),
          )
        })
        return
      }
      if (sender) {
        try {
          pc.removeTrack(sender)
        } catch (err) {
          const errlike = err as MQ_ERRORLIKE | null
          publisherrors.push(
            'removeTrack ' +
              track.kind +
              ' failed: ' +
              String((errlike && errlike.message) || err),
          )
        }
      }
      try {
        pc.addTrack(track, mediastream!)
      } catch (err) {
        const errlike = err as MQ_ERRORLIKE | null
        publisherrors.push(
          'addTrack ' +
            track.kind +
            ' failed: ' +
            String((errlike && errlike.message) || err),
        )
      }
    })
  })
  if (publisherrors.length) {
    const detail = publisherrors.join(' | ')
    console.error('publishstreamtoplayers: ' + detail)
    sendstatus('playback-failed', detail)
    setlink('error', detail)
  }
}

function handleplayercall(call: MediaConnection) {
  const meta = (call.metadata || {}) as MQ_CALL_METADATA
  if (meta.kind !== 'mediaqueue') {
    return
  }
  droppreviousplayercall(call.peer, call)
  wireplayercallcleanup(call, call.peer)
  if (answerplayercall(call)) {
    publishstreamtoplayers()
    syncplayerlinkstatus()
    return
  }
  pendingplayercalls.set(call.peer, call)
  syncplayerlinkstatus()
}

function stopmediastream() {
  clearcompositorplayback()
  bindcompositorstream()
}

async function endcall(opts?: { natural?: boolean; keepplayers?: boolean }) {
  clearendedlistener()
  const hadcall = Boolean(
    playercalls.size > 0 || pendingplayercalls.size > 0 || playbackstarted,
  )
  const naturalend = Boolean(opts && opts.natural)
  const keepplayers = Boolean(opts && opts.keepplayers)
  if (!keepplayers) {
    closeplayercalls()
    closependingplayercalls()
  }
  stopmediastream()
  if (playbackstarted) {
    await stopplayback()
    playbackstarted = false
  }
  clearplaybackmeta()
  if (hadcall && !naturalend) {
    sendstatus('call-stopped')
  }
}

function wireplaybackended(sourcevideo: MQ_ENDED_MEDIA | null) {
  clearendedlistener()
  if (!sourcevideo) {
    return
  }
  endedvideo = sourcevideo
  function onended() {
    clearendedlistener()
    sendstatus('playback-ended', '')
    void endcall({ natural: true, keepplayers: true }).then(function () {
      void advancenextitem()
    })
    setlink('connected', 'playback ended')
  }
  sourcevideo.__mqonended = onended
  sourcevideo.addEventListener('ended', onended)
}

async function startplaybackandcall(url: string) {
  const gen = ++playbackgeneration
  if (!peer || !peer.open) {
    setlink('error', 'peer not ready')
    return
  }
  // Prep the following item while this one downloads / buffers -- same overlap
  // as the old cafe queue snapshot + goto pair.
  void reconcileprep()
  if (playbackstarted) {
    await endcall({ keepplayers: true })
    if (issupersededplaybackerr(null, gen)) {
      return
    }
  }
  let path = ''
  let playback: MQ_PLAYBACK_RESULT | null = null
  try {
    const devpath = readdevplaybackpath()
    if (devpath) {
      path = devpath
      currentplaybacktitle = 'dev fixture'
      currentplaybackartist = ''
      currentplaybackalbum = ''
      currentplaybackchannel = ''
      currentplaybackaudioonly = false
      currentplaybackurl = url || 'dev://fixture'
      const label = syncplaybackoverlaymeta(currentplaybackurl, path)
      setlink('buffering', label)
      sendstatus('buffering', label)
      playback = await startplayback(path)
      if (issupersededplaybackerr(null, gen)) {
        await stopplayback()
        return
      }
      mediastream = playback.stream
    } else {
      let ready: MQ_READY_EVENT | null = null
      try {
        ready = await invoke('take_media_prep_ready', {
          url: url,
        })
      } catch (_) {
        ready = null
      }
      if (issupersededplaybackerr(null, gen)) {
        return
      }
      if (ready && ready.path) {
        path = ready.path
        applyreadyplaybackmeta(ready)
        const label = syncplaybackoverlaymeta(url, path)
        setlink('buffering', label)
        sendstatus('buffering', label)
        playback = await startplayback(path, {
          audioOnly: Boolean(ready.audioOnly),
          artwork: ready.artwork ? String(ready.artwork).trim() : '',
        })
        if (issupersededplaybackerr(null, gen)) {
          await stopplayback()
          return
        }
        mediastream = playback.stream
      } else {
        downloadinflight = true
        lastdownloadpct = -1
        lastdownloadlabel = ''
        clearextractphase()
        beginextractphase('starting')
        const extractdetail = extractdetaillabel()
        setlink('extracting', extractdetail)
        sendstatus('extracting', extractdetail)
        ensureextractpulse()
        bindcompositorstream()
        answerpendingplayercalls()
        publishstreamtoplayers()
        startdownloadpoll()
        const downloaded = await startdownload(
          url,
          helperqueueallowlong(url),
          helperqueueaudioonly(url),
        )
        if (issupersededplaybackerr(null, gen)) {
          return
        }
        path = downloaded && downloaded.path ? downloaded.path : ''
        applyreadyplaybackmeta(downloaded)
        handledownloadprogress({ percent: 100, status: 'downloading' })
        sendstatus('download-progress', '100|')
        const label = syncplaybackoverlaymeta(url, path)
        setlink('buffering', label)
        sendstatus('buffering', label)
        playback = await startplayback(path, {
          audioOnly: Boolean(downloaded && downloaded.audioOnly),
          artwork:
            downloaded && downloaded.artwork
              ? String(downloaded.artwork).trim()
              : '',
        })
        if (issupersededplaybackerr(null, gen)) {
          await stopplayback()
          return
        }
        mediastream = playback.stream
      }
    }
  } catch (err) {
    if (issupersededplaybackerr(err, gen)) {
      return
    }
    const phase = path ? 'playback-failed' : 'download-failed'
    const message = shortenerr(err)
    setlink('error', phase + ': ' + message)
    sendstatus(phase, message)
    // Keep cafe player calls open so the next item can publishstreamtoplayers
    // into the same PeerConnection.
    await endcall({ keepplayers: true })
    void advancenextitem()
    return
  } finally {
    if (!readdevplaybackpath()) {
      downloadinflight = false
      lastdownloadpct = -1
      clearextractphase()
      cleardownloadpulse()
      cleardownloadpoll()
    }
  }
  if (issupersededplaybackerr(null, gen)) {
    await endcall({ keepplayers: true })
    return
  }
  playbackstarted = true
  currentplaybackurl = url
  if (playback && playback.usespreviewsource) {
    els.preview.classList.add('has-stream')
    schedulefitwindow()
  } else {
    setpreviewstream(mediastream)
  }
  void refreshcachebytes()
  const endedel =
    playback && playback.video
      ? playback.video
      : playback && playback.audio
        ? playback.audio
        : readendedelement()
  wireplaybackended(endedel)
  answerpendingplayercalls()
  publishstreamtoplayers()
  syncplayerlinkstatus()
  const playinglabel = syncplaybackoverlaymeta(url, path)
  sendstatus('playing', playinglabel)
  void reconcileprep()
}

async function maybeautostartaftergoto(url?: string) {
  if (!url) {
    return
  }
  pendinggotourl = url
  if (gotodraining) {
    // Abort in-flight start/download so skip / type-switch can take over.
    playbackgeneration += 1
    cancelinflightdownload()
    return
  }
  gotodraining = true
  try {
    while (pendinggotourl) {
      const next = pendinggotourl
      pendinggotourl = ''
      await startplaybackandcall(next)
    }
  } catch (err) {
    setlink('error', String(err))
    sendstatus('download-failed', String(err))
  } finally {
    gotodraining = false
    if (pendinggotourl) {
      void maybeautostartaftergoto(pendinggotourl)
    }
  }
}

function handlecafemessage(data: unknown) {
  if (!data || typeof data !== 'object') {
    return
  }
  const msg = data as MQ_CAFE_MESSAGE
  switch (msg.type) {
    case 'mediaqueue:hello':
      setlink('connected', 'cafe hello')
      helloandresume()
      maybeautostartdevfixture()
      break
    case 'mediaqueue:add': {
      const url = String(msg.url || '').trim()
      const player = String(msg.player || '')
      const name = String(msg.name || '')
      void (async () => {
        const hudbefore = readhudstate()
        setlink('queue-probe', url)
        sendstatus('queue-probe', url)
        const restorehud = () => {
          if (downloadinflight) {
            return
          }
          if (playbackstarted) {
            setlink('playing', syncplaybackoverlaymeta(currentplaybackurl, ''))
            return
          }
          const phase =
            hudbefore.phase && hudbefore.phase !== 'queue-probe'
              ? hudbefore.phase
              : 'connected'
          setlink(phase, hudbefore.detail)
        }

        type ENQUEUE_OUTCOME =
          | { kind: 'added' }
          | { kind: 'pending' }
          | { kind: 'limit' }
          | { kind: 'unplayable'; reason: string }
          | { kind: 'error'; reason: string }

        const probeentry = async (entryurl: string): Promise<MQ_PROBE_META> => {
          try {
            return await invoke('probe_media_meta', { url: entryurl })
          } catch (_) {
            return {
              title: '',
              durationsec: 0,
              failed: true,
              error: 'probe failed',
              audioonly: false,
            }
          }
        }

        const listenprobeprogress = (
          onprogress: (progress: MQ_PROBE_PROGRESS) => void,
        ): Promise<() => void> => {
          if (!window.mq || !window.mq.event) {
            return Promise.resolve(() => {})
          }
          return window.mq.event.listen('mq-probe-progress', function (event) {
            const payload = event && event.payload ? event.payload : null
            if (payload) {
              onprogress(payload as MQ_PROBE_PROGRESS)
            }
          })
        }

        const probebatch = async (
          playlisturl: string,
          count: number,
        ): Promise<MQ_PROBE_BATCH> => {
          if (count < 1) {
            return { entries: [], error: '' }
          }
          try {
            return await invoke('probe_media_batch', {
              url: playlisturl,
              count,
            })
          } catch (_) {
            return { entries: [], error: 'probe failed' }
          }
        }

        const enqueueone = (
          entryurl: string,
          fallbacktitle: string,
          meta: MQ_PROBE_META,
        ): ENQUEUE_OUTCOME => {
          if (helperqueuecountplayer(player) >= helperqueuelimit()) {
            return { kind: 'limit' }
          }
          if (meta.failed) {
            return { kind: 'unplayable', reason: meta.error }
          }
          let title = String(meta.title || '').trim()
          if (!title && fallbacktitle) {
            title = fallbacktitle
          }
          let durationsec = Number(meta.durationsec)
          if (!Number.isFinite(durationsec) || durationsec <= 0) {
            const known = helperqueuedurationforurl(entryurl)
            if (known > 0) {
              durationsec = known
            }
          }
          const payload = {
            title,
            durationsec: Number.isFinite(durationsec) ? durationsec : 0,
            submittedat: Date.now(),
            audioonly: meta.audioonly === true,
          }
          if (mqqueueneedspending(payload.durationsec)) {
            const result = helperqueuepend(player, name, entryurl, payload)
            if (!result.ok) {
              return result.reason === 'limit'
                ? { kind: 'limit' }
                : { kind: 'error', reason: result.reason }
            }
            return { kind: 'pending' }
          }
          const result = helperqueueadd(player, name, entryurl, payload)
          if (!result.ok) {
            return result.reason === 'limit'
              ? { kind: 'limit' }
              : { kind: 'error', reason: result.reason }
          }
          return { kind: 'added' }
        }

        const finishsingle = (outcome: ENQUEUE_OUTCOME, entryurl: string) => {
          if (outcome.kind === 'added') {
            sendstatus('queue-added', entryurl, player)
            restorehud()
            afterqueuemutate()
            if (!playbackstarted) {
              const current = helperqueuecurrenturl()
              if (current) {
                void maybeautostartaftergoto(current)
              }
            }
            return
          }
          if (outcome.kind === 'pending') {
            sendstatus('queue-pending', entryurl, player)
            restorehud()
            afterqueuemutate()
            return
          }
          if (outcome.kind === 'limit') {
            sendstatus('queue-error', 'limit', player)
            restorehud()
            sendqueuesnapshot()
            return
          }
          if (outcome.kind === 'unplayable') {
            sendstatus('queue-unplayable', outcome.reason || entryurl, player)
            restorehud()
            sendqueuesnapshot()
            return
          }
          sendstatus('queue-error', outcome.reason, player)
          restorehud()
          sendqueuesnapshot()
        }

        if (!mqurlisplaylistcontainer(url)) {
          finishsingle(enqueueone(url, '', await probeentry(url)), url)
          return
        }

        let expanded: MQ_PLAYLIST_EXPAND = { kind: 'single' }
        try {
          expanded = await invoke('expand_media_playlist', { url })
        } catch (_) {
          expanded = { kind: 'single' }
        }
        if (expanded.kind !== 'playlist' || expanded.entries.length < 2) {
          finishsingle(enqueueone(url, '', await probeentry(url)), url)
          return
        }

        const entries = expanded.entries
        let added = 0
        let pending = 0
        let skipped = 0
        let unplayable = 0
        let duplicate = 0
        let firstreason = ''
        // Only read metadata for entries the limit can still accept.
        const slots = helperqueuelimit() - helperqueuecountplayer(player)
        if (slots <= 0) {
          // A full queue is not the same as an unplayable playlist -- say which
          // one it is, and skip the metadata pass that has nowhere to put its
          // results. Entries awaiting approval hold slots too, so this fires
          // even when nothing is playing.
          sendstatus('queue-error', 'limit')
          sendstatus(
            'queue-playlist',
            `added=0 pending=0 skipped=${entries.length}`,
          )
          restorehud()
          sendqueuesnapshot()
          return
        }
        const wanted = entries.slice(0, slots)
        skipped += entries.length - wanted.length
        setlink('queue-probe', `0/${wanted.length}`)
        // Index the listing on both ids -- a flat listing may only know an api
        // url while the metadata pass reports the canonical page url, so
        // neither alone joins every extractor.
        const listedbykey = new Map<string, MQ_PLAYLIST_ENTRY>()
        for (const entry of wanted) {
          if (entry.id) {
            listedbykey.set(`id:${entry.id}`, entry)
          }
          if (entry.url) {
            listedbykey.set(mqqueuenormalizeurl(entry.url), entry)
          }
        }
        const resolvedkeys = new Set<string>()
        const takenkeys = new Set<string>()
        // maybeautostartaftergoto treats a second call as a skip and cancels the
        // download in flight, so kick it once and let the rest just append.
        let autostartkicked = false

        const takeentry = (found: MQ_PROBE_BATCH_ENTRY, index: number) => {
          const batchkey = found.id
            ? `id:${found.id}`
            : mqqueuenormalizeurl(found.url)
          if (takenkeys.has(batchkey)) {
            return
          }
          takenkeys.add(batchkey)
          const listed =
            listedbykey.get(`id:${found.id}`) ??
            listedbykey.get(mqqueuenormalizeurl(found.url))
          if (listed) {
            resolvedkeys.add(mqqueuenormalizeurl(listed.url))
          }
          const label = `${index}/${wanted.length} ${found.title}`.trim()
          // Leave a running playback label alone -- restorehud owns it.
          if (!downloadinflight && !playbackstarted) {
            setlink('queue-probe', label)
          }
          sendstatus('queue-probe', label)
          // The listing owns the queue url. The metadata pass rewrites
          // music.youtube.com to www.youtube.com, which would drop the
          // audio-only format ladder these art tracks want.
          const outcome = enqueueone(
            listed ? listed.url : found.url,
            listed ? listed.title : '',
            {
              title: found.title,
              durationsec: found.durationsec,
              failed: false,
              error: '',
              audioonly: found.audioonly,
            },
          )
          if (outcome.kind === 'added') {
            ++added
          } else if (outcome.kind === 'pending') {
            ++pending
          } else if (outcome.kind === 'unplayable') {
            ++unplayable
            if (!firstreason) {
              firstreason = outcome.reason
            }
            return
          } else {
            if (outcome.kind === 'error' && outcome.reason === 'duplicate') {
              ++duplicate
            }
            ++skipped
            return
          }
          // Publish as each track lands so the set fills while the scan runs.
          afterqueuemutate()
          if (!playbackstarted && !autostartkicked) {
            const current = helperqueuecurrenturl()
            if (current) {
              autostartkicked = true
              void maybeautostartaftergoto(current)
            }
          }
        }

        // The scan takes tens of seconds, so queue each entry as yt-dlp
        // resolves it rather than leaving the set empty until the whole
        // playlist lands.
        const unlistenprobe = await listenprobeprogress((progress) => {
          takeentry(progress.entry, progress.index)
        })
        // One yt-dlp pass for the whole slice. Spawning one probe per track ran
        // roughly ten times slower and drew per-host throttling that timed out
        // probes for tracks that were actually playable.
        let batch: MQ_PROBE_BATCH
        try {
          batch = await probebatch(url, wanted.length)
        } finally {
          unlistenprobe()
        }
        // The completed run is the authority: a kill on timeout can leave a
        // trailing line that never reached the stream. Already-taken entries
        // drop out here.
        for (let i = 0; i < batch.entries.length; ++i) {
          takeentry(batch.entries[i], i + 1)
        }
        // yt-dlp prints nothing for an entry it cannot extract, so whatever the
        // scan never reported is unplayable.
        for (const entry of wanted) {
          if (resolvedkeys.has(mqqueuenormalizeurl(entry.url))) {
            continue
          }
          ++unplayable
          if (!firstreason) {
            firstreason = batch.error || 'could not read this track'
          }
        }
        // One error for the batch -- a DRM album would otherwise emit one per track.
        // A playlist that queued nothing must still reach the player as an error;
        // the summary line below is too quiet to read as a failure.
        if (unplayable > 0) {
          sendstatus(
            'queue-unplayable',
            `${unplayable} of ${wanted.length} unplayable: ${firstreason}`,
          )
        } else if (added + pending === 0) {
          sendstatus(
            'queue-unplayable',
            duplicate > 0
              ? `all ${entries.length} already in queue`
              : `nothing queued from ${entries.length} tracks`,
          )
        }
        sendstatus(
          'queue-playlist',
          `added=${added} pending=${pending} skipped=${skipped + unplayable}`,
        )
        restorehud()
        afterqueuemutate()
        if (!playbackstarted && !autostartkicked && added + pending > 0) {
          const current = helperqueuecurrenturl()
          if (current) {
            void maybeautostartaftergoto(current)
          }
        }
      })()
      break
    }
    case 'mediaqueue:approve': {
      const entry = helperqueueapprove(Number(msg.index))
      if (!entry) {
        sendstatus('queue-error', 'approve')
        sendqueuesnapshot()
        break
      }
      sendstatus('queue-approved', entry.url)
      afterqueuemutate()
      if (!playbackstarted) {
        const current = helperqueuecurrenturl()
        if (current) {
          void maybeautostartaftergoto(current)
        }
      }
      break
    }
    case 'mediaqueue:reject': {
      const entry = helperqueuereject(Number(msg.index))
      if (!entry) {
        sendstatus('queue-error', 'reject')
        sendqueuesnapshot()
        break
      }
      sendstatus('queue-rejected', entry.url)
      afterqueuemutate()
      break
    }
    case 'mediaqueue:skip': {
      helperqueueskip()
      sendstatus('queue-skipped')
      afterqueuemutate()
      const next = helperqueuecurrenturl()
      if (next) {
        void maybeautostartaftergoto(next)
      } else {
        void endcall({ keepplayers: true })
        setlink('connected', 'queue empty')
      }
      break
    }
    case 'mediaqueue:clear':
      helperqueueclear()
      sendstatus('queue-cleared')
      afterqueuemutate()
      void endcall()
      setlink('connected', 'queue empty')
      break
    case 'mediaqueue:setlimit': {
      const limit = helperqueuesetlimit(Number(msg.limit))
      sendstatus('queue-limit', String(limit))
      afterqueuemutate()
      break
    }
    case 'mediaqueue:requestcall':
      if (playbackstarted) {
        answerpendingplayercalls()
        publishstreamtoplayers()
        syncplayerlinkstatus()
      } else if (helperqueuecurrenturl()) {
        void maybeautostartaftergoto(helperqueuecurrenturl())
      } else {
        sendstatus('waiting-for-url', 'queue a URL in cafe first')
        maybeautostartdevfixture()
      }
      break
    default:
      break
  }
}

function wiredataconnection(conn: DataConnection) {
  if (dataconnection && dataconnection !== conn) {
    try {
      dataconnection.close()
    } catch (_) {}
  }
  dataconnection = conn
  conn.on('open', function () {
    setlink('connected', 'data open')
    writemqstatus('connected|data open')
    helloandresume()
    maybeautostartdevfixture()
  })
  conn.on('data', handlecafemessage)
  conn.on('close', function () {
    if (dataconnection === conn) {
      dataconnection = null
    }
    setlink('waiting', 'waiting for cafe')
  })
  conn.on('error', function (err) {
    setlink('error', String(err))
  })
}

function destroypeer() {
  if (signalreconnecttimer) {
    clearTimeout(signalreconnecttimer)
    signalreconnecttimer = null
  }
  void endcall()
  if (dataconnection) {
    try {
      dataconnection.close()
    } catch (_) {}
    dataconnection = null
  }
  if (peer) {
    try {
      peer.destroy()
    } catch (_) {}
    peer = null
  }
  localpeerid = ''
  els.localpeer.value = 'restarting...'
  els.copypeer.disabled = true
  setlink('idle', '')
}

function startpeer() {
  destroypeer()
  setlink('starting', PEER_HOST)
  void startpeerasync()
}

async function startpeerasync() {
  const opts = mqpeerserveroptions({ debug: 1 })
  let requestedpeerid = ''
  try {
    const resolved = await invoke('resolve_mq_peer_id')
    if (resolved && resolved.peerid) {
      requestedpeerid = String(resolved.peerid).trim()
    }
  } catch (_) {
    requestedpeerid = ''
  }
  peer = requestedpeerid ? new Peer(requestedpeerid, opts) : new Peer(opts)
  peer.on('open', function (id) {
    if (signalreconnecttimer) {
      clearTimeout(signalreconnecttimer)
      signalreconnecttimer = null
    }
    localpeerid = id
    els.localpeer.value = id
    els.copypeer.disabled = false
    setlink('ready', '#queue <peerid> in cafe')
    writemqpeerid(id)
    writemqstatus('ready|peer open')
  })
  peer.on('connection', wiredataconnection)
  peer.on('call', handleplayercall)
  peer.on('error', function (err) {
    setlink('error', (err && err.type) || String(err))
  })
  peer.on('disconnected', function () {
    setlink('disconnected', 'signaling lost -- reconnecting')
    try {
      peer!.reconnect()
    } catch (_) {
      startpeer()
      return
    }
    if (signalreconnecttimer) {
      clearTimeout(signalreconnecttimer)
    }
    signalreconnecttimer = window.setTimeout(function () {
      signalreconnecttimer = null
      if (peer && peer.disconnected && !peer.destroyed) {
        startpeer()
      }
    }, SIGNAL_RECONNECT_WAIT_MS)
  })
}

async function copypeerid() {
  if (!localpeerid) {
    return
  }
  const cliline = '#queue "' + localpeerid + '"'
  try {
    await invoke('copy_text', { text: cliline })
    setlink(readhudstate().phase || 'ready', 'copied to clipboard')
  } catch (err) {
    setlink('error', String(err))
  }
}

async function cleardownloadcache() {
  try {
    await endcall()
    preptarget = ''
    prepstate = null
    clearpreppoll()
    const result = await invoke('clear_media_downloads')
    const count = result && result.deletedCount ? result.deletedCount : 0
    const freed = result && result.freedBytes ? result.freedBytes : 0
    cachebytes = 0
    updateclearlabel()
    setlink(
      'ready',
      'cleared ' + count + ' file(s), freed ' + formatbytes(freed),
    )
  } catch (err) {
    setlink('error', String(err))
  }
}

els.copypeer.addEventListener('click', function () {
  void copypeerid()
})
els.stopcall.addEventListener('click', function () {
  void endcall()
})
if (els.cleardownloads) {
  els.cleardownloads.addEventListener('click', function () {
    void cleardownloadcache()
  })
}

function bootfit() {
  setmqondownloadprogress(handledownloadprogress)
  attachpreview(els.preview)
  bindcompositorstream()
  setlink('starting', PEER_HOST)
  startwindowfitobserver()
  initcookiessetting()
  renderqueue()
  void invoke('read_media_queue')
    .then(function (disk) {
      helperqueueapplydisk(disk)
      renderqueue()
      void reconcileprep()
    })
    .catch(function (err) {
      setlink('error', 'queue load failed: ' + String(err))
    })
    .then(function () {
      startpeer()
    })
  void refreshcachebytes()
  if (window.mq && window.mq.event) {
    void window.mq.event.listen('mq-download-progress', function (event) {
      handledownloadprogress(event && event.payload ? event.payload : null)
      void refreshcachebytes()
    })
    void window.mq.event.listen('mq-prep-progress', function (event) {
      handleprepprogress(event && event.payload ? event.payload : null)
    })
    void window.mq.event.listen('mq-prep-ready', function (event) {
      const payload = (
        event && event.payload ? event.payload : null
      ) as MQ_PREP_READY_PAYLOAD | null
      if (payload && preptarget) {
        prepstate = {
          url: preptarget,
          phase: 'ready',
          percent: 100,
          status: 'ready',
          detail: '',
          path: payload.path || '',
        }
        clearpreppoll()
        renderqueue()
        void refreshcachebytes()
      }
    })
  }
  void fitmainwindow()
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(bootfit)
} else {
  window.addEventListener('load', bootfit)
}
