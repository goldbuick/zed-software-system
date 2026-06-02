import {
  type LEVEL_STABILITY_METRICS,
  analyzelevelstability,
  formatlevelstabilityline,
} from '../wasm/levelstabilitymetrics.ts'

import {
  type LEVEL_STABILITY_RENDER,
  renderdaisylevelscenario,
} from './daisylevelrender.ts'
import type { LEVEL_STABILITY_SCENARIO } from './levelstabilityscenarios.ts'

export type SONG_RENDER_RESULT = {
  render: LEVEL_STABILITY_RENDER
  metrics: LEVEL_STABILITY_METRICS
  loudestwindows: { index: number; timesec: number; peakdb: number }[]
}

export type SONG_RENDER_PAYLOAD = {
  meta: {
    scenarioid: string
    rendersec: number
    samplerate: number
    samplecount: number
  }
  metrics: LEVEL_STABILITY_METRICS
  report: string
  loudestwindows: { index: number; timesec: number; peakdb: number }[]
  wavbase64: string
}

function loudestwindows(
  metrics: LEVEL_STABILITY_METRICS,
  topn = 12,
): { index: number; timesec: number; peakdb: number }[] {
  const rows = metrics.windowpeaksDb.map((peakdb, index) => ({
    index,
    timesec: (index * metrics.windowms) / 1000,
    peakdb,
  }))
  rows.sort((a, b) => b.peakdb - a.peakdb)
  return rows.slice(0, topn)
}

export function encodewavmono16(
  samples: Float32Array,
  samplerate: number,
): ArrayBuffer {
  const bytespersample = 2
  const datasize = samples.length * bytespersample
  const buffer = new ArrayBuffer(44 + datasize)
  const view = new DataView(buffer)

  function writestring(offset: number, text: string) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i))
    }
  }

  writestring(0, 'RIFF')
  view.setUint32(4, 36 + datasize, true)
  writestring(8, 'WAVE')
  writestring(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, samplerate, true)
  view.setUint32(28, samplerate * bytespersample, true)
  view.setUint16(32, bytespersample, true)
  view.setUint16(34, 16, true)
  writestring(36, 'data')
  view.setUint32(40, datasize, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(
      offset,
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
      true,
    )
    offset += 2
  }
  return buffer
}

export function arraybuffertobase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

export async function renderdaisysongscenario(
  scenario: LEVEL_STABILITY_SCENARIO,
  windowms = 46,
): Promise<SONG_RENDER_RESULT> {
  const render = await renderdaisylevelscenario(scenario)
  const metrics = analyzelevelstability(
    render.samples,
    render.samplerate,
    windowms,
  )
  return {
    render,
    metrics,
    loudestwindows: loudestwindows(metrics),
  }
}

export function formatsongrenderreport(
  scenario: LEVEL_STABILITY_SCENARIO,
  result: SONG_RENDER_RESULT,
): string {
  const lines = [
    `Daisy offline song render: ${scenario.id}`,
    scenario.description,
    `duration ${result.render.rendersec.toFixed(2)} s @ ${result.render.samplerate} Hz`,
    '',
    formatlevelstabilityline(scenario.id, result.metrics),
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

export async function renderdaisysongpayload(
  scenario: LEVEL_STABILITY_SCENARIO,
  windowms = 46,
): Promise<SONG_RENDER_PAYLOAD> {
  const result = await renderdaisysongscenario(scenario, windowms)
  const wav = encodewavmono16(result.render.samples, result.render.samplerate)
  return {
    meta: {
      scenarioid: scenario.id,
      rendersec: result.render.rendersec,
      samplerate: result.render.samplerate,
      samplecount: result.render.samples.length,
    },
    metrics: result.metrics,
    report: formatsongrenderreport(scenario, result),
    loudestwindows: result.loudestwindows,
    wavbase64: arraybuffertobase64(wav),
  }
}
