import { ispresent, MAYBE } from 'zss/mapping/types'

import {
  FORMAT_ENTRY,
  FORMAT_KEY,
  FORMAT_TYPE,
  formatbytelist,
  formatlist,
  formatnumber,
  unpackformatlist,
} from './format'
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

export function exporteighttrackfxconfig(
  fxconfig: MAYBE<EIGHT_FX_CONFIG>,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(fxconfig)) {
    return
  }
}

export function importeighttrackfxconfig(
  fxconfigentry: MAYBE<FORMAT_ENTRY>,
): MAYBE<EIGHT_FX_CONFIG> {
  if (fxconfigentry?.type !== FORMAT_TYPE.LIST) {
    return
  }
}

export function createeighttracksynthconfig(): EIGHT_SYNTH_CONFIG {
  return {
    synth: EIGHT_SYNTH.SQUARE,
    effects: [],
    settings: {},
  }
}

export function exporteighttracksynthconfig(
  synthconfig: MAYBE<EIGHT_SYNTH_CONFIG>,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(synthconfig)) {
    return
  }
}

export function importeighttracksynthconfig(
  synthconfigentry: MAYBE<FORMAT_ENTRY>,
): MAYBE<EIGHT_SYNTH_CONFIG> {
  if (synthconfigentry?.type !== FORMAT_TYPE.LIST) {
    return
  }
}

export function createeighttrackmeasure(): EIGHT_MEASURE {
  return [-1, -1, -1, -1, -1, -1, -1, -1]
}

export function exporteighttrackmeasure(
  measure: MAYBE<EIGHT_MEASURE>,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(measure)) {
    return
  }
  return formatbytelist(Uint8Array.from(measure))
}

export function importeighttrackmeasure(
  measureentry: MAYBE<FORMAT_ENTRY>,
): MAYBE<EIGHT_MEASURE> {
  if (measureentry?.type !== FORMAT_TYPE.BYTELIST) {
    return
  }
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

enum EIGHT_TRACK_KEYS {
  tempo,
  synths,
  measures,
}

export function exporteighttrack(
  eighttrack: MAYBE<EIGHT_TRACK>,
  key?: FORMAT_KEY,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(eighttrack)) {
    return
  }
  return formatlist(
    [
      formatnumber(eighttrack.tempo, EIGHT_TRACK_KEYS.tempo),
      formatlist(
        eighttrack.synths.map(exporteighttracksynthconfig),
        EIGHT_TRACK_KEYS.synths,
      ),
      formatlist(
        eighttrack.measures.map(exporteighttrackmeasure),
        EIGHT_TRACK_KEYS.measures,
      ),
    ],
    key,
  )
}

export function importeighttrack(
  eighttrackentry: MAYBE<FORMAT_ENTRY>,
): MAYBE<EIGHT_TRACK> {
  const eighttrack = unpackformatlist<EIGHT_TRACK | any>(
    eighttrackentry,
    EIGHT_TRACK_KEYS,
  )
  if (ispresent(eighttrack)) {
    eighttrack.synths = eighttrack.synths.map(importeighttracksynthconfig)
    eighttrack.measures = eighttrack.measures.map(importeighttrackmeasure)
  }
  return eighttrack
}
