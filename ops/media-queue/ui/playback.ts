import type {
  MQ_ERROR_EVENT,
  MQ_EVENT_NAME,
  MQ_INVOKE_COMMAND,
  MQ_INVOKE_MAP,
} from '../src/shared/ipc'

import { readaudio, start, stopvisualizer } from './visualizer'

export type MQ_PLAYBACK_RESULT = {
  stream: MediaStream
  video: HTMLVideoElement | null
  audio: HTMLAudioElement | null
  canvas?: HTMLCanvasElement
  usespreviewsource: boolean
}

export type MQ_DOWNLOAD_RESULT = {
  path: string
  title: string
  audioOnly: boolean
  duration: number
  artwork: string
}

type MQ_PLAYBACK_OPTS = {
  audioOnly?: boolean
  artwork?: string
}

type MQ_KEEPALIVE_VIDEO = HTMLVideoElement & {
  __mqkeepalive?: boolean
}

type MQ_KEEPALIVE_AUDIO = HTMLAudioElement & {
  __mqaudiokeepalive?: boolean
}

type MQ_CAPTURE_VIDEO = HTMLVideoElement & {
  captureStream?: () => MediaStream
}

let previewel: HTMLVideoElement | null = null
let hiddenvideo: HTMLVideoElement | null = null
let playbackpath = ''
let playbackaudioonly = false
let bloburl = ''
let playbackactive = false
let keepalivetimer: number | null = null
let ondownloadprogress: ((payload: unknown) => void) | null = null

export function attachpreview(el: HTMLVideoElement | null) {
  previewel = el || null
  if (!previewel) {
    return
  }
  previewel.playsInline = true
  previewel.muted = true
  previewel.setAttribute('playsinline', '')
}

export function setmqondownloadprogress(fn: (payload: unknown) => void) {
  ondownloadprogress = fn
}

function invoke<K extends MQ_INVOKE_COMMAND>(
  cmd: K,
  args?: MQ_INVOKE_MAP[K]['args'],
): Promise<MQ_INVOKE_MAP[K]['result']> {
  if (!window.__TAURI__ || !window.__TAURI__.core) {
    return Promise.reject(new Error('Electron API missing'))
  }
  return window.__TAURI__.core.invoke(
    cmd,
    (args || {}) as MQ_INVOKE_MAP[K]['args'],
  )
}

function listen(
  event: MQ_EVENT_NAME,
  handler: (message: { payload: unknown }) => void,
): Promise<() => void> {
  if (!window.__TAURI__ || !window.__TAURI__.event) {
    return Promise.resolve(function () {})
  }
  return window.__TAURI__.event.listen(event, handler)
}

function revokebloburl() {
  if (bloburl) {
    URL.revokeObjectURL(bloburl)
    bloburl = ''
  }
}

function decodesourceel(): HTMLVideoElement | null {
  if (playbackaudioonly) {
    return null
  }
  return hiddenvideo
}

function createdecodevideo(): HTMLVideoElement {
  const el = document.createElement('video')
  el.playsInline = true
  el.muted = false
  el.volume = 1
  el.setAttribute('playsinline', '')
  el.style.position = 'fixed'
  el.style.left = '0'
  el.style.top = '0'
  el.style.width = '320px'
  el.style.height = '180px'
  el.style.opacity = '0'
  el.style.pointerEvents = 'none'
  el.style.zIndex = '-1'
  document.body.appendChild(el)
  return el
}

function ensuredecodevideo(): HTMLVideoElement {
  if (!hiddenvideo) {
    hiddenvideo = createdecodevideo()
  }
  return hiddenvideo
}

function syncpreview(el: HTMLVideoElement) {
  if (!previewel || previewel === el) {
    return
  }
  previewel.muted = true
  previewel.playsInline = true
  previewel.srcObject = null
  if (el.src) {
    previewel.src = el.src
  } else {
    previewel.removeAttribute('src')
  }
  void previewel.play().catch(function () {})
}

function stopvideo() {
  playbackactive = false
  stopvisualizer()
  if (keepalivetimer) {
    window.clearTimeout(keepalivetimer)
    keepalivetimer = null
  }
  const el = decodesourceel()
  if (!el) {
    playbackpath = ''
    playbackaudioonly = false
    revokebloburl()
    return
  }
  try {
    el.pause()
  } catch (_) {}
  el.removeAttribute('src')
  if (el.srcObject) {
    el.srcObject = null
  }
  el.load()
  if (hiddenvideo) {
    hiddenvideo.remove()
    hiddenvideo = null
  }
  playbackpath = ''
  playbackaudioonly = false
  revokebloburl()
}

function waitforcanplay(el: HTMLMediaElement) {
  if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve()
  }
  return new Promise<void>(function (resolve, reject) {
    function cleanup() {
      el.removeEventListener('canplay', onready)
      el.removeEventListener('error', onerror)
    }
    function onready() {
      cleanup()
      resolve()
    }
    function onerror() {
      cleanup()
      let detail = 'video load failed'
      if (el.error) {
        detail += ' (code ' + el.error.code + ')'
        if (el.error.message) {
          detail += ': ' + el.error.message
        }
      }
      reject(new Error(detail))
    }
    el.addEventListener('canplay', onready)
    el.addEventListener('error', onerror)
  })
}

function waitforvideoframe(el: HTMLVideoElement) {
  if (el.videoWidth > 0 && el.videoHeight > 0) {
    return Promise.resolve()
  }
  return new Promise<void>(function (resolve, reject) {
    function cleanup() {
      el.removeEventListener('loadeddata', onready)
      el.removeEventListener('error', onerror)
    }
    function onready() {
      cleanup()
      resolve()
    }
    function onerror() {
      cleanup()
      reject(new Error('video frame size unavailable'))
    }
    el.addEventListener('loadeddata', onready)
    el.addEventListener('error', onerror)
  })
}

function tobytes(raw: unknown): Uint8Array<ArrayBuffer> {
  if (raw instanceof ArrayBuffer) {
    return new Uint8Array(raw)
  }
  if (raw instanceof Uint8Array) {
    return raw as Uint8Array<ArrayBuffer>
  }
  if (Array.isArray(raw)) {
    return new Uint8Array(raw)
  }
  throw new Error('unexpected media file payload')
}

function mediafileurl(filepath: string) {
  return 'mqmedia://local/' + encodeURIComponent(filepath)
}

async function loadlocalvideo(el: HTMLVideoElement, filepath: string) {
  revokebloburl()
  el.removeAttribute('crossorigin')
  el.src = mediafileurl(filepath)
  await waitforcanplay(el)
}

function playbackatornear_end(el: HTMLMediaElement) {
  if (el.ended) {
    return true
  }
  const duration = el.duration
  if (!Number.isFinite(duration) || duration <= 0) {
    return false
  }
  return el.currentTime >= duration - 0.1
}

function resumeplayback() {
  if (playbackaudioonly) {
    return
  }
  const active = decodesourceel()
  if (!playbackactive || !active || playbackatornear_end(active)) {
    return
  }
  if (active.paused) {
    void active.play().catch(function () {})
  }
}

function schedulekeepalive() {
  if (keepalivetimer) {
    window.clearTimeout(keepalivetimer)
  }
  const ms = document.hidden ? 16 : 2000
  keepalivetimer = window.setTimeout(function keepalivetick() {
    resumeplayback()
    if (!playbackactive) {
      keepalivetimer = null
      return
    }
    keepalivetimer = window.setTimeout(keepalivetick, ms)
  }, ms)
}

function bindkeepalive(el: MQ_KEEPALIVE_VIDEO) {
  if (el.__mqkeepalive) {
    schedulekeepalive()
    return
  }
  el.__mqkeepalive = true
  document.addEventListener('visibilitychange', function () {
    schedulekeepalive()
    resumeplayback()
  })
  window.addEventListener('blur', function () {
    resumeplayback()
  })
  window.addEventListener('focus', function () {
    resumeplayback()
  })
  el.addEventListener('pause', function () {
    if (playbackatornear_end(el)) {
      return
    }
    resumeplayback()
  })
  el.addEventListener('ended', function () {
    playbackactive = false
  })
  schedulekeepalive()
}

function bindaudiokeepalive(el: MQ_KEEPALIVE_AUDIO) {
  if (el.__mqaudiokeepalive) {
    return
  }
  el.__mqaudiokeepalive = true
  el.addEventListener('ended', function () {
    playbackactive = false
  })
}

function waitforaudiocapture(stream: MediaStream, timeoutms: number) {
  if (stream.getAudioTracks().length) {
    return Promise.resolve(stream)
  }
  return new Promise<MediaStream>(function (resolve, reject) {
    let done = false
    const timer = setTimeout(function () {
      if (done) {
        return
      }
      done = true
      stream.removeEventListener('addtrack', onadd)
      reject(new Error('video.captureStream produced no audio track'))
    }, timeoutms)
    function finish(next: MediaStream) {
      if (done) {
        return
      }
      done = true
      clearTimeout(timer)
      stream.removeEventListener('addtrack', onadd)
      resolve(next)
    }
    function onadd(evt: MediaStreamTrackEvent) {
      if (evt.track && evt.track.kind === 'audio') {
        finish(stream)
      }
    }
    stream.addEventListener('addtrack', onadd)
  })
}

async function preparelocalcapture(el: HTMLVideoElement) {
  el.muted = false
  el.volume = 1
  if (typeof el.setSinkId === 'function') {
    try {
      await el.setSinkId('none')
    } catch (_) {
      // Chromium-only; helper may play quietly if unavailable
    }
  }
}

async function capturefromvideo(el: MQ_CAPTURE_VIDEO) {
  if (typeof el.captureStream !== 'function') {
    throw new Error('video.captureStream not supported')
  }
  await preparelocalcapture(el)
  const stream = el.captureStream()
  if (!stream.getVideoTracks().length) {
    throw new Error('video.captureStream produced no video track')
  }
  await waitforaudiocapture(stream, 5000)
  return stream
}

function waitfordownload(timeoutms: number) {
  return new Promise<MQ_DOWNLOAD_RESULT>(function (resolve, reject) {
    let done = false
    let unlistenready: (() => void) | null = null
    let unlistenerror: (() => void) | null = null
    let timer: number | null = null

    function finish(
      fn: (value: never) => void,
      value: MQ_DOWNLOAD_RESULT | Error,
    ) {
      if (done) {
        return
      }
      done = true
      if (timer) {
        clearTimeout(timer)
      }
      const ready = unlistenready
      const error = unlistenerror
      unlistenready = null
      unlistenerror = null
      Promise.all([
        ready ? ready() : Promise.resolve(),
        error ? error() : Promise.resolve(),
      ]).finally(function () {
        fn(value as never)
      })
    }

    timer = setTimeout(function () {
      finish(reject, new Error('download timed out'))
    }, timeoutms)

    Promise.all([
      listen('mq-download-ready', function (event) {
        finish(resolve, (event.payload || {}) as MQ_DOWNLOAD_RESULT)
      }),
      listen('mq-download-error', function (event) {
        const payload = event.payload as MQ_ERROR_EVENT | null
        const message = (payload && payload.message) || 'download failed'
        finish(reject, new Error(message))
      }),
    ]).then(function (unsubs) {
      if (done) {
        unsubs[0]()
        unsubs[1]()
        return
      }
      unlistenready = unsubs[0]
      unlistenerror = unsubs[1]
    })
  })
}

export async function startdownload(url: string) {
  await invoke('cancel_media_download')
  const pending = waitfordownload(600000)
  await invoke('start_media_download', { url: url })
  return pending
}

async function startvideoplayback(path: string): Promise<MQ_PLAYBACK_RESULT> {
  if (playbackpath !== path || playbackaudioonly) {
    stopvideo()
  }
  const el = ensuredecodevideo()
  playbackpath = path
  playbackaudioonly = false
  await loadlocalvideo(el, path)
  syncpreview(el)
  await el.play()
  await waitforvideoframe(el)
  playbackactive = true
  bindkeepalive(el)
  const stream = await capturefromvideo(el)
  return {
    stream: stream,
    video: el,
    audio: null,
    usespreviewsource: false,
  }
}

async function startaudiovisualizer(
  path: string,
  artwork: string,
): Promise<MQ_PLAYBACK_RESULT> {
  if (playbackpath !== path || !playbackaudioonly) {
    stopvideo()
    playbackpath = path
    playbackaudioonly = true
  }
  const result = await start(path, {
    invoke: invoke,
    tobytes: tobytes,
    artwork: artwork,
  })
  playbackactive = true
  bindaudiokeepalive(result.audio)
  return {
    stream: result.stream,
    video: null,
    audio: result.audio,
    canvas: result.canvas,
    usespreviewsource: false,
  }
}

export async function startplayback(
  localpath: string,
  opts?: MQ_PLAYBACK_OPTS,
): Promise<MQ_PLAYBACK_RESULT> {
  const path = (localpath || '').trim()
  if (!path) {
    throw new Error('missing download path')
  }
  const audioonly = Boolean(opts && opts.audioOnly)
  const artwork = opts && opts.artwork ? String(opts.artwork).trim() : ''
  if (audioonly) {
    return startaudiovisualizer(path, artwork)
  }
  return startvideoplayback(path)
}

export async function stopplayback() {
  stopvideo()
}

export function readendedelement(): HTMLMediaElement | null {
  if (playbackaudioonly) {
    return readaudio()
  }
  return decodesourceel()
}

void listen('mq-download-progress', function (event) {
  if (ondownloadprogress) {
    ondownloadprogress(event.payload)
  }
})
