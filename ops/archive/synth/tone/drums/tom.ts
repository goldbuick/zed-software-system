import { Frequency, Gain, NoiseSynth, Synth, Time, Volume } from 'tone'

export function createtom(drumvolume: Volume) {
  const tombus = new Gain(1).connect(drumvolume)
  const drumlowtomosc = new Synth().connect(tombus)
  drumlowtomosc.set({
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: { type: 'sawtooth' },
  })

  const drumlowtomosc2 = new Synth().connect(tombus)
  drumlowtomosc2.set({
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: { type: 'triangle' },
  })

  const drumlowtomnoise = new NoiseSynth().connect(tombus)
  drumlowtomnoise.set({
    envelope: {
      attack: 0.01,
      decay: 0.08,
      sustain: 0.001,
      release: 0.08,
    },
  })

  return {
    lowtomtrigger(duration: string, time: number) {
      const margin = Time('256n').toSeconds()
      const ramp = Time(duration).toSeconds() - margin

      drumlowtomosc.triggerAttackRelease('C4', ramp, time, 1)
      drumlowtomosc.frequency.exponentialRampToValueAtTime(
        Frequency('C0').toFrequency(),
        time + ramp,
      )

      drumlowtomosc2.triggerAttackRelease('C5', ramp, time, 0.5)
      drumlowtomosc2.frequency.exponentialRampToValueAtTime(
        Frequency('C0').toFrequency(),
        time + ramp,
      )

      const ramp2 = Time('8n').toSeconds()
      drumlowtomnoise.triggerAttackRelease('8n', time)
      drumlowtomnoise.volume.setValueAtTime(1, time)
      drumlowtomnoise.volume.exponentialRampToValueAtTime(0, time + ramp2)
    },
  }
}
