import { invokeplay, parseplay, tonenotationseconds } from 'zss/feature/synth/playnotation'
import type { SYNTH_NOTE_ENTRY } from 'zss/feature/synth/playnotation'
import { isstring } from 'zss/mapping/types'

import {
  bootisolatedmaxiengine,
  startisolatedmaximiliandsp,
} from './maximilian'
import { createwasmsynth } from './maxisynth'
import { type PARITY_AUDIO_METRICS, audiobuffermetrics } from 'zss/feature/synth/backend/wasm/paritymetrics'
import type { PARITY_PATCH } from 'zss/feature/synth/backend/wasm/paritypatches'
import { WASM_SYNTH_VOICE_PLAY_CODE } from './voiceplaycode'
import { defaultwasmalgoconfig } from 'zss/feature/synth/backend/wasm/wasmalgoconfigsab'
import { defaultwasmfxsab } from 'zss/feature/synth/backend/wasm/wasmfxstate'
import { WASM_DEFAULT_TTS_VOLUME } from 'zss/feature/synth/backend/wasm/wasmmainsab'
import { defaultwasmoscconfig } from 'zss/feature/synth/backend/wasm/wasmoscconfigsab'
import type { WASM_REPLAY_STATE } from 'zss/feature/synth/backend/wasm/wasmreplaystate'
import { defaultwasmvoicestate } from 'zss/feature/synth/backend/wasm/wasmvoiceconfig'

const PARITY_SAMPLERATE = 44100
const PARITY_REPLAY_OFFSET_SEC = 0.05

function parityrenderlengthsec(
  patch: PARITY_PATCH,
  ticks: SYNTH_NOTE_ENTRY[],
): number {
  let latest = patch.durationsec
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
  return Math.max(latest + 0.15, patch.durationsec + 1.0)
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

export async function renderwasmparitypatch(
  patch: PARITY_PATCH,
): Promise<PARITY_AUDIO_METRICS> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }

  const ticks = patchentries(patch.notation)
  const rendersec = parityrenderlengthsec(patch, ticks)
  const length = Math.max(1, Math.ceil(rendersec * PARITY_SAMPLERATE))
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

  const maxtime = patch.durationsec
  synth.synthreplay(ticks, maxtime)
  synth.prepareofflinerender()

  const buffer = await offlinectx.startRendering()
  synth.destroy()
  return audiobuffermetrics(buffer)
}
