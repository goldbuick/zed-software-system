import {
  ensuresynthwasm,
  initwasmsynthvoices,
  setwasmsynthbgplayvolume,
  setwasmsynthplayvolume,
} from './maximilian'
import { createwasmsynth, type WASM_SYNTH } from './maxisynth'
import { schedulewarmwasmdrums } from './warmwasmdrums'
import {
  SYNTH_DEFAULT_WAVE,
  SYNTH_VOICE_COUNT,
} from '../synthdefaults'

export async function bootwasmsynth(): Promise<WASM_SYNTH> {
  const maxi = await ensuresynthwasm()
  await initwasmsynthvoices()
  const synth = createwasmsynth(maxi, {
    setplayvolume: setwasmsynthplayvolume,
    setbgplayvolume: setwasmsynthbgplayvolume,
  })
  synth.resyncsabs()
  for (let i = 0; i < SYNTH_VOICE_COUNT; i++) {
    synth.setvoiceconfig(i, SYNTH_DEFAULT_WAVE, '')
  }
  schedulewarmwasmdrums(synth)
  return synth
}
