import type { MQ_INVOKE_COMMAND, MQ_INVOKE_MAP } from '../src/shared/ipc'

import {
  MQ_CANVAS_CSS_HEIGHT,
  MQ_CANVAS_CSS_WIDTH,
  MQ_CANVAS_HEIGHT,
  MQ_CANVAS_WIDTH,
} from './tvcanvas'
import { classicbarspreset } from './visualizerpresets/classicbars'
import { classicscopepreset } from './visualizerpresets/classicscope'
import { geisspreset } from './visualizerpresets/geiss'
import { milkdroppreset } from './visualizerpresets/milkdrop'
import type {
  MQ_VISUALIZER_PRESET,
  MQ_VISUALIZER_PRESET_HANDLE,
} from './visualizerpresets/types'

type MQ_VISUALIZER_DEPS = {
  invoke: <K extends MQ_INVOKE_COMMAND>(
    cmd: K,
    args?: MQ_INVOKE_MAP[K]['args'],
  ) => Promise<MQ_INVOKE_MAP[K]['result']>
  tobytes: (raw: unknown) => Uint8Array<ArrayBuffer>
  artwork?: string
}

type MQ_VISUALIZER_RESULT = {
  /** Audio-only stream for the compositor to publish. */
  audiostream: MediaStream
  audio: HTMLAudioElement
  canvas: HTMLCanvasElement
}

const PRESET_POOL: MQ_VISUALIZER_PRESET[] = [
  classicbarspreset,
  classicscopepreset,
  geisspreset,
  milkdroppreset,
]

let canvasel: HTMLCanvasElement | null = null
let audioel: HTMLAudioElement | null = null
let bloburl = ''
let artworkbloburl = ''
let artworkimage: HTMLImageElement | null = null
let audioctx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let timedata: Uint8Array<ArrayBuffer> | null = null
let freqdata: Uint8Array<ArrayBuffer> | null = null
let presethandle: MQ_VISUALIZER_PRESET_HANDLE | null = null
let activepresetid = ''

function mimetypefrompath(filepath: string) {
  const ext = String(filepath || '')
    .split('.')
    .pop()!
    .toLowerCase()
  switch (ext) {
    case 'm4a':
      return 'audio/mp4'
    case 'mp3':
      return 'audio/mpeg'
    case 'opus':
      return 'audio/opus'
    case 'webm':
      return 'audio/webm'
    case 'ogg':
      return 'audio/ogg'
    case 'aac':
      return 'audio/aac'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    default:
      return 'audio/mp4'
  }
}

function revokebloburl() {
  if (bloburl) {
    URL.revokeObjectURL(bloburl)
    bloburl = ''
  }
}

function revokeartworkbloburl() {
  if (artworkbloburl) {
    URL.revokeObjectURL(artworkbloburl)
    artworkbloburl = ''
  }
  artworkimage = null
}

function ensurecanvas(): HTMLCanvasElement {
  if (canvasel) {
    return canvasel
  }
  canvasel = document.createElement('canvas')
  canvasel.width = MQ_CANVAS_WIDTH
  canvasel.height = MQ_CANVAS_HEIGHT
  canvasel.style.position = 'fixed'
  canvasel.style.left = '0'
  canvasel.style.top = '0'
  canvasel.style.width = `${MQ_CANVAS_CSS_WIDTH}px`
  canvasel.style.height = `${MQ_CANVAS_CSS_HEIGHT}px`
  canvasel.style.opacity = '0'
  canvasel.style.pointerEvents = 'none'
  canvasel.style.zIndex = '-1'
  document.body.appendChild(canvasel)
  return canvasel
}

function ensureaudio(): HTMLAudioElement {
  if (audioel) {
    return audioel
  }
  audioel = document.createElement('audio')
  audioel.muted = false
  audioel.volume = 1
  audioel.setAttribute('playsinline', '')
  audioel.style.position = 'fixed'
  audioel.style.left = '0'
  audioel.style.top = '0'
  audioel.style.width = '1px'
  audioel.style.height = '1px'
  audioel.style.opacity = '0'
  audioel.style.pointerEvents = 'none'
  audioel.style.zIndex = '-1'
  document.body.appendChild(audioel)
  return audioel
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
      if (!el.isConnected || !el.getAttribute('src')) {
        reject(new DOMException('playback superseded', 'AbortError'))
        return
      }
      let detail = 'audio load failed'
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

function waitforimageload(img: HTMLImageElement) {
  if (img.complete && img.naturalWidth > 0) {
    return Promise.resolve()
  }
  return new Promise<void>(function (resolve, reject) {
    function cleanup() {
      img.removeEventListener('load', onready)
      img.removeEventListener('error', onerror)
    }
    function onready() {
      cleanup()
      resolve()
    }
    function onerror() {
      cleanup()
      reject(new Error('artwork load failed'))
    }
    img.addEventListener('load', onready)
    img.addEventListener('error', onerror)
  })
}

async function loadartwork(
  artworkpath: string,
  invoke: MQ_VISUALIZER_DEPS['invoke'],
  tobytes: MQ_VISUALIZER_DEPS['tobytes'],
): Promise<HTMLImageElement | null> {
  const trimmed = String(artworkpath || '').trim()
  if (!trimmed) {
    return null
  }
  revokeartworkbloburl()
  const raw = await invoke('read_media_file', { path: trimmed })
  const bytes = tobytes(raw)
  if (!bytes.length) {
    return null
  }
  const blob = new Blob([bytes], { type: mimetypefrompath(trimmed) })
  artworkbloburl = URL.createObjectURL(blob)
  const img = new Image()
  img.src = artworkbloburl
  await waitforimageload(img)
  artworkimage = img
  return img
}

function pickrandompreset(): MQ_VISUALIZER_PRESET {
  const idx = Math.floor(Math.random() * PRESET_POOL.length)
  return PRESET_POOL[idx]
}

export function stopvisualizer() {
  if (presethandle) {
    try {
      presethandle.stop()
    } catch (_) {}
    presethandle = null
  }
  activepresetid = ''
  if (audioctx) {
    void audioctx.close().catch(function () {})
    audioctx = null
  }
  analyser = null
  timedata = null
  freqdata = null
  if (audioel) {
    try {
      audioel.pause()
    } catch (_) {}
    audioel.removeAttribute('src')
    audioel.load()
    audioel.remove()
    audioel = null
  }
  if (canvasel) {
    canvasel.remove()
    canvasel = null
  }
  revokebloburl()
  revokeartworkbloburl()
}

async function loadlocalaudio(
  path: string,
  invoke: MQ_VISUALIZER_DEPS['invoke'],
  tobytes: MQ_VISUALIZER_DEPS['tobytes'],
): Promise<HTMLAudioElement> {
  revokebloburl()
  const raw = await invoke('read_media_file', { path: path })
  const bytes = tobytes(raw)
  if (!bytes.length) {
    throw new Error('media file is empty')
  }
  const blob = new Blob([bytes], { type: mimetypefrompath(path) })
  bloburl = URL.createObjectURL(blob)
  const el = ensureaudio()
  el.src = bloburl
  await waitforcanplay(el)
  return el
}

export async function start(
  path: string,
  deps: MQ_VISUALIZER_DEPS,
): Promise<MQ_VISUALIZER_RESULT> {
  stopvisualizer()
  const invoke = deps.invoke
  const tobytes = deps.tobytes
  const el = await loadlocalaudio(path, invoke, tobytes)
  try {
    await loadartwork(deps.artwork || '', invoke, tobytes)
  } catch (_) {
    revokeartworkbloburl()
  }
  const canvas = ensurecanvas()
  // MediaElementSource steals element speakers and fans out to analyser + PeerJS.
  audioctx = new AudioContext()
  analyser = audioctx.createAnalyser()
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.8
  timedata = new Uint8Array(analyser.fftSize)
  freqdata = new Uint8Array(analyser.frequencyBinCount)
  const silent = audioctx.createGain()
  silent.gain.value = 0
  const capturedest = audioctx.createMediaStreamDestination()
  const source = audioctx.createMediaElementSource(el)
  source.connect(analyser)
  analyser.connect(silent)
  silent.connect(audioctx.destination)
  source.connect(capturedest)
  await audioctx.resume()
  await el.play()

  const preset = pickrandompreset()
  activepresetid = preset.id
  console.log('[mq visualizer] preset ' + preset.id)
  try {
    presethandle = await preset.start({
      canvas: canvas,
      audioctx: audioctx,
      analyser: analyser,
      source: source,
      artwork: artworkimage,
      timedata: timedata,
      freqdata: freqdata,
    })
  } catch (err) {
    const message = String((err && (err as Error).message) || err)
    stopvisualizer()
    throw new Error('visualizer preset ' + preset.id + ' failed: ' + message)
  }

  const audiostream = capturedest.stream
  if (!audiostream.getAudioTracks().length) {
    stopvisualizer()
    throw new Error('visualizer produced no audio track')
  }
  return {
    audiostream: audiostream,
    audio: el,
    canvas: canvas,
  }
}

export function readaudio(): HTMLAudioElement | null {
  return audioel
}

export function readactivepresetid(): string {
  return activepresetid
}
