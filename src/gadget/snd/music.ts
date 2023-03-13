import { setAltInterval } from '@/gadget/img/tiles'
import { Synth } from '@/gadget/synth/synth'
import { Config } from '@/gadget/synth/SynthConfig'

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
