import {
  AutoWah,
  Distortion,
  FeedbackDelay,
  Phaser,
  Reverb,
  Time,
  Vibrato,
} from 'tone'
import { deepcopy } from 'zss/mapping/types'

import { FrequencyCrusher } from './synthfcrushworkletnode'

export const ECHO_OFF = Time('256n').toSeconds()
export const ECHO_ON = Time('8n').toSeconds()

export function createfx() {
  const reverb = new Reverb()
  const resetreverb = deepcopy(reverb.get())

  const echo = new FeedbackDelay()
  const resetecho = deepcopy(echo.get())

  const phaser = new Phaser()
  const resetphaser = deepcopy(phaser.get())

  const distortion = new Distortion()
  const resetdistortion = deepcopy(distortion.get())

  const vibrato = new Vibrato()
  const resetvibrato = deepcopy(vibrato.get())

  const fc = new FrequencyCrusher()
  const resetfc = deepcopy(fc.get())

  const autowah = new AutoWah()
  const resetautowah = deepcopy(autowah.get())

  function applyreset() {
    reverb.set({
      ...resetreverb,
      wet: 0,
    })
    echo.set({
      ...resetecho,
      wet: 0,
      delayTime: ECHO_OFF,
      maxDelay: '8n',
      feedback: 0.666,
    })
    phaser.set({
      ...resetphaser,
      wet: 0,
      frequency: 4,
      octaves: 3,
      baseFrequency: 330,
    })
    distortion.set({
      ...resetdistortion,
      wet: 0,
      oversample: '4x',
    })
    vibrato.set({
      ...resetvibrato,
      wet: 0,
      depth: 0,
      maxDelay: 0.5,
    })
    fc.set({
      ...resetfc,
      wet: 0,
      rate: 32,
    })
    autowah.set({
      ...resetautowah,
      wet: 0,
    })
  }

  applyreset()

  return {
    fc,
    echo,
    reverb,
    phaser,
    vibrato,
    distortion,
    applyreset,
    autowah,
    // aliases for fx
    fcrush: fc,
    distort: distortion,
  }
}
