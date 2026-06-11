import { SYNTH_DEFAULT_WAVE, SYNTH_VOICE_COUNT } from 'zss/feature/synth/synthdefaults'

import {
  ensuresynthwasm,
  initwasmsynthvoices,
  setwasmsynthbgplayvolume,
  setwasmsynthplayvolume,
  setwasmsynthttsvolume,
} from './maximilian'
import { type WASM_SYNTH, createwasmsynth } from './maxisynth'
import { schedulewarmwasmdrums } from './warmwasmdrums'
import { createwasmrecordhandler } from './wasmrecordhandler'

export async function bootwasmsynth(): Promise<WASM_SYNTH> {
  const maxi = await ensuresynthwasm()
  await initwasmsynthvoices()
  const synth = createwasmsynth(
    maxi,
    {
      setplayvolume: setwasmsynthplayvolume,
      setbgplayvolume: setwasmsynthbgplayvolume,
      setttsvolume: setwasmsynthttsvolume,
    },
    createwasmrecordhandler,
  )
  synth.resyncsabs()
  for (let i = 0; i < SYNTH_VOICE_COUNT; i++) {
    synth.setvoiceconfig(i, SYNTH_DEFAULT_WAVE, '')
  }
  schedulewarmwasmdrums(synth)
  return synth
}
