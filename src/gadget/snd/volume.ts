import { getAudioSfxOutput } from './context'
import { songVolume } from './music'

export function initVolumes() {
  setSfxVolume(loadSfxVolume())
  setMusicVolume(loadMusicVolume())
}

export function loadSfxVolume() {
  return parseFloat(localStorage.getItem('sfx_volume') ?? '100')
}

export function loadMusicVolume() {
  return parseFloat(localStorage.getItem('music_volume') ?? '100')
}

export function saveSfxVolume(sfx: number) {
  localStorage.setItem('sfx_volume', `${sfx}`)
}

export function saveMusicVolume(music: number) {
  localStorage.setItem('music_volume', `${music}`)
}

export function calcVolume(volume: number) {
  return (
    Math.min(1.0, Math.pow(volume / 50.0, 0.5)) *
    Math.pow(2.0, (volume - 75.0) / 25.0)
  )
}

export function setSfxVolume(sfx: number) {
  const audioSfxOutput = getAudioSfxOutput()
  if (!audioSfxOutput) {
    return
  }

  saveSfxVolume(sfx)
  if (sfx === 0) {
    audioSfxOutput.gain.value = 0
  } else {
    audioSfxOutput.gain.value = calcVolume(sfx) * 0.5
  }
}

export function setMusicVolume(music: number) {
  saveMusicVolume(music)
  songVolume(calcVolume(music))
}
