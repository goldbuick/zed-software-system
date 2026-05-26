import type { SYNTH_NOTE_ENTRY } from '../../playnotation'

import {
  bootisolatedmaxiengine,
  getmaximaudiocontext,
  startisolatedmaximiliandsp,
} from './maximilian'
import { createwasmsynth } from './maxisynth'
import { WASM_SYNTH_VOICE_PLAY_CODE } from './voiceplaycode'
import { WASM_DEFAULT_TTS_VOLUME } from './wasmmastersab'
import type { WASM_REPLAY_STATE } from './wasmreplaystate'

export async function renderwasmrecord(
  replay: WASM_REPLAY_STATE,
  offlineticks: SYNTH_NOTE_ENTRY[],
  maxtime: number,
  durationsec: number,
): Promise<AudioBuffer> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }

  const samplerate = getmaximaudiocontext()?.sampleRate ?? 44100
  const length = Math.max(1, Math.ceil(durationsec * samplerate))
  const offlinectx = new OfflineAudioContext(2, length, samplerate)

  const maxi = await bootisolatedmaxiengine(offlinectx)
  await startisolatedmaximiliandsp(
    maxi,
    WASM_SYNTH_VOICE_PLAY_CODE,
    replay.playvolume,
    replay.bgplayvolume,
    WASM_DEFAULT_TTS_VOLUME,
  )

  const synth = createwasmsynth(maxi)
  synth.applyreplay(replay)
  synth.synthreplay(offlineticks, maxtime)
  synth.prepareofflinerender()

  const buffer = await offlinectx.startRendering()
  synth.destroy()
  return buffer
}
