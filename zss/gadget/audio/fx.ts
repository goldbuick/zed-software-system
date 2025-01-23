import {
  Chorus,
  Distortion,
  FeedbackDelay,
  Phaser,
  Reverb,
  // Reverb,
  Time,
  Vibrato,
} from 'tone'
import { deepcopy } from 'zss/mapping/types'

export const ECHO_OFF = Time('256n').toSeconds()
export const ECHO_ON = Time('8n').toSeconds()

export function createfx() {
  const reverb = new Reverb()
  const resetreverb = deepcopy(reverb.get())

  const echo = new FeedbackDelay()
  const resetecho = deepcopy(echo.get())

  const chorus = new Chorus()
  const resetchorus = deepcopy(chorus.get())

  const phaser = new Phaser()
  const resetphaser = deepcopy(phaser.get())

  const distortion = new Distortion()
  const resetdistortion = deepcopy(distortion.get())

  const vibrato = new Vibrato()
  const resetvibrato = deepcopy(vibrato.get())

  function applyreset() {
    reverb.set({
      ...resetreverb,
      wet: 0,
    })
    echo.set({
      ...resetecho,
      wet: 0,
      delayTime: ECHO_OFF,
      maxDelay: '1n',
      feedback: 0.666,
    })
    chorus.set({
      ...resetchorus,
      wet: 0,
      depth: 0.999,
      frequency: 7,
      feedback: 0.666,
    })
    phaser.set({
      ...resetphaser,
      wet: 0,
      Q: 10,
    })
    distortion.set({
      ...resetdistortion,
      wet: 0,
      distortion: 0.9,
    })
    vibrato.set({
      ...resetvibrato,
      wet: 0,
      depth: 0.2,
    })
  }

  return {
    reverb,
    echo,
    chorus,
    phaser,
    distortion,
    vibrato,
    applyreset,
  }
}
