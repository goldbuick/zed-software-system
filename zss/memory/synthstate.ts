/**
 * Memory methods for caching synth state in book flags.
 * Synth state is stored per id (typically board id) as JSON.
 *
 * State format matches the synth's applyreplay interface plus global settings:
 * - source: array of 8 voice configs { type, synth, algo }
 * - fxchain: FX chain config
 * - fx: array of 4 FX channel configs
 * - bpm: number
 * - playvolume: number
 * - bgplayvolume: number
 * - ttsvolume: number
 */
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'

import { memoryreadbookflag, memorywritebookflag } from './bookoperations'
import { BOOK } from './types'

const SYNTHSTATE_FLAG = 'synthstate'

export type SYNTH_STATE = {
  source: unknown[]
  fxchain: unknown
  fx: unknown[]
  bpm?: number
  playvolume?: number
  bgplayvolume?: number
  ttsvolume?: number
}

export function memoryreadsynthstate(
  book: MAYBE<BOOK>,
  id: string,
): MAYBE<SYNTH_STATE> {
  const raw = memoryreadbookflag(book, id, SYNTHSTATE_FLAG)
  if (!ispresent(raw) || !isstring(raw)) {
    return undefined
  }
  try {
    const parsed = JSON.parse(raw) as SYNTH_STATE
    if (
      !Array.isArray(parsed.source) ||
      !Array.isArray(parsed.fx) ||
      parsed.fxchain === undefined
    ) {
      return undefined
    }
    return parsed
  } catch {
    return undefined
  }
}

export function memorywritesynthstate(
  book: MAYBE<BOOK>,
  id: string,
  state: SYNTH_STATE,
) {
  const json = JSON.stringify(state)
  memorywritebookflag(book, id, SYNTHSTATE_FLAG, json)
  return state
}

export function memoryclearsynthstate(book: MAYBE<BOOK>, id: string) {
  const flags = book?.flags[id]
  if (flags) {
    delete flags[SYNTHSTATE_FLAG]
  }
}

export function memoryhassynthstate(book: MAYBE<BOOK>, id: string): boolean {
  const raw = memoryreadbookflag(book, id, SYNTHSTATE_FLAG)
  return ispresent(raw) && isstring(raw)
}
