import { EQ3, Filter, NoiseSynth, Volume } from 'tone'

export function createhihat(drumvolume: Volume) {
  const drumhihateq = new EQ3(-6, 6, 10).connect(drumvolume)
  const drumhihatfilter = new Filter(8000, 'highpass', -12)
  drumhihatfilter.connect(drumhihateq)

  const drumhihat = new NoiseSynth()
  drumhihat.set({
    envelope: {
      attack: 0.001,
      decay: 0.05,
      sustain: 0.001,
      release: 0.05,
    },
  })
  drumhihat.connect(drumhihatfilter)

  const drumhihatopeneq = new EQ3(-6, 3, 8).connect(drumvolume)
  const drumhihatopenfilter = new Filter(6000, 'highpass', -12)
  drumhihatopenfilter.connect(drumhihatopeneq)

  const drumhihatopen = new NoiseSynth()
  drumhihatopen.set({
    envelope: {
      attack: 0.001,
      decay: 0.2,
      sustain: 0.1,
      release: 0.3,
    },
  })
  drumhihatopen.connect(drumhihatopenfilter)

  return {
    ticktrigger(time: number) {
      drumhihat.triggerAttackRelease('16n', time)
    },
    tweettrigger(time: number) {
      drumhihatopen.triggerAttackRelease('8n', time)
    },
  }
}
