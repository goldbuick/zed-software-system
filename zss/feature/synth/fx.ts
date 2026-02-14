import {
  AutoFilter,
  AutoWah,
  Distortion,
  FeedbackDelay,
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

  const autofilter = new AutoFilter()
  const resetautofilter = deepcopy(autofilter.get())

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
      wet: 0.5,
    })
    echo.set({
      ...resetecho,
      wet: 0.5,
      delayTime: '8n',
      maxDelay: '8n',
      feedback: 0.666,
    })
    autofilter.set({
      ...resetautofilter,
      wet: 0.5,
      depth: 0.5,
      frequency: 3,
      octaves: 5,
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
      fc: deepcopy(fc.get()),
      echo: deepcopy(echo.get()),
      reverb: deepcopy(reverb.get()),
      autofilter: deepcopy(autofilter.get()),
      vibrato: deepcopy(vibrato.get()),
      distortion: deepcopy(distortion.get()),
    }
  }

  function setreplay(replay: ReturnType<typeof getreplay>) {
    fc.set(replay.fc)
    echo.set(replay.echo)
    reverb.set(replay.reverb)
    autofilter.set(replay.autofilter)
    vibrato.set(replay.vibrato)
    distortion.set(replay.distortion)
  }

  function destroy() {
    fc.dispose()
    echo.dispose()
    reverb.dispose()
    autofilter.dispose()
    vibrato.dispose()
    distortion.dispose()
  }

  applyreset()

  return {
    fc,
    echo,
    reverb,
    autofilter,
    vibrato,
    distortion,
    applyreset,
    getreplay,
    setreplay,
    autowah,
    fcrush: fc,
    distort: distortion,
    destroy,
  }
}

export { createfxchannels } from './fxchannels'
