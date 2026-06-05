import type { SYNTH_NOTE_ENTRY } from '../../playnotation'
import { defaultwasmalgoconfig } from '../wasm/wasmalgoconfigsab'
import { applywasmfxconfig, defaultwasmfxsab } from '../wasm/wasmfxstate'
import { WASM_DEFAULT_TTS_VOLUME } from '../wasm/wasmmainsab'
import { defaultwasmoscconfig } from '../wasm/wasmoscconfigsab'
import type { WASM_REPLAY_STATE } from '../wasm/wasmreplaystate'
import { defaultwasmvoicestate } from '../wasm/wasmvoiceconfig'

import {
  bootisolateddaisyengine,
  getdaisyaudiocontext,
  startisolateddaisydsp,
} from './daisyengine'
import { createdaisysynth } from './daisysynth'

const DEFAULT_RENDER_SEC = 2
const DEFAULT_SAMPLERATE = 44100

export type DAISY_PERF_BENCH_RESULT = {
  rendersec: number
  wallsec: number
  realtimefactor: number
}

function buildworstcaseticks(rendersec: number): SYNTH_NOTE_ENTRY[] {
  const ticks: SYNTH_NOTE_ENTRY[] = []
  for (let ch = 0; ch < 8; ch++) {
    ticks.push([0, [ch, `${rendersec}s`, 'C4']])
  }
  for (let drum = 0; drum < 10; drum++) {
    ticks.push([0, [0, '16n', drum]])
  }
  return ticks
}

function buildworstcasereplay(): WASM_REPLAY_STATE {
  const fxsab = defaultwasmfxsab()
  for (let group = 0; group < 3; group++) {
    applywasmfxconfig(fxsab, group, 'echo', 'on', '')
    applywasmfxconfig(fxsab, group, 'reverb', 'on', '')
    applywasmfxconfig(fxsab, group, 'vibrato', 'on', '')
    applywasmfxconfig(fxsab, group, 'autofilter', 'on', '')
    applywasmfxconfig(fxsab, group, 'distort', 'on', '')
  }
  return {
    voicecfg: defaultwasmvoicestate(),
    oscconfig: defaultwasmoscconfig(),
    algoconfig: defaultwasmalgoconfig(),
    fxsab,
    playvolume: 80,
    bgplayvolume: 100,
  }
}

export async function rundaisyperfbench(
  rendersec = DEFAULT_RENDER_SEC,
): Promise<DAISY_PERF_BENCH_RESULT> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }

  const samplerate = getdaisyaudiocontext()?.sampleRate ?? DEFAULT_SAMPLERATE
  const length = Math.max(1, Math.ceil(rendersec * samplerate))
  const offlinectx = new OfflineAudioContext(1, length, samplerate)

  const wallstart = performance.now()
  const engine = await bootisolateddaisyengine(offlinectx)
  startisolateddaisydsp(engine, 80, 100, WASM_DEFAULT_TTS_VOLUME)
  const synth = createdaisysynth(engine)
  synth.applyreplay(buildworstcasereplay())
  synth.synthreplay(buildworstcaseticks(rendersec), rendersec)
  synth.prepareofflinerender()
  await offlinectx.startRendering()
  synth.destroy()
  const wallsec = (performance.now() - wallstart) / 1000

  return {
    rendersec,
    wallsec,
    realtimefactor: rendersec / wallsec,
  }
}

if (process.env.ZSS_DAISY_BENCH === '1') {
  void rundaisyperfbench()
}
