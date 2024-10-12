import { ispresent, MAYBE } from 'zss/mapping/types'

import { BIN_EIGHT_TRACK } from './binary'
import { EIGHT_MEASURE, EIGHT_TRACK } from './types'

export function createeighttrackmeasure(): EIGHT_MEASURE {
  return [-1, -1, -1, -1, -1, -1, -1, -1]
}

export function createeighttrack(): EIGHT_TRACK {
  return {
    tempo: 150,
    synths: [],
    measures: [],
  }
}

export function exporteighttrack(
  eighttrack: MAYBE<EIGHT_TRACK>,
): MAYBE<BIN_EIGHT_TRACK> {
  if (!ispresent(eighttrack)) {
    return
  }

  return eighttrack
}

export function importeighttrack(
  eighttrack: MAYBE<BIN_EIGHT_TRACK>,
): MAYBE<EIGHT_TRACK> {
  if (!ispresent(eighttrack)) {
    return
  }
  return eighttrack as EIGHT_TRACK
}

/*

I think the trick will be handling the ambiguity of inserting new lines ??
  will need to do a re-map operation.

also boards will need to track active eight track state ..

so the idea is we have 8 tracks, to play lines of code on

the granularity is a single measure

so we need line numbers for each measure
[0, 1, -1, -1, -1, -1, -1, -1]
[0, 1, -1, -1, -1, -1, -1, -1]
[0, 1, -1, -1, -1, -1, -1, -1]
[0, 1, -1, -1, -1, -1, -1, -1]

and the tempo of the eight track

#play [name of eight track], will play the given 8track on the current board

Essentially we get 8 note polyphony
8 different chances to #play

*/
