import type { SYNTH_NOTE_ENTRY } from '../../playnotation'
import { invokeplay, parseplay, tonenotationseconds } from '../../playnotation'
import {
  type PARITY_AUDIO_METRICS,
  audiobuffermetrics,
} from '../wasm/paritymetrics'
import { defaultwasmalgoconfig } from '../wasm/wasmalgoconfigsab'
import { applywasmfxconfig, defaultwasmfxsab } from '../wasm/wasmfxstate'
import { WASM_DEFAULT_TTS_VOLUME } from '../wasm/wasmmainsab'
import { defaultwasmoscconfig } from '../wasm/wasmoscconfigsab'
import type { WASM_REPLAY_STATE } from '../wasm/wasmreplaystate'
import { defaultwasmvoicestate } from '../wasm/wasmvoiceconfig'

import { bootisolateddaisyengine, startisolateddaisydsp } from './daisyengine'
import { createdaisysynth } from './daisysynth'
import type { SOS_VOICE_PATCH } from './sosvoicepatches'

const SOS_SAMPLERATE = 44100
const SOS_REPLAY_OFFSET_SEC = 0.05

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

function renderlengthsec(
  durationsec: number,
  ticks: SYNTH_NOTE_ENTRY[],
): number {
  let latest = durationsec
  for (let i = 0; i < ticks.length; i++) {
    const [time, value] = ticks[i]
    const [, notation] = value
    let eventend = time + SOS_REPLAY_OFFSET_SEC
    if (typeof notation === 'string') {
      eventend += tonenotationseconds(notation)
    }
    if (eventend > latest) {
      latest = eventend
    }
  }
  return Math.max(latest + 0.2, durationsec + 0.75)
}

export async function rendersosvoicepatch(
  patch: SOS_VOICE_PATCH,
): Promise<PARITY_AUDIO_METRICS> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }

  const ticks = patchentries(patch.notation)
  const rendersec = renderlengthsec(patch.durationsec, ticks)
  const length = Math.max(1, Math.ceil(rendersec * SOS_SAMPLERATE))
  const offlinectx = new OfflineAudioContext(1, length, SOS_SAMPLERATE)
  const engine = await bootisolateddaisyengine(offlinectx)
  startisolateddaisydsp(engine, 80, 100, WASM_DEFAULT_TTS_VOLUME)

  const synth = createdaisysynth(engine)
  synth.applyreplay(buildreplay())
  synth.setvoiceconfig(0, patch.voiceconfig, '')
  if (patch.configs) {
    for (const [key, value] of patch.configs) {
      synth.setvoiceconfig(0, key, value)
    }
  }
  synth.setplayvolume(80)
  synth.synthreplay(ticks, patch.durationsec)
  synth.prepareofflinerender()

  const buffer = await offlinectx.startRendering()
  synth.destroy()
  return audiobuffermetrics(buffer)
}

export async function rendersosvoicepatches(
  patches: SOS_VOICE_PATCH[],
): Promise<Record<string, PARITY_AUDIO_METRICS>> {
  const out: Record<string, PARITY_AUDIO_METRICS> = {}
  for (const patch of patches) {
    out[patch.id] = await rendersosvoicepatch(patch)
  }
  return out
}
