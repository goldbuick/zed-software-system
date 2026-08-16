import { MEDIAQUEUE_DEFAULT_TV_VOLUME } from 'zss/feature/mediaqueue/constants'
import {
  storagereadconfigstring,
  storagewriteconfigstring,
} from 'zss/feature/storage'
import { isnumber, ispresent } from 'zss/mapping/types'

let remoteaudio: HTMLAudioElement | undefined
let gesturewired = false
let mediavolume = MEDIAQUEUE_DEFAULT_TV_VOLUME

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
  return Math.max(0, Math.min(1, mediavolume / 100))
}

function resumeremoteaudio() {
  if (!ispresent(remoteaudio) || !remoteaudio.paused) {
    return
  }
  void remoteaudio.play().catch(() => {
    // Still blocked until a stronger user gesture.
  })
}

/** Retry board TV audio after a user gesture (e.g. synth unlock). */
export function mediaqueueresumeaudio() {
  resumeremoteaudio()
}

export function mediaqueuewireaudiogestureretry() {
  if (gesturewired || typeof window === 'undefined') {
    return
  }
  gesturewired = true
  window.addEventListener('keydown', resumeremoteaudio, { capture: true })
  window.addEventListener('pointerdown', resumeremoteaudio, { capture: true })
  window.addEventListener('click', resumeremoteaudio, { capture: true })
}

function applyremoteaudiovolume() {
  if (!ispresent(remoteaudio)) {
    return
  }
  remoteaudio.volume = mediaqueueaudiogain()
}

/** Board TV speaker level (#mediavol, 0-100). Not synth #vol. */
export function mediaqueuesetmediavolume(volume: number) {
  mediavolume = volume
  applyremoteaudiovolume()
}

export function mediaqueuereadmediavolume(): number {
  return mediavolume
}

export function storemediavolconfig(volume: number) {
  void storagewriteconfigstring('mediavol', String(volume))
}

export async function restoremediavolfromstorage() {
  const raw = await storagereadconfigstring('mediavol')
  const volume = parsemediavol(raw) ?? MEDIAQUEUE_DEFAULT_TV_VOLUME
  mediaqueuesetmediavolume(volume)
}

export function mediaqueueclearremoteaudio() {
  if (!ispresent(remoteaudio)) {
    return
  }
  remoteaudio.pause()
  remoteaudio.srcObject = null
  remoteaudio.remove()
  remoteaudio = undefined
}

export function mediaqueueattachremoteaudio(audiotracks: MediaStreamTrack[]) {
  mediaqueueclearremoteaudio()
  if (audiotracks.length === 0) {
    return
  }
  mediaqueuewireaudiogestureretry()
  const audio = document.createElement('audio')
  audio.autoplay = true
  audio.setAttribute('playsinline', '')
  audio.style.display = 'none'
  document.body.appendChild(audio)
  audio.srcObject = new MediaStream(audiotracks)
  remoteaudio = audio
  applyremoteaudiovolume()
  void audio.play().catch(() => {
    // Autoplay may wait for a user gesture after #media bind.
  })
}
