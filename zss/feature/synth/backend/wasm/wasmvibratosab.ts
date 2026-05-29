import type { SabEngine } from '../shared/sabengine'
import { pushwasmsabvalues } from './sabpush'
import {
  WASM_VIBRATO_GROUP_COUNT,
  WASM_VIBRATO_SAB,
  WASM_VIBRATO_SAB_LEN,
  WASM_VIBRATO_STRIDE,
} from './wasmsabchannels'

export function defaultwasmvibratosab(timeepoch = 0): number[] {
  return new Array(WASM_VIBRATO_SAB_LEN).fill(0).map((_, i) => (i === 0 ? timeepoch : 0))
}

export function initwasmvibratosab(maxi: SabEngine, timeepoch: number) {
  pushwasmsabvalues(maxi, WASM_VIBRATO_SAB, defaultwasmvibratosab(timeepoch))
}

export function pushwasmvibratosab(maxi: SabEngine, sab: number[]) {
  pushwasmsabvalues(maxi, WASM_VIBRATO_SAB, sab)
}

export function wasmgroupvibratobase(group: number): number {
  return 1 + group * WASM_VIBRATO_STRIDE
}

export function pushwasmvibratogroup(
  maxi: SabEngine,
  sab: number[],
  group: number,
  startsec: number,
  endsec: number,
  peakdepth: number,
  peakfreq: number,
) {
  if (group < 0 || group >= WASM_VIBRATO_GROUP_COUNT) {
    return
  }
  const base = wasmgroupvibratobase(group)
  sab[base] = startsec
  sab[base + 1] = endsec
  sab[base + 2] = peakdepth
  sab[base + 3] = peakfreq
  pushwasmvibratosab(maxi, sab)
}
