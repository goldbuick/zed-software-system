import { Gain, PolySynth } from 'tone'

import { createfx } from './fx'
import { maincompressor } from './main'

const maingain = new Gain()
maingain.connect(maincompressor)

export function createsource() {
  const source = new PolySynth()
  source.maxPolyphony = 8
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
    fx.reverb,
    maingain,
  )

  return { source, fx }
}
