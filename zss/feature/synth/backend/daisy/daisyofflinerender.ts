import { WASM_DEFAULT_TTS_VOLUME } from 'zss/feature/synth/backend/wasm/wasmmainsab'
import type { WASM_REPLAY_STATE } from 'zss/feature/synth/backend/wasm/wasmreplaystate'
import type { SYNTH_NOTE_ENTRY } from 'zss/feature/synth/playnotation'

import {
  bootisolateddaisyengine,
  getdaisyaudiocontext,
  startisolateddaisydsp,
  teardownisolateddaisyengine,
} from './daisyengine'
import { createdaisysynth } from './daisysynth'

export async function renderdaisyrecord(
  replay: WASM_REPLAY_STATE,
  offlineticks: SYNTH_NOTE_ENTRY[],
  durationsec: number,
  onprogress?: (percent: number) => void,
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
  try {
    synth.applyreplay(replay)

    let lastpercent = -1
    const tickhook = onprogress
      ? (time: number) => {
          const percent = Math.min(
            100,
            Math.round((time / Math.max(durationsec, 1e-6)) * 100),
          )
          if (percent !== lastpercent) {
            lastpercent = percent
            onprogress(percent)
          }
        }
      : undefined

    // durationsec is the rebased render length (not live AudioContext.currentTime).
    synth.synthreplay(offlineticks, durationsec, tickhook)
    synth.prepareofflinerender()

    const buffer = await offlinectx.startRendering()
    return buffer
  } finally {
    synth.destroy()
    teardownisolateddaisyengine(engine)
  }
}
