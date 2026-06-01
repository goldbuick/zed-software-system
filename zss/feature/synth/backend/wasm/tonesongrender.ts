import {
  analyzelevelstability,
  formatlevelstabilityline,
  type LEVEL_STABILITY_METRICS,
} from './levelstabilitymetrics.ts'

import type { LEVEL_STABILITY_SCENARIO } from '../daisy/levelstabilityscenarios.ts'
import {
  arraybuffertobase64,
  encodewavmono16,
  type SONG_RENDER_PAYLOAD,
  type SONG_RENDER_RESULT,
} from '../daisy/daisysongrender.ts'

import { rendertonelevelscenario } from './toneparityrender.ts'

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

function loudestwindows(
  metrics: LEVEL_STABILITY_METRICS,
  topn = 12,
): Array<{ index: number; timesec: number; peakdb: number }> {
  const rows = metrics.windowpeaksDb.map((peakdb, index) => ({
    index,
    timesec: (index * metrics.windowms) / 1000,
    peakdb,
  }))
  rows.sort((a, b) => b.peakdb - a.peakdb)
  return rows.slice(0, topn)
}

export async function rendertonesongscenario(
  scenario: LEVEL_STABILITY_SCENARIO,
  windowms = 46,
): Promise<SONG_RENDER_RESULT> {
  const tonebuffer = await rendertonelevelscenario(scenario)
  const samples = monobuffer(tonebuffer)
  const rendersec = samples.length / tonebuffer.sampleRate
  const metrics = analyzelevelstability(samples, tonebuffer.sampleRate, windowms)
  return {
    render: {
      samples,
      samplerate: tonebuffer.sampleRate,
      rendersec,
    },
    metrics,
    loudestwindows: loudestwindows(metrics),
  }
}

export function formattonesongrenderreport(
  scenario: LEVEL_STABILITY_SCENARIO,
  result: SONG_RENDER_RESULT,
): string {
  const outid = `${scenario.id}-tone`
  const lines = [
    `Tone offline song render: ${outid}`,
    scenario.description,
    `duration ${result.render.rendersec.toFixed(2)} s @ ${result.render.samplerate} Hz`,
    '',
    formatlevelstabilityline(outid, result.metrics),
    '',
    `Loudest ${result.loudestwindows.length} windows (${result.metrics.windowms} ms):`,
  ]
  for (const row of result.loudestwindows) {
    lines.push(
      `  #${row.index} t=${row.timesec.toFixed(2)}s peak=${row.peakdb.toFixed(1)} dBFS`,
    )
  }
  return lines.join('\n')
}

export async function rendertonesongpayload(
  scenario: LEVEL_STABILITY_SCENARIO,
  windowms = 46,
): Promise<SONG_RENDER_PAYLOAD> {
  const result = await rendertonesongscenario(scenario, windowms)
  const outid = `${scenario.id}-tone`
  const wav = encodewavmono16(result.render.samples, result.render.samplerate)
  return {
    meta: {
      scenarioid: outid,
      rendersec: result.render.rendersec,
      samplerate: result.render.samplerate,
      samplecount: result.render.samples.length,
    },
    metrics: result.metrics,
    report: formattonesongrenderreport(scenario, result),
    loudestwindows: result.loudestwindows,
    wavbase64: arraybuffertobase64(wav),
  }
}
