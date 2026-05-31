import { SYNTH_VOICE_COUNT } from 'zss/feature/synth/synthdefaults'

import type { SabEngine } from '../shared/sabengine'

import { initwasmsabchannels, pushwasmsabvalues } from './sabpush'
import { initwasmalgoconfigsab } from './wasmalgoconfigsab'
import { initwasmoscconfigsab } from './wasmoscconfigsab'
import {
  WASM_DRUMS_SAB,
  WASM_DRUM_SAB_LEN,
  WASM_VOICES_SAB,
  WASM_VOICE_STRIDE,
} from './wasmsabchannels'
import { initwasmvoicecfgsab } from './wasmvoicecfgsab'
import {
  defaultwasmvoicestate,
  wasmvoicestatetosab,
} from './wasmvoiceconfig'

export function initwasmvoicesab(engine: SabEngine) {
  initwasmsabchannels(engine)
  const voicecfg = defaultwasmvoicestate()
  const playstate = new Array(SYNTH_VOICE_COUNT * WASM_VOICE_STRIDE).fill(0)
  const sab = wasmvoicestatetosab(voicecfg, playstate, WASM_VOICE_STRIDE)
  pushwasmsabvalues(engine, WASM_VOICES_SAB, sab)
  initwasmvoicecfgsab(engine, voicecfg)
  initwasmoscconfigsab(engine)
  initwasmalgoconfigsab(engine)
}

export function initwasmdrumsab(engine: SabEngine, strikes?: number[]) {
  pushwasmsabvalues(
    engine,
    WASM_DRUMS_SAB,
    strikes ?? new Array(WASM_DRUM_SAB_LEN).fill(0),
  )
}
