import { createsid } from 'zss/mapping/guid'
import { MAYBE } from 'zss/mapping/types'

export type EIGHT_TRACK = {
  id?: string
  patterns: string[]
}

export type EIGHT_TRACK_TAPE = {
  id?: string
  tracks: EIGHT_TRACK[]
}

export type MAYBE_EIGHT_TRACK_TAPE = MAYBE<EIGHT_TRACK_TAPE>

function createcreateeighttracktapetrack(): EIGHT_TRACK {
  return {
    id: createsid(),
    patterns: ['', '', '', '', '', '', '', ''],
  }
}

export function createeighttracktape(): EIGHT_TRACK_TAPE {
  return {
    id: createsid(),
    tracks: [
      createcreateeighttracktapetrack(),
      createcreateeighttracktapetrack(),
      createcreateeighttracktapetrack(),
      createcreateeighttracktapetrack(),
      createcreateeighttracktapetrack(),
      createcreateeighttracktapetrack(),
      createcreateeighttracktapetrack(),
      createcreateeighttracktapetrack(),
    ],
  }
}

export function exporteighttracktape(
  eighttracktape: MAYBE_EIGHT_TRACK_TAPE,
): MAYBE_EIGHT_TRACK_TAPE {
  return eighttracktape
}

export function importeighttracktape(
  eighttracktape: MAYBE_EIGHT_TRACK_TAPE,
): MAYBE_EIGHT_TRACK_TAPE {
  return eighttracktape
}
