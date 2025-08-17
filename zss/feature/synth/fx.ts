import {
  AutoWah,
  Channel,
  Distortion,
  FeedbackDelay,
  Phaser,
  Reverb,
  Vibrato,
  getContext,
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
      frequency: 5,
      octaves: 0.5,
      baseFrequency: 400,
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

  function getreplay() {
    return {
      fc: fc.get(),
      echo: echo.get(),
      reverb: reverb.get(),
      phaser: phaser.get(),
      vibrato: vibrato.get(),
      distortion: distortion.get(),
    }
  }

  function setreplay(replay: ReturnType<typeof getreplay>) {
    fc.set(replay.fc)
    echo.set(replay.echo)
    reverb.set(replay.reverb)
    phaser.set(replay.phaser)
    vibrato.set(replay.vibrato)
    distortion.set(replay.distortion)
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
    getreplay,
    setreplay,
    autowah,
    // aliases for fx
    fcrush: fc,
    distort: distortion,
  }
}

export function createfxchannels(index: number) {
  const prefix = getContext().isOffline ? 'offline' : ''
  const fc = new Channel(volumetodb(0))
  const echo = new Channel(volumetodb(0))
  const reverb = new Channel(volumetodb(0))
  const phaser = new Channel(volumetodb(0))
  const vibrato = new Channel(volumetodb(0))
  const distortion = new Channel(volumetodb(0))
  const autowah = new Channel(volumetodb(0))
  fc.receive(`${prefix}fc${index}`)
  echo.receive(`${prefix}echo${index}`)
  reverb.receive(`${prefix}reverb${index}`)
  phaser.receive(`${prefix}phaser${index}`)
  vibrato.receive(`${prefix}vibrato${index}`)
  distortion.receive(`${prefix}distortion${index}`)
  autowah.receive(`${prefix}autowah${index}`)

  const sendtofx = new Channel()
  sendtofx.send(`${prefix}fc${index}`)
  sendtofx.send(`${prefix}echo${index}`)
  sendtofx.send(`${prefix}reverb${index}`)
  sendtofx.send(`${prefix}phaser${index}`)
  sendtofx.send(`${prefix}vibrato${index}`)
  sendtofx.send(`${prefix}distortion${index}`)
  sendtofx.send(`${prefix}autowah${index}`)

  function getreplay() {
    return {
      fc: fc.get(),
      echo: echo.get(),
      reverb: reverb.get(),
      phaser: phaser.get(),
      vibrato: vibrato.get(),
      distortion: distortion.get(),
      autowah: autowah.get(),
    }
  }

  function setreplay(replay: ReturnType<typeof getreplay>) {
    fc.set(replay.fc)
    echo.set(replay.echo)
    reverb.set(replay.reverb)
    phaser.set(replay.phaser)
    vibrato.set(replay.vibrato)
    distortion.set(replay.distortion)
    autowah.set(replay.autowah)
  }

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
    getreplay,
    setreplay,
  }
}
