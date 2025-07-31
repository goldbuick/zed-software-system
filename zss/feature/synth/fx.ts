import {
  AutoWah,
  Channel,
  Distortion,
  FeedbackDelay,
  Phaser,
  Reverb,
  Vibrato,
} from 'tone'
import { deepcopy } from 'zss/mapping/types'

import { FrequencyCrusher } from './fcrushworkletnode'

// 0 to 100
export function volumetodb(value: number) {
  return 20 * Math.log10(value) - 35
}

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
      wet: 1,
    })
    echo.set({
      ...resetecho,
      wet: 1,
      delayTime: '8n',
      maxDelay: '8n',
      feedback: 0.666,
    })
    phaser.set({
      ...resetphaser,
      wet: 1,
      frequency: 4,
      octaves: 3,
      baseFrequency: 330,
    })
    distortion.set({
      ...resetdistortion,
      wet: 1,
      oversample: '4x',
    })
    vibrato.set({
      ...resetvibrato,
      wet: 1,
      depth: 0,
      maxDelay: 0.5,
    })
    fc.set({
      ...resetfc,
      wet: 1,
      rate: 32,
    })
    autowah.set({
      ...resetautowah,
      wet: 1,
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

export function createfxchannels() {
  const fc = new Channel(volumetodb(0))
  const echo = new Channel(volumetodb(0))
  const reverb = new Channel(volumetodb(0))
  const phaser = new Channel(volumetodb(0))
  const vibrato = new Channel(volumetodb(0))
  const distortion = new Channel(volumetodb(0))
  const autowah = new Channel(volumetodb(0))
  fc.receive('fc')
  echo.receive('echo')
  reverb.receive('reverb')
  phaser.receive('phaser')
  vibrato.receive('vibrato')
  distortion.receive('distortion')
  autowah.receive('autowah')

  const sendtofx = new Channel()
  sendtofx.send('fc')
  sendtofx.send('echo')
  sendtofx.send('reverb')
  sendtofx.send('phaser')
  sendtofx.send('vibrato')
  sendtofx.send('distortion')
  sendtofx.send('autowah')

  return {
    sendtofx,
    fc,
    echo,
    reverb,
    phaser,
    vibrato,
    distortion,
    autowah,
    // aliases for fx
    fcrush: fc,
    distort: distortion,
  }
}
