/*
what is EIGHT_TRACK_TAPE ?
super simple, generic sequencer data
once() func invokes played on a board .. at a given BPM
*/

export type EIGHT_TRACK = {
  id?: string
  sequence: string[]
}

export type EIGHT_TRACK_TAPE = {
  id?: string
  tracks: EIGHT_TRACK[]
}
