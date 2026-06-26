import {
  WASM_DEFAULT_BGPLAY_VOLUME,
  WASM_DEFAULT_PLAY_VOLUME,
  WASM_DEFAULT_TTS_VOLUME,
  initwasmmainsab,
} from 'zss/feature/synth/backend/wasm/wasmmainsab'
import {
  SYNTH_DEFAULT_WAVE,
  SYNTH_VOICE_COUNT,
} from 'zss/feature/synth/synthdefaults'

import {
  ensuredaisysynthwasm,
  setdaisysynthbgplayvolume,
  setdaisysynthplayvolume,
  setdaisysynthttsvolume,
} from './daisyengine'
import { createdaisyrecordhandler } from './daisyrecordhandler'
import { type DAISY_SYNTH, createdaisysynth } from './daisysynth'
import { isdaisymaincompbypass, isdaisysidechainbypass } from './flags'
import { schedulewarmdaisydrums } from './warmdaisydrums'

export async function bootdaisysynth(): Promise<DAISY_SYNTH> {
  const engine = await ensuredaisysynthwasm()
  initwasmmainsab(
    engine,
    WASM_DEFAULT_PLAY_VOLUME,
    WASM_DEFAULT_BGPLAY_VOLUME,
    WASM_DEFAULT_TTS_VOLUME,
    isdaisymaincompbypass() ? 1 : 0,
    isdaisysidechainbypass() ? 1 : 0,
  )
  const synth = createdaisysynth(
    engine,
    {
      setplayvolume: setdaisysynthplayvolume,
      setbgplayvolume: setdaisysynthbgplayvolume,
      setttsvolume: setdaisysynthttsvolume,
    },
    createdaisyrecordhandler,
  )
  synth.resyncsabs()
  for (let i = 0; i < SYNTH_VOICE_COUNT; i++) {
    synth.setvoiceconfig(i, SYNTH_DEFAULT_WAVE, '')
  }
  schedulewarmdaisydrums(synth)
  return synth
}
