import type { SYNTH_NOTE_ENTRY } from '../../playnotation'

import {
  bootisolatedmaxiengine,
  getmaximaudiocontext,
  startisolatedmaximiliandsp,
} from './maximilian'
import { createwasmsynth } from './maxisynth'
import { WASM_SYNTH_VOICE_PLAY_CODE } from './voiceplaycode'
import { defaultwasmalgoconfig } from '../../backend/wasm/wasmalgoconfigsab'
import { applywasmfxconfig, defaultwasmfxsab } from '../../backend/wasm/wasmfxstate'
import { WASM_DEFAULT_TTS_VOLUME } from '../../backend/wasm/wasmmainsab'
import type { WASM_REPLAY_STATE } from '../../backend/wasm/wasmreplaystate'
import { defaultwasmoscconfig } from '../../backend/wasm/wasmoscconfigsab'
import { defaultwasmvoicestate } from '../../backend/wasm/wasmvoiceconfig'

const DEFAULT_RENDER_SEC = 2
const DEFAULT_SAMPLERATE = 44100

export type WASM_PERF_BENCH_RESULT = {
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

export async function runwasmperfbench(
  rendersec = DEFAULT_RENDER_SEC,
): Promise<WASM_PERF_BENCH_RESULT> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }

  const samplerate = getmaximaudiocontext()?.sampleRate ?? DEFAULT_SAMPLERATE
  const length = Math.max(1, Math.ceil(rendersec * samplerate))
  const offlinectx = new OfflineAudioContext(1, length, samplerate)
  const maxi = await bootisolatedmaxiengine(offlinectx)
  await startisolatedmaximiliandsp(
    maxi,
    WASM_SYNTH_VOICE_PLAY_CODE,
    80,
    100,
    WASM_DEFAULT_TTS_VOLUME,
  )

  const synth = createwasmsynth(maxi)
  const replay = buildworstcasereplay()
  synth.applyreplay(replay)
  for (let i = 0; i < 8; i++) {
    synth.setvoiceconfig(i, 'algo', 0)
  }

  const ticks = buildworstcaseticks(rendersec)
  synth.synthreplay(ticks, rendersec)
  synth.prepareofflinerender()

  const wallstart = performance.now()
  await offlinectx.startRendering()
  const wallsec = (performance.now() - wallstart) / 1000
  synth.destroy()

  return {
    rendersec,
    wallsec,
    realtimefactor: wallsec / rendersec,
  }
}

async function main() {
  if (typeof OfflineAudioContext === 'undefined') {
    console.error(
      'OfflineAudioContext not available in this runtime. Use ZSS_WASM_BENCH=1 in a browser-backed test (see wasmparity.test.ts) or run from the app context.',
    )
    process.exit(1)
  }
  const result = await runwasmperfbench()
  console.log(
    JSON.stringify(
      {
        ...result,
        summary: `${result.realtimefactor.toFixed(3)}x realtime (lower is faster)`,
      },
      null,
      2,
    ),
  )
}

const isdirectrun =
  typeof process !== 'undefined' &&
  process.argv[1]?.includes('wasmperfbench')

if (isdirectrun) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
