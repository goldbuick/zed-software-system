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
import { BOOK, MEMORY_LABEL } from './types'

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
  return memoryreadbookflag(book, board, SYNTHSTATE_FLAG)
}

export function memorywritesynthstate(board: string, state: SYNTH_STATE) {
  const json = JSON.stringify(state)
  memorywritebookflag(book, board, SYNTHSTATE_FLAG, json)
  return state
}

export function memoryclearsynthstate(book: MAYBE<BOOK>, board: string) {
  const flags = book?.flags[board]
  if (flags) {
    delete flags[SYNTHSTATE_FLAG]
  }
}

export function memoryhassynthstate(board: string): boolean {
  const raw = memoryreadbookflag(book, board, SYNTHSTATE_FLAG)
  return ispresent(raw) && isstring(raw)
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
  const parsed = memoryreadbookflag(book, board, SYNTHCACHE_FLAG) as any
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

function memorywritesynthcache(
  book: MAYBE<BOOK>,
  board: string,
  cache: Partial<SYNTH_CACHE>,
) {
  memorywritebookflag(book, board, SYNTHCACHE_FLAG, cache as any)
}

export function memorymergesynthvoice(
  board: string,
  idx: number,
  config: string | number,
  value: unknown,
) {
  if (!book || !board) return
  const cache = readsynthcacheinternal(book, board)
  const key = String(idx)
  if (!cache.voices[key]) cache.voices[key] = {}
  cache.voices[key][String(config)] = value
  memorywritesynthcache(book, board, cache)
}

export function memorymergesynthvoicefx(
  board: string,
  idx: number,
  fx: string,
  config: unknown,
  value: unknown,
) {
  if (!book || !board) return
  const cache = readsynthcacheinternal(book, board)
  const key = String(idx)
  if (!cache.voicefx[key]) cache.voicefx[key] = {}
  if (!cache.voicefx[key][fx]) cache.voicefx[key][fx] = {}
  cache.voicefx[key][fx][String(config)] = value
  memorywritesynthcache(book, board, cache)
}

export function memorymergesynthglobal(
  board: string,
  key: 'bpm' | 'playvolume' | 'bgplayvolume' | 'ttsvolume',
  value: number,
) {
  const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(main) || !ispresent(board)) {
    return
  }
  const cache = readsynthcacheinternal(book, board)
  cache[key] = value
  memorywritesynthcache(book, board, cache)
}

export function memoryreadsynthcache(board: string) {
  return readsynthcacheinternal(book, board)
}

export function memoryclearsynthcache(board: string) {
  const flags = book?.flags[board]
  if (flags) {
    delete flags[SYNTHCACHE_FLAG]
  }
}
