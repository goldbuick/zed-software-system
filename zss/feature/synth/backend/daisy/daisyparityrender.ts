import { invokeplay, parseplay, tonenotationseconds } from '../../playnotation'
import type { SYNTH_NOTE_ENTRY } from '../../playnotation'
import { isstring } from 'zss/mapping/types'

import {
  bootisolateddaisyengine,
  startisolateddaisydsp,
} from './daisyengine'
import { createdaisysynth } from './daisysynth'
import {
  type PARITY_AUDIO_METRICS,
  audiobuffermetrics,
} from '../wasm/paritymetrics'
import type {
  DRUM_PARITY_PATCH,
  FX_PARITY_PATCH,
  MASTER_DYNAMICS_PARITY_PATCH,
  PARITY_PATCH,
} from '../wasm/paritypatches'
import { defaultwasmalgoconfig } from '../wasm/wasmalgoconfigsab'
import { applywasmfxconfig, defaultwasmfxsab } from '../wasm/wasmfxstate'
import { WASM_DEFAULT_TTS_VOLUME } from '../wasm/wasmmastersab'
import { defaultwasmoscconfig } from '../wasm/wasmoscconfigsab'
import type { WASM_REPLAY_STATE } from '../wasm/wasmreplaystate'
import { defaultwasmvoicestate } from '../wasm/wasmvoiceconfig'

const PARITY_SAMPLERATE = 44100
const PARITY_REPLAY_OFFSET_SEC = 0.05

function parityrenderlengthsec(
  durationsec: number,
  ticks: SYNTH_NOTE_ENTRY[],
): number {
  let latest = durationsec
  for (let i = 0; i < ticks.length; i++) {
    const [time, value] = ticks[i]
    const [, notation] = value
    let eventend = time + PARITY_REPLAY_OFFSET_SEC
    if (isstring(notation)) {
      eventend += tonenotationseconds(notation)
    }
    if (eventend > latest) {
      latest = eventend
    }
  }
  return Math.max(latest + 0.15, durationsec + 1.0)
}

function buildreplay(): WASM_REPLAY_STATE {
  return {
    voicecfg: defaultwasmvoicestate(),
    oscconfig: defaultwasmoscconfig(),
    algoconfig: defaultwasmalgoconfig(),
    fxsab: defaultwasmfxsab(),
    playvolume: 80,
    bgplayvolume: 100,
  }
}

function patchentries(notation: string): SYNTH_NOTE_ENTRY[] {
  const invoke = parseplay(notation)[0]
  return invokeplay(0, 0, invoke, true)
}

async function renderdaisyoffline(
  rendersec: number,
  setup: (synth: ReturnType<typeof createdaisysynth>) => void,
): Promise<PARITY_AUDIO_METRICS> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }

  const length = Math.max(1, Math.ceil(rendersec * PARITY_SAMPLERATE))
  const offlinectx = new OfflineAudioContext(1, length, PARITY_SAMPLERATE)
  const engine = await bootisolateddaisyengine(offlinectx)
  await startisolateddaisydsp(engine, 80, 100, WASM_DEFAULT_TTS_VOLUME)

  const synth = createdaisysynth(engine)
  const replay = buildreplay()
  synth.applyreplay(replay)
  setup(synth)
  synth.prepareofflinerender()

  const buffer = await offlinectx.startRendering()
  synth.destroy()
  return audiobuffermetrics(buffer)
}

export async function renderdaisyparitypatch(
  patch: PARITY_PATCH,
): Promise<PARITY_AUDIO_METRICS> {
  const ticks = patchentries(patch.notation)
  const rendersec = parityrenderlengthsec(patch.durationsec, ticks)
  return renderdaisyoffline(rendersec, (synth) => {
    synth.setvoiceconfig(patch.voiceindex, patch.voiceconfig, '')
    synth.setplayvolume(80)
    synth.setbgplayvolume(100)
    synth.synthreplay(ticks, patch.durationsec)
  })
}

export async function renderdaisyparitydrumpatch(
  patch: DRUM_PARITY_PATCH,
): Promise<PARITY_AUDIO_METRICS> {
  const ticks = patchentries(patch.notation)
  const rendersec = parityrenderlengthsec(patch.durationsec, ticks)
  return renderdaisyoffline(rendersec, (synth) => {
    synth.setplayvolume(80)
    synth.setbgplayvolume(100)
    synth.synthreplay(ticks, patch.durationsec)
  })
}

export async function renderdaisyparityfxpatch(
  patch: FX_PARITY_PATCH,
): Promise<PARITY_AUDIO_METRICS> {
  const ticks = patchentries(patch.notation)
  const rendersec = parityrenderlengthsec(patch.durationsec, ticks)
  const fxsab = defaultwasmfxsab()
  applywasmfxconfig(fxsab, patch.voiceindex, patch.fx, patch.fxconfig, patch.fxvalue)
  return renderdaisyoffline(rendersec, (synth) => {
    synth.setvoiceconfig(patch.voiceindex, patch.voiceconfig, '')
    synth.applyreplay({
      ...buildreplay(),
      fxsab,
    })
    synth.setplayvolume(80)
    synth.setbgplayvolume(100)
    synth.synthreplay(ticks, patch.durationsec)
  })
}

export async function renderdaisyparitymasterpatch(
  patch: MASTER_DYNAMICS_PARITY_PATCH,
): Promise<PARITY_AUDIO_METRICS> {
  const rendersec = parityrenderlengthsec(patch.durationsec, patch.ticks)
  return renderdaisyoffline(rendersec, (synth) => {
    synth.setvoiceconfig(0, patch.voiceconfig, '')
    for (let vi = 4; vi < 8; vi++) {
      synth.setvoiceconfig(vi, patch.voiceconfig, '')
    }
    synth.setplayvolume(80)
    synth.setbgplayvolume(100)
    synth.synthreplay(patch.ticks, rendersec)
  })
}
