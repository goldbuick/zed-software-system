import { createsid } from 'zss/mapping/guid'
import { MAYBE } from 'zss/mapping/types'

export type EIGHT_TRACK_PATTERNS = {
  id?: string
  patterns: string[]
}

export type EIGHT_TRACK = {
  id?: string
  tracks: EIGHT_TRACK_PATTERNS[]
}

export type MAYBE_EIGHT_TRACK = MAYBE<EIGHT_TRACK>

function createpatterns(): EIGHT_TRACK_PATTERNS {
  return {
    id: createsid(),
    patterns: ['', '', '', '', '', '', '', ''],
  }
}

export function createeighttracktape(): EIGHT_TRACK {
  return {
    id: createsid(),
    tracks: [
      createpatterns(),
      createpatterns(),
      createpatterns(),
      createpatterns(),
      createpatterns(),
      createpatterns(),
      createpatterns(),
      createpatterns(),
    ],
  }
}

export function exporteighttracktape(
  eighttracktape: MAYBE_EIGHT_TRACK,
): MAYBE_EIGHT_TRACK {
  return eighttracktape
}

export function importeighttracktape(
  eighttracktape: MAYBE_EIGHT_TRACK,
): MAYBE_EIGHT_TRACK {
  return eighttracktape
}
