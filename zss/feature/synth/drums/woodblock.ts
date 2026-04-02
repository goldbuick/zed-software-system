import { Filter, Synth, Time, Volume } from 'tone'

export function createwoodblock(drumvolume: Volume) {
  const drumwoodblockfilter = new Filter()
  drumwoodblockfilter.set({
    type: 'bandpass',
    frequency: 256,
    Q: 0.17,
  })
  drumwoodblockfilter.connect(drumvolume)

  const drumhiwoodblockclack = new Synth()
  drumhiwoodblockclack.set({
    envelope: {
      attack: 0.001,
      decay: 0.001,
      sustain: 0.001,
      release: 0.08,
    },
    oscillator: { type: 'sawtooth' },
  })
  drumhiwoodblockclack.connect(drumwoodblockfilter)

  const drumhiwoodblockdonk = new Synth()
  drumhiwoodblockdonk.set({
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0.001,
      release: 0.08,
    },
    oscillator: { type: 'sine' },
  })
  drumhiwoodblockdonk.connect(drumwoodblockfilter)

  const drumlowwoodblockclack = new Synth()
  drumlowwoodblockclack.set({
    envelope: {
      attack: 0.001,
      decay: 0.001,
      sustain: 0.001,
      release: 0.08,
    },
    oscillator: { type: 'sawtooth' },
  })
  drumlowwoodblockclack.connect(drumwoodblockfilter)

  const drumlowwoodblockdonk = new Synth()
  drumlowwoodblockdonk.set({
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0.001,
      release: 0.08,
    },
    oscillator: { type: 'sine' },
  })
  drumlowwoodblockdonk.connect(drumwoodblockfilter)

  return {
    hiwoodblocktrigger(duration: string, time: number) {
      drumhiwoodblockclack.triggerAttackRelease(2000, duration, time)
      drumhiwoodblockclack.frequency.exponentialRampToValueAtTime(
        1000,
        time + Time('32n').toSeconds(),
      )
      drumhiwoodblockdonk.triggerAttackRelease(999, duration, time)
      drumhiwoodblockdonk.frequency.exponentialRampToValueAtTime(
        888,
        time + Time('256n').toSeconds(),
      )
    },
    lowwoodblocktrigger(duration: string, time: number) {
      drumlowwoodblockclack.triggerAttackRelease(2000, duration, time)
      drumlowwoodblockclack.frequency.exponentialRampToValueAtTime(
        100,
        time + Time('32n').toSeconds(),
      )
      drumlowwoodblockdonk.triggerAttackRelease(699, duration, time)
      drumlowwoodblockdonk.frequency.exponentialRampToValueAtTime(
        399,
        time + Time('256n').toSeconds(),
      )
    },
  }
}
