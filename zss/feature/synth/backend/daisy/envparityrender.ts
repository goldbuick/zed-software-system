import {
  analyzelevelstability,
  type LEVEL_STABILITY_METRICS,
} from '../wasm/levelstabilitymetrics.ts'
import { rendertonelevelscenario } from '../wasm/toneparityrender.ts'

import { encodewavmono16 } from './daisysongrender.ts'
import { renderdaisylevelscenario } from './daisylevelrender.ts'
import type { LEVEL_STABILITY_SCENARIO } from './levelstabilityscenarios.ts'

export type ENV_PARITY_RESULT = {
  id: string
  daisy: LEVEL_STABILITY_METRICS
  tone: LEVEL_STABILITY_METRICS
  spread: {
    daisyp10p90: number
    tonep10p90: number
    delta: number
  }
  report: string
}

function peakspread(metrics: LEVEL_STABILITY_METRICS): number {
  return metrics.steadypeakrangeDb
}

function timelinascii(
  peaksdb: number[],
  durationsec: number,
  windowms: number,
  cols = 60,
): string {
  const timeline = Array(cols).fill(' ')
  for (let c = 0; c < cols; c++) {
    const t0 = (c / cols) * durationsec
    const t1 = ((c + 1) / cols) * durationsec
    const slice = peaksdb.slice(
      Math.floor((t0 * 1000) / windowms),
      Math.ceil((t1 * 1000) / windowms),
    )
    if (slice.length === 0) {
      continue
    }
    const maxp = Math.max(...slice)
    if (maxp > -10) {
      timeline[c] = '#'
    } else if (maxp > -20) {
      timeline[c] = '='
    } else if (maxp > -35) {
      timeline[c] = '-'
    } else if (maxp > -50) {
      timeline[c] = '.'
    }
  }
  return timeline.join('')
}

export function formatenvparityreport(
  scenario: LEVEL_STABILITY_SCENARIO,
  result: ENV_PARITY_RESULT,
  durationsec: number,
): string {
  const lines = [
    `Env parity: ${scenario.id}`,
    scenario.description,
    '',
    `                    peak      RMS       steady spk range`,
    `  Daisy            ${result.daisy.overallpeakdb.toFixed(1).padStart(6)} dBFS  ${result.daisy.overallrmsdb.toFixed(1).padStart(6)} dBFS  ${result.spread.daisyp10p90.toFixed(1)} dB`,
    `  Tone             ${result.tone.overallpeakdb.toFixed(1).padStart(6)} dBFS  ${result.tone.overallrmsdb.toFixed(1).padStart(6)} dBFS  ${result.spread.tonep10p90.toFixed(1)} dB`,
    `  spread delta     ${result.spread.delta.toFixed(1)} dB steady peak range (Daisy − Tone)`,
    '',
    'Peak timeline (# >-10  = >-20  - >-35  . >-50):',
    `  Daisy: ${timelinascii(result.daisy.windowpeaksDb, durationsec, result.daisy.windowms)}`,
    `  Tone:  ${timelinascii(result.tone.windowpeaksDb, durationsec, result.tone.windowms)}`,
  ]
  return lines.join('\n')
}

export async function runenvparityscenario(
  scenario: LEVEL_STABILITY_SCENARIO,
  windowms = 46,
): Promise<ENV_PARITY_RESULT & { daisywav: ArrayBuffer; tonewav: ArrayBuffer; rendersec: number }> {
  const daisyrender = await renderdaisylevelscenario(scenario)
  const tonebuffer = await rendertonelevelscenario(scenario)

  const daisy = analyzelevelstability(daisyrender.samples, daisyrender.samplerate, windowms)
  const tonemono = monobuffer(tonebuffer)
  const tone = analyzelevelstability(tonemono, tonebuffer.sampleRate, windowms)

  const daisyp10p90 = peakspread(daisy)
  const tonep10p90 = peakspread(tone)

  const result: ENV_PARITY_RESULT = {
    id: scenario.id,
    daisy,
    tone,
    spread: {
      daisyp10p90,
      tonep10p90,
      delta: daisyp10p90 - tonep10p90,
    },
    report: '',
  }
  result.report = formatenvparityreport(scenario, result, daisyrender.rendersec)

  return {
    ...result,
    daisywav: encodewavmono16(daisyrender.samples, daisyrender.samplerate),
    tonewav: encodewavmono16(tonemono, tonebuffer.sampleRate),
    rendersec: daisyrender.rendersec,
  }
}

function monobuffer(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0).slice()
  }
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  const mono = new Float32Array(left.length)
  for (let i = 0; i < left.length; i++) {
    mono[i] = (left[i] + right[i]) * 0.5
  }
  return mono
}
