import { invokeplay, parseplay } from '../../playnotation'
import type { SYNTH_NOTE_ENTRY } from '../../playnotation'
import {
  bootisolatedmaxiengine,
  startisolatedmaximiliandsp,
} from './maximilian'
import { createwasmsynth } from './maxisynth'
import { audiobuffermetrics, type PARITY_AUDIO_METRICS } from './paritymetrics'
import type { PARITY_PATCH } from './paritypatches'
import { WASM_SYNTH_VOICE_PLAY_CODE } from './voiceplaycode'
import { WASM_DEFAULT_TTS_VOLUME } from './wasmmastersab'
import { defaultwasmalgoconfig } from './wasmalgoconfigsab'
import { defaultwasmoscconfig } from './wasmoscconfigsab'
import { defaultwasmvoicestate } from './wasmvoiceconfig'
import { defaultwasmfxsab } from './wasmfxstate'

import type { WASM_REPLAY_STATE } from './wasmreplaystate'

const PARITY_SAMPLERATE = 44100

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
  const invoke = parseplay(notation)
  return invokeplay(0, 0, invoke, true)
}

export async function renderwasmparitypatch(
  patch: PARITY_PATCH,
): Promise<PARITY_AUDIO_METRICS> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }

  const length = Math.max(1, Math.ceil(patch.durationsec * PARITY_SAMPLERATE))
  const offlinectx = new OfflineAudioContext(1, length, PARITY_SAMPLERATE)
  const maxi = await bootisolatedmaxiengine(offlinectx)
  await startisolatedmaximiliandsp(
    maxi,
    WASM_SYNTH_VOICE_PLAY_CODE,
    80,
    100,
    WASM_DEFAULT_TTS_VOLUME,
  )

  const synth = createwasmsynth(maxi)
  const replay = buildreplay()
  synth.applyreplay(replay)
  synth.setvoiceconfig(patch.voiceindex, patch.voiceconfig, '')
  synth.setplayvolume(80)
  synth.setbgplayvolume(100)

  const ticks = patchentries(patch.notation)
  const maxtime = patch.durationsec
  synth.synthreplay(ticks, maxtime)
  synth.prepareofflinerender()

  const buffer = await offlinectx.startRendering()
  synth.destroy()
  return audiobuffermetrics(buffer)
}
