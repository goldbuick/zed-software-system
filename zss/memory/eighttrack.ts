import { ispresent, MAYBE } from 'zss/mapping/types'

import {
  FORMAT_ENTRY,
  FORMAT_TYPE,
  formatbytelist,
  formatentryint,
  formatentrylist,
  formatlist,
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
  return formatbytelist(0, measure)
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
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(eighttrack)) {
    return
  }
  return formatlist([
    formatentryint(EIGHT_TRACK_KEYS.tempo, eighttrack.tempo),
    formatentrylist(
      EIGHT_TRACK_KEYS.synths,
      eighttrack.synths.map(exporteighttracksynthconfig),
    ),
    formatentrylist(
      EIGHT_TRACK_KEYS.measures,
      eighttrack.measures.map(exporteighttrackmeasure),
    ),
  ])
}

export function importeighttrack(
  eighttrackentry: MAYBE<FORMAT_ENTRY>,
): MAYBE<EIGHT_TRACK> {
  if (eighttrackentry?.type !== FORMAT_TYPE.LIST) {
    return
  }

  const eighttrack = unpackformatlist<EIGHT_TRACK>(
    eighttrackentry,
    EIGHT_TRACK_KEYS,
  )

  return eighttrack
}
