import { Synth, Volume } from 'tone'
import { deepcopy } from 'zss/mapping/types'

import { createfx } from './fx'

export function createsource(playvolume: Volume) {
  const source = new Synth()
  const resetvalues = deepcopy(source.get())

  const {
    vibrato,
    chorus,
    phaser,
    distortion,
    echo,
    reverb,
    applyreset: fxapplyreset,
  } = createfx()
  source.chain(vibrato, chorus, phaser, distortion, echo, reverb, playvolume)

  function applyreset() {
    // reset source(s)
    source.set({
      ...resetvalues,
      envelope: {
        ...resetvalues.envelope,
        attack: 0.01,
        decay: 0.01,
        sustain: 0.5,
        release: 0.01,
      },
      oscillator: {
        ...resetvalues.oscillator,
        type: 'square',
      },
    })
    // reset fx
    fxapplyreset()
  }

  applyreset()

  return {
    source,
    fx: {
      vibrato,
      chorus,
      phaser,
      distortion,
      echo,
      reverb,
    },
    applyreset,
  }
}
