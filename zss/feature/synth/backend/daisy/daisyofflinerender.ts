import { WASM_DEFAULT_TTS_VOLUME } from 'zss/feature/synth/backend/wasm/wasmmainsab'
import type { WASM_REPLAY_STATE } from 'zss/feature/synth/backend/wasm/wasmreplaystate'
import type { SYNTH_NOTE_ENTRY } from 'zss/feature/synth/playnotation'

import {
  bootisolateddaisyengine,
  getdaisyaudiocontext,
  startisolateddaisydsp,
} from './daisyengine'
import { createdaisysynth } from './daisysynth'

export async function renderdaisyrecord(
  replay: WASM_REPLAY_STATE,
  offlineticks: SYNTH_NOTE_ENTRY[],
  maxtime: number,
  durationsec: number,
): Promise<AudioBuffer> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }

  const samplerate = getdaisyaudiocontext()?.sampleRate ?? 44100
  const length = Math.max(1, Math.ceil(durationsec * samplerate))
  const offlinectx = new OfflineAudioContext(2, length, samplerate)

  const engine = await bootisolateddaisyengine(offlinectx)
  startisolateddaisydsp(
    engine,
    replay.playvolume,
    replay.bgplayvolume,
    WASM_DEFAULT_TTS_VOLUME,
  )

  const synth = createdaisysynth(engine)
  synth.applyreplay(replay)
  synth.synthreplay(offlineticks, maxtime)
  synth.prepareofflinerender()

  const buffer = await offlinectx.startRendering()
  synth.destroy()
  return buffer
}
