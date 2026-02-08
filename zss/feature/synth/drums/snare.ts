import {
  Distortion,
  Filter,
  NoiseSynth,
  Synth,
  Time,
  Volume,
} from 'tone'

export function createsnare(drumvolume: Volume) {
  const drumhisnaredistortion = new Distortion().connect(drumvolume)
  drumhisnaredistortion.set({ distortion: 0.666 })

  const drumhisnareosc = new Synth()
  drumhisnareosc.set({
    envelope: { attack: 0, decay: 0.1, sustain: 0, release: 1 },
    oscillator: { type: 'triangle' },
  })
  drumhisnareosc.connect(drumhisnaredistortion)

  const drumhisnarefilter = new Filter()
  drumhisnarefilter.set({ type: 'highpass', frequency: 10000 })
  drumhisnarefilter.connect(drumhisnaredistortion)

  const drumhisnarenoise = new NoiseSynth()
  drumhisnarenoise.set({
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0,
      release: 0.1,
    },
  })
  drumhisnarenoise.connect(drumhisnarefilter)

  const drumlowsnaredistortion = new Distortion().connect(drumvolume)
  drumlowsnaredistortion.set({ distortion: 0.876 })

  const drumlowsnareosc = new Synth()
  drumlowsnareosc.set({
    envelope: { attack: 0, decay: 0.1, sustain: 0, release: 1 },
    oscillator: { type: 'triangle' },
  })
  drumlowsnareosc.connect(drumlowsnaredistortion)

  const drumlowsnarefilter = new Filter()
  drumlowsnarefilter.set({ type: 'highpass', frequency: 10000 })
  drumlowsnarefilter.connect(drumlowsnaredistortion)

  const drumlowsnarenoise = new NoiseSynth()
  drumlowsnarenoise.set({
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.001,
      release: 0.1,
    },
  })
  drumlowsnarenoise.connect(drumlowsnarefilter)

  return {
    hisnaretrigger(duration: string, time: number) {
      const ramp = Time('512n').toSeconds()
      const ramp2 = Time('32n').toSeconds()

      drumhisnareosc.triggerAttackRelease(10000, duration, time, 1)
      drumhisnareosc.frequency.exponentialRampToValueAtTime(300, time + ramp)
      drumhisnareosc.frequency.exponentialRampToValueAtTime(100, time + ramp2)

      drumhisnarenoise.triggerAttackRelease('8n', time, 0.333)
      drumhisnarenoise.volume.setValueAtTime(1, time)
      drumhisnarenoise.volume.exponentialRampToValueAtTime(
        0,
        time + Time('32n').toSeconds(),
      )
    },
    lowsnaretrigger(duration: string, time: number) {
      const ramp = Time('512n').toSeconds()
      const ramp2 = Time('32n').toSeconds()

      drumlowsnareosc.triggerAttackRelease(10000, duration, time, 1)
      drumlowsnareosc.frequency.exponentialRampToValueAtTime(150, time + ramp)
      drumlowsnareosc.frequency.exponentialRampToValueAtTime(100, time + ramp2)

      drumlowsnarenoise.triggerAttackRelease('8n', time, 0.25)
      drumlowsnarenoise.volume.setValueAtTime(1, time)
      drumlowsnarenoise.volume.exponentialRampToValueAtTime(
        0,
        time + Time('32n').toSeconds(),
      )
    },
  }
}
