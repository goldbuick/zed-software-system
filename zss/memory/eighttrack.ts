import { MAYBE } from 'zss/mapping/types'

import { FORMAT_OBJECT, formatobject, unformatobject } from './format'
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
): MAYBE<FORMAT_OBJECT> {
  return formatobject(fxconfig, {})
}

export function importeighttrackfxconfig(
  fxconfigentry: MAYBE<FORMAT_OBJECT>,
): MAYBE<EIGHT_FX_CONFIG> {
  return unformatobject(fxconfigentry, {})
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
): MAYBE<FORMAT_OBJECT> {
  return formatobject(synthconfig, {})
}

export function importeighttracksynthconfig(
  synthconfigentry: MAYBE<FORMAT_OBJECT>,
): MAYBE<EIGHT_SYNTH_CONFIG> {
  return unformatobject(synthconfigentry, {})
}

export function createeighttrackmeasure(): EIGHT_MEASURE {
  return [-1, -1, -1, -1, -1, -1, -1, -1]
}

export function exporteighttrackmeasure(
  measure: MAYBE<EIGHT_MEASURE>,
): MAYBE<FORMAT_OBJECT> {
  return formatobject(measure, {})
}

export function importeighttrackmeasure(
  measureentry: MAYBE<FORMAT_OBJECT>,
): MAYBE<EIGHT_MEASURE> {
  return unformatobject(measureentry, {})
}

export function createeighttrack(): EIGHT_TRACK {
  return {
    tempo: 150,
    synths: [
      // TODO, this should be moved a central spot
      // we only config 8 synth devices EVER
      // and this means we do not need this date in 8tracks
      // we still persist this to generic flag storage
      // but we don't need this here
      // so basically the data that needs to be edited here
      // is what goes in the measures ??
      // and this is just line numbers ??
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
): MAYBE<FORMAT_OBJECT> {
  return formatobject(eighttrack, EIGHT_TRACK_KEYS, {
    synths: exporteighttracksynthconfig,
    measures: exporteighttrackmeasure,
  })
}

export function importeighttrack(
  eighttrackentry: MAYBE<FORMAT_OBJECT>,
): MAYBE<EIGHT_TRACK> {
  return unformatobject(eighttrackentry, EIGHT_TRACK_KEYS)
}
