import {
  duckwasmsynthsidechain,
  ensuresynthwasm,
  initwasmsynthvoices,
  setwasmsynthplayvolume,
} from './maximilian'
import { createwasmsynth, type WASM_SYNTH } from './maxisynth'
import { schedulewarmwasmdrums } from './warmwasmdrums'

export async function bootwasmsynth(): Promise<WASM_SYNTH> {
  const maxi = await ensuresynthwasm()
  await initwasmsynthvoices()
  const synth = createwasmsynth(maxi, {
    setplayvolume: setwasmsynthplayvolume,
    ducksidechain: duckwasmsynthsidechain,
  })
  synth.resyncsabs()
  schedulewarmwasmdrums(synth)
  return synth
}
