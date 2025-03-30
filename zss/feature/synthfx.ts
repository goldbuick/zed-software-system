import { Distortion, FeedbackDelay, Phaser, Reverb, Time, Vibrato } from 'tone'
import { deepcopy } from 'zss/mapping/types'

import { FrequencyCrusher } from './synthworkletnodes'

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
      frequency: 16,
      octaves: 2,
    })
    distortion.set({
      ...resetdistortion,
      wet: 0,
      distortion: 0.9,
      oversample: '2x',
    })
    vibrato.set({
      ...resetvibrato,
      wet: 0,
      depth: 0.2,
    })
    fc.set({
      ...resetfc,
      wet: 0,
      rate: 32,
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
    // aliases for fx
    fcrush: fc,
    distort: distortion,
  }
}
