import { setAltInterval } from '/cc/game/img/tiles'
import { Synth } from '/cc/game/synth/synth'
import { Config } from '/cc/game/synth/SynthConfig'

// song player
let playingSong = ''
const music = new Synth()
let currentSongVolume: number | undefined

// beepbox depends on synth being global
window.beepbox = { Config, Synth }

export function playSong(song: string) {
  if (music && song !== playingSong) {
    // stop & switch song
    music.pause()
    music.setSong(song)
    music.snapToStart()

    // check song volume
    if (currentSongVolume !== undefined) {
      music.volume = currentSongVolume
    }

    // play and track active song
    music.play()
    playingSong = song
    setAltInterval(music.song?.tempo ?? 150)
  }
}

export function stopSong() {
  music?.pause()
  playingSong = ''
  setAltInterval(150)
}

export function songVolume(volume: number) {
  if (music) {
    music.volume = currentSongVolume = volume
  }
}
