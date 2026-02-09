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
import { SYNTH_STATE } from 'zss/gadget/data/types'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

import {
  memoryclearbookflags,
  memoryreadbookflag,
  memorywritebookflag,
} from './bookoperations'
import { MEMORY_LABEL } from './types'

import { memoryreadbookbysoftware } from '.'

const SYNTHSTATE_FLAG = 'synthstate'

export function memoryreadsynthstate(board: string): MAYBE<SYNTH_STATE> {
  const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  return memoryreadbookflag(main, board, SYNTHSTATE_FLAG) as MAYBE<SYNTH_STATE>
}

export function memorywritesynthstate(board: string, state: SYNTH_STATE) {
  const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  memorywritebookflag(main, board, SYNTHSTATE_FLAG, state as any)
  return state
}

export function memoryclearsynthstate(board: string) {
  const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  memoryclearbookflags(main, board)
}

export function memoryhassynthstate(board: string): boolean {
  const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const state = memoryreadbookflag(main, board, SYNTHSTATE_FLAG)
  return ispresent(state)
}

/**
 * Merged config cache for per-board synth state.
 * Built incrementally from synthvoice/synthvoicefx calls.
 * Replay by iterating and calling synthvoice/synthvoicefx for each entry.
 */
const SYNTHCACHE_FLAG = 'synthcache'

export type SYNTH_CACHE = {
  voices: Record<string, Record<string, unknown>>
  voicefx: Record<string, Record<string, Record<string, unknown>>>
  bpm?: number
  playvolume?: number
  bgplayvolume?: number
  ttsvolume?: number
}

function readsynthcacheinternal(board: string): SYNTH_CACHE {
  const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const cache = memoryreadbookflag(
    main,
    board,
    SYNTHCACHE_FLAG,
  ) as MAYBE<SYNTH_CACHE>
  if (ispresent(cache)) {
    return {
      voices: Object(cache.voices) === cache.voices ? cache.voices : {},
      voicefx: Object(cache.voicefx) === cache.voicefx ? cache.voicefx : {},
      bpm: cache.bpm,
      playvolume: cache.playvolume,
      bgplayvolume: cache.bgplayvolume,
      ttsvolume: cache.ttsvolume,
    }
  }
  return {
    voices: {},
    voicefx: {},
    bpm: 0,
    playvolume: 0,
    bgplayvolume: 0,
    ttsvolume: 0,
  }
}

export function memorymergesynthvoice(
  board: string,
  idx: number,
  config: string | number,
  value: unknown,
) {
  const cache = readsynthcacheinternal(board)
  const key = String(idx)
  if (!cache.voices[key]) cache.voices[key] = {}
  cache.voices[key][String(config)] = value
}

export function memorymergesynthvoicefx(
  board: string,
  idx: number,
  fx: string,
  config: string | number,
  value: number | string,
) {
  if (!ispresent(board)) {
    return
  }
  const cache = readsynthcacheinternal(board)
  if (!ispresent(cache.voicefx[idx])) {
    cache.voicefx[idx] = {}
  }
  if (!ispresent(cache.voicefx[idx][fx])) {
    cache.voicefx[idx][fx] = {}
  }
  switch (config) {
    case 'on':
      cache.voicefx[idx][fx].on = 'on'
      break
    case 'off':
      cache.voicefx[idx][fx].on = 'off'
      break
    default:
      if (isnumber(config)) {
        cache.voicefx[idx][fx].on = value
      } else {
        cache.voicefx[idx][fx][config] = value
      }
      break
  }
}

export function memorymergesynthglobal(
  board: string,
  key: 'bpm' | 'playvolume' | 'bgplayvolume' | 'ttsvolume',
  value: number,
) {
  if (!ispresent(board)) {
    return
  }
  const cache = readsynthcacheinternal(board)
  cache[key] = value
}

export function memoryreadsynthcache(board: string) {
  return readsynthcacheinternal(board)
}

export function memoryclearsynthcache(board: string) {
  const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const flags = main?.flags[board]
  if (flags) {
    delete flags[SYNTHCACHE_FLAG]
  }
}
