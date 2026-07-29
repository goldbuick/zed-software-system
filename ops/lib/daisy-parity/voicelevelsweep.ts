/**
 * Offline loudness sweep: each `#synth` voice vs `#synth square` held RMS.
 * One-shots use a post-attack body window (not peak). No TaskDef — invoke via Playwright.
 *
 * Call `rendervoicelevelrow` once per browser page — sequential OfflineAudioContext
 * boots on the same page go silent after the first render.
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
import {
  invokeplay,
  parseplay,
  tonenotationseconds,
} from 'zss/feature/synth/playnotation'
import type { SYNTH_NOTE_ENTRY } from 'zss/feature/synth/playnotation'
import { SYNTH_NAMED_TYPES } from 'zss/feature/synth/voiceconfig/validation'

const SAMPLERATE = 44100
/** Offline replay starts at currentTime (usually 0); live uses +0.05. */
const NOTE_ON_SEC = 0
/** Half-note C4 — ROM play notation (see play-notation skill). */
const NOTATION = '+hc'
const DURATION_SEC = 1.5
const TOLERANCE_DB = 3
const SILENT_DB = -120
/** Full-buffer RMS below this means the offline render produced no voice. */
const MIN_VALID_RMS_DB = -70

/** Osc / named voices beyond SYNTH_NAMED_TYPES */
const OSC_VOICES = [
  'sine',
  'square',
  'triangle',
  'sawtooth',
  'pulse',
  'pwm',
  'amsine',
  'amsquare',
  'amtriangle',
  'amsawtooth',
  'fmsine',
  'fmsquare',
  'fmtriangle',
  'fmsawtooth',
  'fatsine',
  'fatsquare',
  'fattriangle',
  'fatsawtooth',
] as const

/** Decaying / one-shot: measure body window, not held sustain */
const BODY_WINDOW_VOICES = new Set<string>([
  'pluck',
  'bells',
  'metallic',
  'clang',
  'buzz',
  'retro',
  'noise',
  'hollow',
  'doot',
  'steel',
])

export type VOICE_LEVEL_ROW = {
  voice: string
  kind: 'held' | 'body'
  rmsdb: number
  peakdb: number
  fullrmsdb: number
  deltadb: number
  pass: boolean
  silent: boolean
}

export type VOICE_LEVEL_SWEEP = {
  squarermsdb: number
  toleranceDb: number
  rows: VOICE_LEVEL_ROW[]
  failcount: number
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

function patchentries(notation: string): SYNTH_NOTE_ENTRY[] {
  const invoke = parseplay(notation)[0]
  return invokeplay(0, 0, invoke, true)
}

function renderlengthsec(
  durationsec: number,
  ticks: SYNTH_NOTE_ENTRY[],
): number {
  let latest = durationsec
  for (let i = 0; i < ticks.length; i++) {
    const [time, value] = ticks[i]
    const [, notation] = value
    let eventend = time
    if (typeof notation === 'string') {
      eventend += tonenotationseconds(notation)
    }
    if (eventend > latest) {
      latest = eventend
    }
  }
  return Math.max(latest + 0.2, durationsec + 0.75)
}

function windowrmsdb(
  samples: Float32Array,
  samplerate: number,
  startsec: number,
  endsec: number,
): { rmsdb: number; peakdb: number } {
  const start = Math.max(0, Math.floor(startsec * samplerate))
  const end = Math.min(samples.length, Math.floor(endsec * samplerate))
  if (end <= start) {
    return { rmsdb: SILENT_DB, peakdb: SILENT_DB }
  }
  let sumsq = 0
  let peak = 0
  const n = end - start
  for (let i = start; i < end; i++) {
    const s = samples[i]
    sumsq += s * s
    const abs = s < 0 ? -s : s
    if (abs > peak) {
      peak = abs
    }
  }
  const rms = Math.sqrt(sumsq / n)
  return {
    rmsdb: rms > 0 ? 20 * Math.log10(rms) : SILENT_DB,
    peakdb: peak > 0 ? 20 * Math.log10(peak) : SILENT_DB,
  }
}

async function rendervoicebuffer(voice: string): Promise<AudioBuffer> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }
  const ticks = patchentries(NOTATION)
  const rendersec = renderlengthsec(DURATION_SEC, ticks)
  const length = Math.max(1, Math.ceil(rendersec * SAMPLERATE))
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
  return buffer
}

function measurevoice(
  samples: Float32Array,
  samplerate: number,
  voice: string,
): { kind: 'held' | 'body'; rmsdb: number; peakdb: number } {
  const noteon = NOTE_ON_SEC
  if (BODY_WINDOW_VOICES.has(voice)) {
    // Drip is an impulse — measure early body, not after it dies
    if (voice === 'drip') {
      // After dettack fix: energy should remain in 0.05-0.25 s (not click-only)
      const m = windowrmsdb(samples, samplerate, noteon + 0.05, noteon + 0.25)
      return { kind: 'body', ...m }
    }
    // Post-attack body on half-note: skip hammer/pick, before ring dies
    const m = windowrmsdb(samples, samplerate, noteon + 0.1, noteon + 0.4)
    return { kind: 'body', ...m }
  }
  // Mid half-note sustain (~0.88s at DEFAULT_BPM)
  const m = windowrmsdb(samples, samplerate, noteon + 0.25, noteon + 0.7)
  return { kind: 'held', ...m }
}

export function voicelevelcatalog(): string[] {
  const named = [...SYNTH_NAMED_TYPES]
  const all = new Set<string>([...OSC_VOICES, ...named])
  return [...all]
}

/** Render one voice; must run alone on a fresh page. */
export async function rendervoicelevelmetrics(voice: string): Promise<{
  voice: string
  kind: 'held' | 'body'
  rmsdb: number
  peakdb: number
  fullrmsdb: number
  silent: boolean
}> {
  const buf = await rendervoicebuffer(voice)
  const samples = buf.getChannelData(0)
  let sumsq = 0
  for (let i = 0; i < samples.length; i++) {
    sumsq += samples[i] * samples[i]
  }
  const fullrms = samples.length > 0 ? Math.sqrt(sumsq / samples.length) : 0
  const fullrmsdb = fullrms > 0 ? 20 * Math.log10(fullrms) : SILENT_DB
  const m = measurevoice(samples, buf.sampleRate, voice)
  return {
    voice,
    kind: m.kind,
    rmsdb: m.rmsdb,
    peakdb: m.peakdb,
    fullrmsdb,
    silent: fullrmsdb < MIN_VALID_RMS_DB,
  }
}

export function buildvoicelevelsweep(
  squarermsdb: number,
  metrics: Awaited<ReturnType<typeof rendervoicelevelmetrics>>[],
): VOICE_LEVEL_SWEEP {
  const rows: VOICE_LEVEL_ROW[] = metrics.map((m) => {
    const deltadb = m.rmsdb - squarermsdb
    const pass = !m.silent && Math.abs(deltadb) <= TOLERANCE_DB
    return {
      voice: m.voice,
      kind: m.kind,
      rmsdb: m.rmsdb,
      peakdb: m.peakdb,
      fullrmsdb: m.fullrmsdb,
      deltadb,
      pass,
      silent: m.silent,
    }
  })
  rows.sort((a, b) => a.deltadb - b.deltadb)
  return {
    squarermsdb,
    toleranceDb: TOLERANCE_DB,
    rows,
    failcount: rows.filter((r) => !r.pass).length,
  }
}
