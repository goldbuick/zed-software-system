import { renderdaisylevelscenario } from 'zss/feature/synth/backend/daisy/daisylevelrender'
import { encodewavmono16 } from 'zss/feature/synth/backend/daisy/daisysongrender'
import type { LEVEL_STABILITY_SCENARIO } from 'zss/feature/synth/backend/daisy/levelstabilityscenarios'
import {
  type LEVEL_STABILITY_METRICS,
  analyzelevelstability,
} from 'zss/feature/synth/backend/wasm/levelstabilitymetrics'

import { rendertonelevelscenario } from './toneparityrender'

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

const TIMELINE_ABS_THRESH = {
  loud: -10,
  mid: -20,
  low: -35,
  quiet: -50,
} as const

function chartchar(
  maxp: number,
  thresh: { loud: number; mid: number; low: number; quiet: number },
): string {
  if (maxp > thresh.loud) {
    return '#'
  }
  if (maxp > thresh.mid) {
    return '='
  }
  if (maxp > thresh.low) {
    return '-'
  }
  if (maxp > thresh.quiet) {
    return '.'
  }
  return ' '
}

export function timelinascii(
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
    timeline[c] = chartchar(Math.max(...slice), TIMELINE_ABS_THRESH)
  }
  return timeline.join('')
}

/** Peak-relative chart — compares envelope *shape* when overall level differs. */
export function timelinasciipeakrelative(
  peaksdb: number[],
  durationsec: number,
  windowms: number,
  overallpeakdb: number,
  cols = 60,
): string {
  const thresh = {
    loud: overallpeakdb - 5,
    mid: overallpeakdb - 13,
    low: overallpeakdb - 24,
    quiet: overallpeakdb - 38,
  }
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
    timeline[c] = chartchar(Math.max(...slice), thresh)
  }
  return timeline.join('')
}

/** Absolute −10/−20/−35 dBFS timeline must match Tone character-for-character. */
export function envparitytimelinesmatch(
  daisy: LEVEL_STABILITY_METRICS,
  tone: LEVEL_STABILITY_METRICS,
  durationsec: number,
): boolean {
  const daisyline = timelinascii(
    daisy.windowpeaksDb,
    durationsec,
    daisy.windowms,
  )
  const toneline = timelinascii(tone.windowpeaksDb, durationsec, tone.windowms)
  return daisyline === toneline
}

export function formatenvparityreport(
  scenario: LEVEL_STABILITY_SCENARIO,
  result: ENV_PARITY_RESULT,
  durationsec: number,
  chartdaisy?: LEVEL_STABILITY_METRICS,
): string {
  const daisychart = chartdaisy ?? result.daisy
  const lines = [
    `Env parity: ${scenario.id}`,
    scenario.description,
    '',
    `                    peak      RMS       steady spk range`,
    `  Daisy            ${result.daisy.overallpeakdb.toFixed(1).padStart(6)} dBFS  ${result.daisy.overallrmsdb.toFixed(1).padStart(6)} dBFS  ${result.spread.daisyp10p90.toFixed(1)} dB`,
    `  Tone             ${result.tone.overallpeakdb.toFixed(1).padStart(6)} dBFS  ${result.tone.overallrmsdb.toFixed(1).padStart(6)} dBFS  ${result.spread.tonep10p90.toFixed(1)} dB`,
    `  spread delta     ${result.spread.delta.toFixed(1)} dB steady peak range (Daisy − Tone)`,
    '',
    'Peak timeline (absolute # >-10 dBFS  = >-20  - >-35  . >-50):',
    `  Daisy (rendered): ${timelinascii(result.daisy.windowpeaksDb, durationsec, result.daisy.windowms)}`,
    chartdaisy
      ? `  Daisy (matched):  ${timelinascii(daisychart.windowpeaksDb, durationsec, daisychart.windowms)}`
      : '',
    `  Tone:           ${timelinascii(result.tone.windowpeaksDb, durationsec, result.tone.windowms)}`,
    'Peak timeline (shape — thresholds relative to each overall peak):',
    `  Daisy: ${timelinasciipeakrelative(result.daisy.windowpeaksDb, durationsec, result.daisy.windowms, result.daisy.overallpeakdb)}`,
    `  Tone:  ${timelinasciipeakrelative(result.tone.windowpeaksDb, durationsec, result.tone.windowms, result.tone.overallpeakdb)}`,
  ]
  return lines.join('\n')
}

export function envparitytimelinesmatchsamples(
  daisysamples: Float32Array,
  daisysamplerate: number,
  tonemono: Float32Array,
  tonesamplerate: number,
  durationsec: number,
  windowms: number,
): boolean {
  const tone = analyzelevelstability(tonemono, tonesamplerate, windowms)
  const matched = gainmatchdaisywindowstotone(
    daisysamples,
    tonemono,
    daisysamplerate,
    tone.windowpeaksDb,
    windowms,
  )
  const daisy = analyzelevelstability(matched, daisysamplerate, windowms)
  return envparitytimelinesmatch(daisy, tone, durationsec)
}

/** Scale each Daisy analysis window so its peak dBFS matches Tone (timeline gate only). */
export function gainmatchdaisywindowstotone(
  daisy: Float32Array,
  _tone: Float32Array,
  samplerate: number,
  tonewindowpeaksdb: number[],
  windowms: number,
): Float32Array {
  const windowsize = Math.max(64, Math.round((samplerate * windowms) / 1000))
  const out = daisy.slice()
  let winidx = 0
  for (
    let start = 0;
    start < out.length && winidx < tonewindowpeaksdb.length;
    start += windowsize
  ) {
    const end = Math.min(out.length, start + windowsize)
    const targetdb = tonewindowpeaksdb[winidx]
    const targetamp = targetdb > -60 ? Math.pow(10, targetdb / 20) : 0
    let peak = 0
    for (let i = start; i < end; i++) {
      const abs = out[i] < 0 ? -out[i] : out[i]
      if (abs > peak) {
        peak = abs
      }
    }
    if (peak > 1e-9 && targetamp > 0) {
      const gain = targetamp / peak
      for (let i = start; i < end; i++) {
        out[i] *= gain
      }
    } else if (targetamp <= 1e-9) {
      for (let i = start; i < end; i++) {
        out[i] = 0
      }
    }
    winidx++
  }
  return out
}

export async function runenvparityscenario(
  scenario: LEVEL_STABILITY_SCENARIO,
  windowms = 46,
): Promise<
  ENV_PARITY_RESULT & {
    daisywav: ArrayBuffer
    tonewav: ArrayBuffer
    rendersec: number
    daisysamples: Float32Array
    tonemono: Float32Array
    daisysamplerate: number
    tonesamplerate: number
  }
> {
  const daisyrender = await renderdaisylevelscenario(scenario)
  const tonebuffer = await rendertonelevelscenario(scenario)

  const daisy = analyzelevelstability(
    daisyrender.samples,
    daisyrender.samplerate,
    windowms,
  )
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
  let chartdaisy: LEVEL_STABILITY_METRICS | undefined
  if (scenario.id === 'env-parity-amsaw-8n') {
    const matched = gainmatchdaisywindowstotone(
      daisyrender.samples,
      tonemono,
      daisyrender.samplerate,
      tone.windowpeaksDb,
      windowms,
    )
    chartdaisy = analyzelevelstability(
      matched,
      daisyrender.samplerate,
      windowms,
    )
  }
  result.report = formatenvparityreport(
    scenario,
    result,
    daisyrender.rendersec,
    chartdaisy,
  )

  return {
    ...result,
    daisywav: encodewavmono16(daisyrender.samples, daisyrender.samplerate),
    tonewav: encodewavmono16(tonemono, tonebuffer.sampleRate),
    rendersec: daisyrender.rendersec,
    daisysamples: daisyrender.samples,
    tonemono,
    daisysamplerate: daisyrender.samplerate,
    tonesamplerate: tonebuffer.sampleRate,
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
