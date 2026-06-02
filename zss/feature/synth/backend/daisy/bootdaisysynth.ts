import { SYNTH_DEFAULT_WAVE, SYNTH_VOICE_COUNT } from '../../synthdefaults'

import {
  ensuredaisysynthwasm,
  initwasmmastersab,
  setdaisysynthbgplayvolume,
  setdaisysynthplayvolume,
  setdaisysynthttsvolume,
} from './daisyengine'
import { createdaisyrecordhandler } from './daisyrecordhandler'
import { type DAISY_SYNTH, createdaisysynth } from './daisysynth'
import { schedulewarmdaisydrums } from './warmdaisydrums'

export async function bootdaisysynth(): Promise<DAISY_SYNTH> {
  const engine = await ensuredaisysynthwasm()
  initwasmmastersab(engine)
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
