import { Filter, Synth, Time, Volume } from 'tone'

export function createwoodblock(drumvolume: Volume) {
  const drumhiwoodblockfilter = new Filter()
  drumhiwoodblockfilter.set({
    type: 'bandpass',
    frequency: 256,
    Q: 0.17,
  })
  drumhiwoodblockfilter.connect(drumvolume)

  const drumhiwoodblockclack = new Synth()
  drumhiwoodblockclack.set({
    envelope: {
      attack: 0.001,
      decay: 0.001,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: { type: 'sawtooth' },
  })
  drumhiwoodblockclack.connect(drumhiwoodblockfilter)

  const drumhiwoodblockdonk = new Synth()
  drumhiwoodblockdonk.set({
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: { type: 'sine' },
  })
  drumhiwoodblockdonk.connect(drumhiwoodblockfilter)

  const drumlowwoodblockfilter = new Filter()
  drumlowwoodblockfilter.set({
    type: 'bandpass',
    frequency: 256,
    Q: 0.17,
  })
  drumlowwoodblockfilter.connect(drumvolume)

  const drumlowwoodblockclack = new Synth()
  drumlowwoodblockclack.set({
    envelope: {
      attack: 0.001,
      decay: 0.001,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: { type: 'sawtooth' },
  })
  drumlowwoodblockclack.connect(drumlowwoodblockfilter)

  const drumlowwoodblockdonk = new Synth()
  drumlowwoodblockdonk.set({
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: { type: 'sine' },
  })
  drumlowwoodblockdonk.connect(drumlowwoodblockfilter)

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
