import * as bin from 'typed-binary'
import { createsid } from 'zss/mapping/guid'
import { ispresent, MAYBE } from 'zss/mapping/types'

export type EIGHT_TRACK_PATTERN = {
  // 8 tracks per pattern
  tracks: string[]
}

export type EIGHT_TRACK_SEQUENCE = {
  // 4 patterns per sequence
  patterns: EIGHT_TRACK_PATTERN[]
}

export type EIGHT_TRACK = {
  id: string
  sequences: EIGHT_TRACK_SEQUENCE[]
}

export type MAYBE_EIGHT_TRACK = MAYBE<EIGHT_TRACK>

function createeighttrackpattern(): EIGHT_TRACK_PATTERN {
  return {
    // 8 tracks per pattern
    tracks: ['', '', '', '', '', '', '', ''],
  }
}

export const BIN_EIGHT_TRACK = bin.object({
  id: bin.string,
  sequences: bin.dynamicArrayOf(
    bin.object({
      patterns: bin.dynamicArrayOf(
        bin.object({
          tracks: bin.dynamicArrayOf(bin.string),
        }),
      ),
    }),
  ),
})

export function createeighttracksequence(): EIGHT_TRACK_SEQUENCE {
  return {
    // 4 patterns per sequence
    patterns: [
      createeighttrackpattern(),
      createeighttrackpattern(),
      createeighttrackpattern(),
      createeighttrackpattern(),
    ],
  }
}

export function createeighttrack(): EIGHT_TRACK {
  return {
    id: createsid(),
    sequences: [],
  }
}

type BIN_EIGHT_TRACK = bin.Parsed<typeof BIN_EIGHT_TRACK>

export function exporteighttrack(
  eighttrack: MAYBE_EIGHT_TRACK,
): MAYBE<BIN_EIGHT_TRACK> {
  if (!ispresent(eighttrack)) {
    return
  }

  return eighttrack
}

export function importeighttrack(
  eighttrack: MAYBE<BIN_EIGHT_TRACK>,
): MAYBE_EIGHT_TRACK {
  if (!ispresent(eighttrack)) {
    return
  }
  return eighttrack
}
