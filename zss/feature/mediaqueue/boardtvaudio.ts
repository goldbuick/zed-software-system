import { apilog } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { mediaqueuesetbroadcastaudiogain } from 'zss/feature/mediaqueue/broadcastaudio'
import { MEDIAQUEUE_DEFAULT_TV_VOLUME } from 'zss/feature/mediaqueue/constants'
import {
  storagereadconfigstring,
  storagewriteconfigstring,
} from 'zss/feature/storage'
import { WASM_DEFAULT_MAIN_VOLUME } from 'zss/feature/synth/backend/wasm/wasmmainsab'
import { readmainvolumeconfig } from 'zss/feature/synth/volumeconfig'
import { isnumber, ispresent } from 'zss/mapping/types'

let remotevideo: HTMLVideoElement | undefined
let gesturehandler: (() => void) | undefined
let mediavolume = MEDIAQUEUE_DEFAULT_TV_VOLUME
let mainvolume = WASM_DEFAULT_MAIN_VOLUME

function parsemediavol(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') {
    return undefined
  }
  const volume = Number(raw)
  if (!isnumber(volume) || Number.isNaN(volume)) {
    return undefined
  }
  return volume
}

function mediaqueueaudiogain(): number {
  return Math.max(0, Math.min(1, (mediavolume / 100) * (mainvolume / 100)))
}

/** Board TV gain (0-1) from #mediavol x #vol main. */
export function mediaqueuereadaudiogain(): number {
  return mediaqueueaudiogain()
}

function applyremotevideovolume() {
  mediaqueueunlockremotevideo()
  mediaqueuesetbroadcastaudiogain(mediaqueueaudiogain())
}

/** Unmute board TV, enable audio tracks, apply #mediavol x #vol main gain. */
export function mediaqueueunlockremotevideo(video?: HTMLVideoElement) {
  const target = video ?? remotevideo
  if (!ispresent(target)) {
    return
  }
  const stream = target.srcObject
  if (
    ispresent(stream) &&
    typeof (stream as MediaStream).getAudioTracks === 'function'
  ) {
    const tracks = (stream as MediaStream).getAudioTracks()
    for (let i = 0; i < tracks.length; ++i) {
      tracks[i].enabled = true
    }
  }
  target.removeAttribute('muted')
  target.muted = false
  target.volume = mediaqueueaudiogain()
}

/**
 * AbortError means a later load/pause/play superseded this play() call -- it is
 * normal control flow, not a blocked autoplay the player can act on.
 */
function issupersededplay(err: unknown): boolean {
  return (
    ispresent(err) &&
    typeof err === 'object' &&
    'name' in err &&
    String((err as { name?: unknown }).name) === 'AbortError'
  )
}

/** Start board TV playback; report only real autoplay blocks to the tape. */
function playremotevideo(video: HTMLVideoElement) {
  mediaqueueunlockremotevideo(video)
  void video
    .play()
    .then(() => {
      mediaqueueunlockremotevideo(video)
      if (!video.muted) {
        unwireaudiogestureretry()
      }
    })
    .catch((err: unknown) => {
      if (issupersededplay(err)) {
        return
      }
      const player = registerreadplayer()
      const message =
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as { message: unknown }).message === 'string'
          ? (err as { message: string }).message
          : 'unknown error'
      apilog(SOFTWARE, player, `media board TV play blocked: ${message}`)
    })
}

function resumeremotevideo() {
  const video = remotevideo
  if (!ispresent(video)) {
    return
  }
  // Unmute + volume only; restarting a playing element on every keypress
  // aborts the in-flight play() and stutters playback.
  mediaqueueunlockremotevideo(video)
  if (video.paused) {
    playremotevideo(video)
    return
  }
  if (!video.muted) {
    unwireaudiogestureretry()
  }
}

/** Retry board TV playback after a user gesture (e.g. synth unlock). */
export function mediaqueueresumeaudio() {
  resumeremotevideo()
}

export function mediaqueuewireaudiogestureretry() {
  if (ispresent(gesturehandler) || typeof window === 'undefined') {
    return
  }
  gesturehandler = resumeremotevideo
  window.addEventListener('keydown', gesturehandler, { capture: true })
  window.addEventListener('pointerdown', gesturehandler, { capture: true })
  window.addEventListener('click', gesturehandler, { capture: true })
}

/** Playback is unmuted and running; stop touching it on every input event. */
function unwireaudiogestureretry() {
  if (!ispresent(gesturehandler) || typeof window === 'undefined') {
    return
  }
  window.removeEventListener('keydown', gesturehandler, { capture: true })
  window.removeEventListener('pointerdown', gesturehandler, { capture: true })
  window.removeEventListener('click', gesturehandler, { capture: true })
  gesturehandler = undefined
}

/** Board TV speaker trim (#mediavol, 0-100). Scaled by #vol main. */
export function mediaqueuesetmediavolume(volume: number) {
  mediavolume = volume
  applyremotevideovolume()
}

export function mediaqueuereadmediavolume(): number {
  return mediavolume
}

/** CLI #vol main scale for board TV (0-100). */
export function mediaqueuesetmainvolume(volume: number) {
  mainvolume = volume
  applyremotevideovolume()
}

export function mediaqueuereadmainvolume(): number {
  return mainvolume
}

export function storemediavolconfig(volume: number) {
  void storagewriteconfigstring('mediavol', String(volume))
}

export async function restoremediavolfromstorage() {
  const raw = await storagereadconfigstring('mediavol')
  const volume = parsemediavol(raw) ?? MEDIAQUEUE_DEFAULT_TV_VOLUME
  mediaqueuesetmediavolume(volume)
}

export async function restoremainvolfromstorage() {
  const volume = await readmainvolumeconfig()
  mediaqueuesetmainvolume(volume)
}

export function mediaqueueclearremotevideo() {
  remotevideo = undefined
}

/** Bind board TV volume + resume to the active remote video element. */
export function mediaqueuebindremotevideo(video: HTMLVideoElement) {
  remotevideo = video
  // A fresh element can be blocked again, so the gesture retry comes back.
  mediaqueuewireaudiogestureretry()
  applyremotevideovolume()
  resumeremotevideo()
}
