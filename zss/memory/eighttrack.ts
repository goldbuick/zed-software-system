import { ispresent, MAYBE } from 'zss/mapping/types'

import { BIN_EIGHT_TRACK } from './binary'
import {
  EIGHT_FX,
  EIGHT_FX_CONFIG,
  EIGHT_MEASURE,
  EIGHT_SYNTH,
  EIGHT_SYNTH_CONFIG,
  EIGHT_TRACK,
} from './types'

export function createeighttrackfxconfig(): EIGHT_FX_CONFIG {
  return {
    fx: EIGHT_FX.ECHO,
    settings: {},
  }
}

export function createeighttracksynthconfig(): EIGHT_SYNTH_CONFIG {
  return {
    synth: EIGHT_SYNTH.SQUARE,
    effects: [],
    settings: {},
  }
}

export function createeighttrackmeasure(): EIGHT_MEASURE {
  return [-1, -1, -1, -1, -1, -1, -1, -1]
}

export function createeighttrack(): EIGHT_TRACK {
  return {
    tempo: 150,
    synths: [
      createeighttracksynthconfig(),
      createeighttracksynthconfig(),
      createeighttracksynthconfig(),
      createeighttracksynthconfig(),
      createeighttracksynthconfig(),
      createeighttracksynthconfig(),
      createeighttracksynthconfig(),
      createeighttracksynthconfig(),
    ],
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
