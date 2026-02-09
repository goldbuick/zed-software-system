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
import { MAYBE, ispresent } from 'zss/mapping/types'

import { memoryreadbookflag, memorywritebookflag } from './bookoperations'
import { MEMORY_LABEL } from './types'

import { memoryreadbookbysoftware } from '.'

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
  const flags = main?.flags[board]
  if (flags) {
    delete flags[SYNTHSTATE_FLAG]
  }
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
  const parsed = memoryreadbookflag(main, board, SYNTHCACHE_FLAG) as any
  if (typeof parsed === 'object') {
    return {
      voices: Object(parsed.voices) === parsed.voices ? parsed.voices : {},
      voicefx: Object(parsed.voicefx) === parsed.voicefx ? parsed.voicefx : {},
      bpm: parsed.bpm,
      playvolume: parsed.playvolume,
      bgplayvolume: parsed.bgplayvolume,
      ttsvolume: parsed.ttsvolume,
    }
  }
  return { voices: {}, voicefx: {} }
}

function memorywritesynthcache(board: string, cache: Partial<SYNTH_CACHE>) {
  const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  memorywritebookflag(main, board, SYNTHCACHE_FLAG, cache as any)
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
  memorywritesynthcache(board, cache)
}

export function memorymergesynthvoicefx(
  board: string,
  idx: number,
  fx: string,
  config: unknown,
  value: unknown,
) {
  if (!ispresent(board)) {
    return
  }
  const cache = readsynthcacheinternal(board)
  const key = String(idx)
  if (!cache.voicefx[key]) cache.voicefx[key] = {}
  if (!cache.voicefx[key][fx]) cache.voicefx[key][fx] = {}
  cache.voicefx[key][fx][String(config)] = value
  memorywritesynthcache(board, cache)
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
  memorywritesynthcache(board, cache)
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
