import Peer, { DataConnection, MediaConnection } from 'peerjs'

import type {
  MQ_DEV_CONFIG,
  MQ_INVOKE_COMMAND,
  MQ_INVOKE_MAP,
  MQ_JOB_STATE,
  MQ_READY_EVENT,
} from '../src/shared/ipc'

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
  clearcompositorplayback,
  ensurecompositor,
} from './streamcompositor'
import { readhudstate, sethudstate } from './statushud'

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
  index?: number
  url?: string
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
  stopcall: readel<HTMLButtonElement>('stopcall'),
  cleardownloads: readel<HTMLButtonElement>('cleardownloads'),
  preview: readel<HTMLVideoElement>('preview'),
  frame: document.querySelector<HTMLElement>('.frame.mq'),
}

let peer: Peer | null = null
let dataconnection: DataConnection | null = null
let mediastream: MediaStream | null = null
const playercalls = new Map<string, MQ_PLAYER_CALL>()
const pendingplayercalls = new Map<string, MediaConnection>()
let queueurls: string[] = []
let queueindex = 0
let localpeerid = ''
let playbackstarted = false
/** Latest cafe goto URL; coalesced while a start is in flight. */
let pendinggotourl = ''
let gotodraining = false
/** Bumped on each start and when a newer goto supersedes an in-flight one. */
let playbackgeneration = 0
let currentplaybackurl = ''
let currentplaybacktitle = ''
let cachebytes = 0
let downloadinflight = false
let lastdownloadpct = -1
let lastdownloadlabel = ''
let transcodepulsetimer: number | null = null
let downloadpolltimer: number | null = null
let preppolltimer: number | null = null
let endedvideo: MQ_ENDED_MEDIA | null = null
let prepstate: MQ_PREP_VIEW | null = null
let preptarget = ''

let mqdevcache: MQ_DEV_CONFIG | null = null

async function loadmqdevconfig() {
  if (!window.__TAURI__ || !window.__TAURI__.core) {
    return
  }
  try {
    mqdevcache = await window.__TAURI__.core.invoke('get_mq_dev_config')
  } catch (_) {
    mqdevcache = null
  }
}

void loadmqdevconfig()

function mqdevconfig(): MQ_DEV_CONFIG | null {
  if (mqdevcache) {
    return mqdevcache
  }
  return typeof window.mqdev === 'object' && window.mqdev ? window.mqdev : null
}

async function writemqdevfile(filepath: string, text: string) {
  if (!filepath || !window.__TAURI__ || !window.__TAURI__.core) {
    return
  }
  try {
    await window.__TAURI__.core.invoke('write_text_file', {
      path: filepath,
      text: text,
    })
  } catch (_) {}
}

function writemqpeerid(id: string) {
  if (window.__TAURI__ && window.__TAURI__.core) {
    void window.__TAURI__.core.invoke('mq_dev_peer_open', { id: id })
    return
  }
  const cfg = mqdevconfig()
  if (cfg && cfg.peeridfile) {
    void writemqdevfile(cfg.peeridfile, id)
  }
}

function writemqstatus(text: string) {
  if (window.__TAURI__ && window.__TAURI__.core) {
    void window.__TAURI__.core.invoke('mq_dev_status', { text: text })
    return
  }
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
}

function ensuretranscodepulse() {
  if (transcodepulsetimer) {
    return
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
  if (!window.__TAURI__ || !window.__TAURI__.core) {
    return Promise.reject(new Error('Tauri API missing'))
  }
  return window.__TAURI__.core.invoke(
    cmd,
    (args || {}) as MQ_INVOKE_MAP[K]['args'],
  )
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

function shortenerr(message: unknown) {
  const text = String(message)
  const lower = text.toLowerCase()
  if (lower.includes('sign in') || lower.includes('cookies-from-browser')) {
    return 'youtube needs browser login -- pick youtube cookies below'
  }
  if (text.length > 140) {
    return text.slice(0, 137) + '...'
  }
  return text
}

function defaultcookiesbrowser() {
  if (/Mac/i.test(navigator.userAgent || '')) {
    return 'safari'
  }
  if (/Win/i.test(navigator.userAgent || '')) {
    return 'chrome'
  }
  return 'chrome'
}

async function synccookiessetting() {
  if (!els.cookiesbrowser) {
    return
  }
  const browser = els.cookiesbrowser.value || ''
  try {
    await invoke('set_media_cookies_browser', { browser: browser })
    localStorage.setItem('mq-cookies-browser', browser)
  } catch (_) {}
  schedulefitwindow()
}

function initcookiessetting() {
  if (!els.cookiesbrowser) {
    return
  }
  const saved = localStorage.getItem('mq-cookies-browser')
  els.cookiesbrowser.value = saved != null ? saved : defaultcookiesbrowser()
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
  if (index !== 1 || !url || url !== preptarget) {
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
  if (!queueurls.length) {
    els.queue.value = '(empty)'
  } else {
    els.queue.value = queueurls
      .map(function (url, i) {
        return (
          (i === queueindex ? '> ' : '  ') +
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
      urls: queueurls,
      playingUrl: currentplaybackurl,
    })
    void refreshcachebytes()
  } catch (_) {}
}

async function reconcileprep() {
  if (readdevplaybackpath()) {
    return
  }
  const nexturl = queueurls.length >= 2 ? String(queueurls[1] || '').trim() : ''
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
    await invoke('start_media_prep', { url: nexturl })
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

function formatdownloadprogress(percent: number, eta: string, phase: string) {
  const pct = Math.max(0, Math.min(100, Math.round(percent || 0)))
  let line = (phase || 'downloading') + ' ' + pct + '%'
  if (eta) {
    line += ' eta ' + eta
  }
  return line
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
  const detail =
    phase === 'extracting'
      ? eta || 'starting'
      : formatdownloadprogress(percent, eta, phase)
  const dedupekey = phase + '|' + detail
  if (dedupekey === lastdownloadlabel) {
    return
  }
  lastdownloadlabel = dedupekey
  lastdownloadpct = pct
  if (phase === 'transcoding') {
    setlink('transcoding', String(pct))
    ensuretranscodepulse()
    sendstatus('transcoding', String(pct))
    return
  }
  cleardownloadpulse()
  if (phase === 'extracting') {
    setlink('extracting', eta || 'starting')
    sendstatus('extracting', eta || 'starting')
    return
  }
  const progressdetail = String(pct) + (eta ? '|' + eta : '')
  setlink('download-progress', progressdetail)
  sendstatus('download-progress', progressdetail)
}

function sendstatus(status: string, detail?: string) {
  send({ type: 'mediaqueue:status', status: status, detail: detail })
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
  let detail = current.detail
  if (playercalls.size > 0) {
    secondary = String(playercalls.size) + ' player(s)'
    if (!phase || phase === 'waiting') {
      phase = 'playing'
    }
  } else if (pendingplayercalls.size > 0) {
    secondary = String(pendingplayercalls.size) + ' player(s) waiting'
    if (!phase) {
      phase = 'waiting'
    }
  } else if (playbackstarted) {
    secondary = '0 player(s)'
    if (!phase) {
      phase = 'playing'
    }
  }
  sethudstate(phase, detail, secondary)
  writemqstatus(phase + '|' + detail + (secondary ? '|' + secondary : ''))
}

async function fitmainwindow() {
  if (!window.__TAURI__ || !window.__TAURI__.core) {
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

function closeplayercalls() {
  playercalls.forEach(function (entry) {
    try {
      entry.call.close()
    } catch (_) {}
  })
  playercalls.clear()
}

function closependingplayercalls() {
  pendingplayercalls.forEach(function (call) {
    try {
      call.close()
    } catch (_) {}
  })
  pendingplayercalls.clear()
}

function wireplayercallcleanup(call: MediaConnection, peerid: string) {
  call.on('close', function () {
    playercalls.delete(peerid)
    pendingplayercalls.delete(peerid)
    syncplayerlinkstatus()
  })
  call.on('error', function () {
    playercalls.delete(peerid)
    pendingplayercalls.delete(peerid)
    syncplayerlinkstatus()
  })
}

function answerplayercall(call: MediaConnection) {
  if (!mediastream) {
    return false
  }
  call.answer(mediastream)
  playercalls.set(call.peer, { call: call, answerstream: mediastream })
  pendingplayercalls.delete(call.peer)
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
    mediastream!.getTracks().forEach(function (track) {
      let sender: RTCRtpSender | null = null
      for (let i = 0; i < senders.length; ++i) {
        if (senders[i].track && senders[i].track!.kind === track.kind) {
          sender = senders[i]
          break
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
  currentplaybackurl = ''
  currentplaybacktitle = ''
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
    void endcall({ natural: true })
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
  if (!dataconnection || !dataconnection.open) {
    setlink('waiting', 'cafe not connected yet')
    return
  }
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
      currentplaybackurl = url || 'dev://fixture'
      setlink('buffering', path)
      sendstatus('buffering', path)
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
        currentplaybacktitle = ready.title ? String(ready.title).trim() : ''
        const label = playbacklabel(currentplaybacktitle, url, path)
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
        setlink('extracting', 'starting')
        sendstatus('extracting', 'starting')
        bindcompositorstream()
        answerpendingplayercalls()
        publishstreamtoplayers()
        startdownloadpoll()
        const downloaded = await startdownload(url)
        if (issupersededplaybackerr(null, gen)) {
          return
        }
        path = downloaded && downloaded.path ? downloaded.path : ''
        currentplaybacktitle =
          downloaded && downloaded.title ? String(downloaded.title).trim() : ''
        handledownloadprogress({ percent: 100, status: 'downloading' })
        sendstatus('download-progress', '100|')
        const label = playbacklabel(currentplaybacktitle, url, path)
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
    // Keep cafe player calls open so the next goto can publishstreamtoplayers
    // into the same PeerConnection. Closing here leaves board TV with no A/V
    // until a full reconnect (often never if activecall is a zombie).
    await endcall({ keepplayers: true })
    return
  } finally {
    if (!readdevplaybackpath()) {
      downloadinflight = false
      lastdownloadpct = -1
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
  wireplaybackended(
    playback && playback.video
      ? playback.video
      : playback && playback.audio
        ? playback.audio
        : readendedelement(),
  )
  answerpendingplayercalls()
  publishstreamtoplayers()
  syncplayerlinkstatus()
  const playinglabel = playbacklabel(currentplaybacktitle, url, path)
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
      send({
        type: 'mediaqueue:hello',
        protocol: PROTOCOL,
        role: 'helper',
        peerid: localpeerid,
      })
      sendstatus('waiting-for-url', 'add a URL in cafe #media <url>')
      maybeautostartdevfixture()
      break
    case 'mediaqueue:queue':
      queueurls = Array.isArray(msg.urls) ? msg.urls.slice() : []
      queueindex = typeof msg.index === 'number' ? msg.index : 0
      renderqueue()
      void prunequeuecache()
      void reconcileprep()
      if (queueurls.length === 0 && playbackstarted) {
        void endcall()
        setlink('connected', 'queue empty')
      }
      break
    case 'mediaqueue:goto':
      queueindex = typeof msg.index === 'number' ? msg.index : queueindex
      renderqueue()
      if (playbackstarted && msg.url && msg.url === currentplaybackurl) {
        break
      }
      void maybeautostartaftergoto(msg.url)
      break
    case 'mediaqueue:requestcall':
      if (!playbackstarted && queueurls[queueindex]) {
        void maybeautostartaftergoto(queueurls[queueindex])
      } else if (!playbackstarted) {
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
    send({
      type: 'mediaqueue:hello',
      protocol: PROTOCOL,
      role: 'helper',
      peerid: localpeerid,
    })
    maybeautostartdevfixture()
  })
  conn.on('data', handlecafemessage)
  conn.on('close', function () {
    if (dataconnection === conn) {
      dataconnection = null
    }
    void endcall()
    setlink('ready', 'waiting for cafe')
  })
  conn.on('error', function (err) {
    setlink('error', String(err))
  })
}

function destroypeer() {
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
    }
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
  startpeer()
  void refreshcachebytes()
  if (window.__TAURI__ && window.__TAURI__.event) {
    void window.__TAURI__.event.listen(
      'mq-download-progress',
      function (event) {
        handledownloadprogress(event && event.payload ? event.payload : null)
        void refreshcachebytes()
      },
    )
    void window.__TAURI__.event.listen('mq-prep-progress', function (event) {
      handleprepprogress(event && event.payload ? event.payload : null)
    })
    void window.__TAURI__.event.listen('mq-prep-ready', function (event) {
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
