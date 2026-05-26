import type { SYNTH_NOTE_ENTRY } from '../playnotation'

export type RECORDING_STATE = {
  recordedticks: SYNTH_NOTE_ENTRY[]
  recordlastpercent: number
  recordisrendering: number
}
