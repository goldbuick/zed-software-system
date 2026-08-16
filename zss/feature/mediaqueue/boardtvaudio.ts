import { WASM_DEFAULT_PLAY_VOLUME } from 'zss/feature/synth/backend/wasm/wasmmainsab'
import { ispresent } from 'zss/mapping/types'

let remoteaudio: HTMLAudioElement | undefined
let gesturewired = false
let playvolume = WASM_DEFAULT_PLAY_VOLUME

function mediaqueueaudiogain(): number {
  return Math.max(0, Math.min(1, playvolume / 100))
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

/** Keep board TV speaker level in sync with #vol (0-100). Worker-safe leaf. */
export function mediaqueuesetplayvolume(volume: number) {
  playvolume = volume
  applyremoteaudiovolume()
}

export function mediaqueueclearremoteaudio() {
  if (!ispresent(remoteaudio)) {
    return
  }
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
  audio.playsInline = true
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
