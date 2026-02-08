import { EQ3, Filter, Gain, NoiseSynth, PolySynth, Time, Volume } from 'tone'

export function createpercussion(drumvolume: Volume, drumaction: Volume) {
  const drumcowbellfilter = new Filter(350, 'bandpass').connect(drumvolume)
  const drumcowbellgain = new Gain().connect(drumcowbellfilter)
  drumcowbellgain.gain.value = 0

  const drumcowbell = new PolySynth().connect(drumcowbellgain)
  drumcowbell.volume.value = 16.0
  drumcowbell.maxPolyphony = 8
  drumcowbell.set({
    envelope: {
      attack: 0.001,
      decay: 0.01,
      sustain: 0.1,
      release: 0.1,
    },
    oscillator: { type: 'square' },
  })

  const drumclapeq = new EQ3(-10, 10, -1).connect(drumvolume)
  drumclapeq.connect(drumaction)
  const drumclapfilter = new Filter(800, 'highpass', -12)
  drumclapfilter.connect(drumclapeq)

  const drumclap = new NoiseSynth()
  drumclap.set({
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.1,
      release: 0.1,
    },
  })
  drumclap.connect(drumclapfilter)

  return {
    cowbelltrigger(duration: string, time: number) {
      const ramp = Time('64n').toSeconds() + Time(duration).toSeconds()
      drumcowbellgain.gain.setValueAtTime(0.5, time)
      drumcowbellgain.gain.exponentialRampToValueAtTime(0.01, ramp + time)
      drumcowbell.triggerAttackRelease([800, 540], duration, time)
    },
    claptrigger(duration: string, time: number) {
      drumclap.triggerAttackRelease(duration, time)
    },
  }
}
