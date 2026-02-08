import { MembraneSynth, Volume } from 'tone'

export function createbass(drumvolume: Volume, drumaction: Volume) {
  const drumbass = new MembraneSynth().connect(drumvolume)
  drumbass.set({
    octaves: 8,
    volume: 8.0,
    pitchDecay: 0.125,
  })
  drumbass.connect(drumaction)

  return {
    basstrigger(time: number) {
      drumbass.triggerAttackRelease('C1', '8n', time)
    },
  }
}
