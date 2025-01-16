import { Synth, Volume } from 'tone'

import { createfx } from './fx'

export function createsource(playvolume: Volume) {
  const source = new Synth()
  source.set({
    envelope: {
      attack: 0.01,
      decay: 0.01,
      sustain: 0.5,
      release: 0.01,
    },
    oscillator: {
      type: 'square',
    },
  })

  const fx = createfx()
  source.chain(
    fx.vibrato,
    fx.chorus,
    fx.phaser,
    fx.distortion,
    fx.echo,
    // fx.reverb,
    playvolume,
  )

  return { source, fx }
}
