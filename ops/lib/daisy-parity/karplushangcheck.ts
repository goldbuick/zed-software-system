/**
 * Offline check: pluck/steel body vs square, post-note-off decay, square hold stability.
 * Fresh page per voice (OfflineAudioContext reuse goes silent).
 */
import {
  bootisolateddaisyengine,
  startisolateddaisydsp,
} from 'zss/feature/synth/backend/daisy/daisyengine'
import { createdaisysynth } from 'zss/feature/synth/backend/daisy/daisysynth'
import { defaultwasmalgoconfig } from 'zss/feature/synth/backend/wasm/wasmalgoconfigsab'
import { defaultwasmfxsab } from 'zss/feature/synth/backend/wasm/wasmfxstate'
import {
  WASM_DEFAULT_BGPLAY_VOLUME,
  WASM_DEFAULT_PLAY_VOLUME,
  WASM_DEFAULT_TTS_VOLUME,
} from 'zss/feature/synth/backend/wasm/wasmmainsab'
import { defaultwasmoscconfig } from 'zss/feature/synth/backend/wasm/wasmoscconfigsab'
import type { WASM_REPLAY_STATE } from 'zss/feature/synth/backend/wasm/wasmreplaystate'
import { defaultwasmvoicestate } from 'zss/feature/synth/backend/wasm/wasmvoiceconfig'
import { invokeplay, parseplay } from 'zss/feature/synth/playnotation'

const SAMPLERATE = 44100
const NOTATION = '+hc'
const DURATION_SEC = 2.5
const SILENT_DB = -120
const MIN_VALID_RMS_DB = -70

export type KARPLUS_HANG_METRICS = {
  voice: string
  bodyrmsdb: number
  heldrmsdb: number
  postoffrmsdb: number
  windowrms: number[]
  silent: boolean
}

function buildreplay(): WASM_REPLAY_STATE {
  return {
    voicecfg: defaultwasmvoicestate(),
    oscconfig: defaultwasmoscconfig(),
    algoconfig: defaultwasmalgoconfig(),
    fxsab: defaultwasmfxsab(),
    playvolume: WASM_DEFAULT_PLAY_VOLUME,
    bgplayvolume: WASM_DEFAULT_BGPLAY_VOLUME,
  }
}

function windowrmsdb(
  samples: Float32Array,
  startsec: number,
  endsec: number,
): number {
  const start = Math.max(0, Math.floor(startsec * SAMPLERATE))
  const end = Math.min(samples.length, Math.floor(endsec * SAMPLERATE))
  if (end <= start) {
    return SILENT_DB
  }
  let sumsq = 0
  const n = end - start
  for (let i = start; i < end; i++) {
    sumsq += samples[i] * samples[i]
  }
  const rms = Math.sqrt(sumsq / n)
  return rms > 0 ? 20 * Math.log10(rms) : SILENT_DB
}

export async function renderkarplushangmetrics(
  voice: string,
): Promise<KARPLUS_HANG_METRICS> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }
  const ticks = invokeplay(0, 0, parseplay(NOTATION)[0], true)
  const length = Math.max(1, Math.ceil(DURATION_SEC * SAMPLERATE))
  const offlinectx = new OfflineAudioContext(1, length, SAMPLERATE)
  const engine = await bootisolateddaisyengine(offlinectx)
  startisolateddaisydsp(
    engine,
    WASM_DEFAULT_PLAY_VOLUME,
    WASM_DEFAULT_BGPLAY_VOLUME,
    WASM_DEFAULT_TTS_VOLUME,
  )
  const synth = createdaisysynth(engine)
  synth.applyreplay(buildreplay())
  synth.setvoiceconfig(0, voice, '')
  synth.setplayvolume(WASM_DEFAULT_PLAY_VOLUME)
  synth.synthreplay(ticks, DURATION_SEC)
  synth.prepareofflinerender()
  const buffer = await offlinectx.startRendering()
  synth.destroy()
  const samples = buffer.getChannelData(0)

  let sumsq = 0
  for (let i = 0; i < samples.length; i++) {
    sumsq += samples[i] * samples[i]
  }
  const fullrms = samples.length > 0 ? Math.sqrt(sumsq / samples.length) : 0
  const fullrmsdb = fullrms > 0 ? 20 * Math.log10(fullrms) : SILENT_DB

  return {
    voice,
    bodyrmsdb: windowrmsdb(samples, 0.1, 0.4),
    heldrmsdb: windowrmsdb(samples, 0.25, 0.7),
    postoffrmsdb: windowrmsdb(samples, 1.2, 1.8),
    windowrms: [
      windowrmsdb(samples, 0.2, 0.35),
      windowrmsdb(samples, 0.35, 0.5),
      windowrmsdb(samples, 0.5, 0.65),
      windowrmsdb(samples, 0.65, 0.8),
    ],
    silent: fullrmsdb < MIN_VALID_RMS_DB,
  }
}

const MULTINOTE_NOTATION = '+qcdefgab'
const MULTINOTE_DURATION_SEC = 4.0
/** Skip strike transient; measure note body only (sawtooth GR, not attack crest). */
const NOTE_BODY_START_SEC = 0.05
const NOTE_BODY_END_SEC = 0.35

export type MULTINOTE_PUMP_METRICS = {
  voice: string
  windowpeaksdb: number[]
  peakrangeDb: number
  silent: boolean
}

/** Multi-note sequence: per-note body RMS should not sawtooth-collapse. */
export async function rendermultinotepumpmetrics(
  voice: string,
): Promise<MULTINOTE_PUMP_METRICS> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }
  const ticks = invokeplay(0, 0, parseplay(MULTINOTE_NOTATION)[0], true)
  const length = Math.max(1, Math.ceil(MULTINOTE_DURATION_SEC * SAMPLERATE))
  const offlinectx = new OfflineAudioContext(1, length, SAMPLERATE)
  const engine = await bootisolateddaisyengine(offlinectx)
  startisolateddaisydsp(
    engine,
    WASM_DEFAULT_PLAY_VOLUME,
    WASM_DEFAULT_BGPLAY_VOLUME,
    WASM_DEFAULT_TTS_VOLUME,
  )
  const synth = createdaisysynth(engine)
  synth.applyreplay(buildreplay())
  synth.setvoiceconfig(0, voice, '')
  synth.setplayvolume(WASM_DEFAULT_PLAY_VOLUME)
  synth.synthreplay(ticks, MULTINOTE_DURATION_SEC)
  synth.prepareofflinerender()
  const buffer = await offlinectx.startRendering()
  synth.destroy()
  const samples = buffer.getChannelData(0)

  const windowpeaksdb: number[] = []
  for (const tick of ticks) {
    const t0 = tick[0]
    const note = tick[1]
    if (!Array.isArray(note) || typeof note[2] !== 'string') {
      continue
    }
    const bodydb = windowrmsdb(
      samples,
      t0 + NOTE_BODY_START_SEC,
      t0 + NOTE_BODY_END_SEC,
    )
    if (bodydb > -60) {
      windowpeaksdb.push(bodydb)
    }
  }

  let sumsq = 0
  for (let i = 0; i < samples.length; i++) {
    sumsq += samples[i] * samples[i]
  }
  const fullrms = samples.length > 0 ? Math.sqrt(sumsq / samples.length) : 0
  const fullrmsdb = fullrms > 0 ? 20 * Math.log10(fullrms) : SILENT_DB

  const min = windowpeaksdb.length ? Math.min(...windowpeaksdb) : SILENT_DB
  const max = windowpeaksdb.length ? Math.max(...windowpeaksdb) : SILENT_DB
  return {
    voice,
    windowpeaksdb,
    peakrangeDb: max - min,
    silent: fullrmsdb < MIN_VALID_RMS_DB,
  }
}
