import { Synth, Volume } from 'tone'
import { deepcopy } from 'zss/mapping/types'

import { createfx } from './fx'

export function createsource(playvolume: Volume) {
  const source = new Synth()
  const resetvalues = deepcopy(source.get())

  const fx = createfx()
  source.chain(
    fx.vibrato,
    fx.chorus,
    fx.phaser,
    fx.distortion,
    fx.echo,
    fx.reverb,
    playvolume,
  )

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
    fx.applyreset()
  }

  applyreset()

  return { source, fx, applyreset }
}
