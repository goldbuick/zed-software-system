import { synthplay } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  type SYNTH_NOTE_ENTRY,
  invokeplay,
  parseplay,
} from 'zss/feature/synth/playnotation'
import { canonicalvoicefxgroupindex } from 'zss/feature/synth/voicefxgroup'
import { SYNTH_STATE } from 'zss/gadget/data/types'
import { TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, deepcopy, isnumber, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { memoryreadbookflag, memorywritebookflag } from './bookoperations'
import { memoryreadbookbysoftware } from './session'
import { MEMORY_LABEL } from './types'

const SYNTH_VOICES_KEY = 'voices'
const SYNTH_VOICEFX_KEY = 'voicefx'

const SYNTH_STATE_DEFAULT: SYNTH_STATE = {
  voices: {},
  voicefx: {},
}

/**
 * Synth flag owner id for a board, parallel to createchipid (`${id}_chip`).
 */
export function createsynthid(id: string) {
  return `${id}_synth`
}

function mergevoicefxlayer(
  a: MAYBE<Record<string, Record<string, MAYBE<number | string>>>>,
  b: MAYBE<Record<string, Record<string, MAYBE<number | string>>>>,
): Record<string, Record<string, MAYBE<number | string>>> {
  const out = deepcopy(a ?? {})
  if (!ispresent(b)) {
    return out
  }
  const bkeys = Object.keys(b)
  for (let i = 0; i < bkeys.length; ++i) {
    const fk = bkeys[i]
    out[fk] = { ...(out[fk] ?? {}), ...b[fk] }
  }
  return out
}

function memorymigratelegacyvoicefx(cache: SYNTH_STATE) {
  const vf = cache.voicefx
  if (!ispresent(vf) || typeof vf !== 'object') {
    return
  }
  if (!ispresent(vf['2']) && !ispresent(vf['3'])) {
    return
  }
  const merged0 = mergevoicefxlayer(vf['0'], vf['1'])
  const merged1 = mergevoicefxlayer(vf['2'], vf['3'])
  const next: SYNTH_STATE['voicefx'] = {}
  if (Object.keys(merged0).length) {
    next['0'] = merged0
  }
  if (Object.keys(merged1).length) {
    next['1'] = merged1
  }
  cache.voicefx = next
}

function readsynthcacheinternal(board: string): SYNTH_STATE {
  const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const owner = createsynthid(board)
  let voices = memoryreadbookflag(main, owner, SYNTH_VOICES_KEY) as MAYBE<
    SYNTH_STATE['voices']
  >
  let voicefx = memoryreadbookflag(main, owner, SYNTH_VOICEFX_KEY) as MAYBE<
    SYNTH_STATE['voicefx']
  >
  if (!ispresent(voices)) {
    voices = deepcopy(SYNTH_STATE_DEFAULT.voices)
    memorywritebookflag(main, owner, SYNTH_VOICES_KEY, voices as any)
  }
  if (!ispresent(voicefx)) {
    voicefx = deepcopy(SYNTH_STATE_DEFAULT.voicefx)
    memorywritebookflag(main, owner, SYNTH_VOICEFX_KEY, voicefx as any)
  }
  const cache: SYNTH_STATE = { voices, voicefx }
  memorymigratelegacyvoicefx(cache)
  return cache
}

function clearvoicesandvoicefx(cache: SYNTH_STATE) {
  const vk = Object.keys(cache.voices)
  for (let i = 0; i < vk.length; ++i) {
    delete cache.voices[vk[i]]
  }
  const fxk = Object.keys(cache.voicefx)
  for (let i = 0; i < fxk.length; ++i) {
    delete cache.voicefx[fxk[i]]
  }
}

export function memoryreadsynth(board: string): MAYBE<SYNTH_STATE> {
  return readsynthcacheinternal(board)
}

export function memorymergesynthvoice(
  board: string,
  idx: number,
  config: string,
  value: MAYBE<number | string>,
) {
  const cache = readsynthcacheinternal(board)
  if (NAME(config) === 'restart') {
    clearvoicesandvoicefx(cache)
    return
  }
  if (!ispresent(cache.voices[idx])) {
    cache.voices[idx] = {}
  }
  cache.voices[idx][config] = value
}

export function memorymergesynthvoicefx(
  board: string,
  idx: number,
  fx: string,
  config: number | string,
  value: MAYBE<number | string>,
) {
  const cache = readsynthcacheinternal(board)
  const groupidx = String(canonicalvoicefxgroupindex(idx))
  if (!ispresent(cache.voicefx[groupidx])) {
    cache.voicefx[groupidx] = {}
  }
  if (!ispresent(cache.voicefx[groupidx][fx])) {
    cache.voicefx[groupidx][fx] = {}
  }
  switch (config) {
    case 'on':
      cache.voicefx[groupidx][fx].on = 'on'
      break
    case 'off':
      cache.voicefx[groupidx][fx].on = 'off'
      break
    default:
      if (isnumber(config)) {
        cache.voicefx[groupidx][fx].on = value
      } else if (config) {
        cache.voicefx[groupidx][fx][config] = value
      }
      break
  }
}

export type SYNTH_PLAY = [string, number]

const SYNTH_PLAYQUEUE_KEY = 'playqueue'
const SYNTH_PLAY_DEFAULT: SYNTH_PLAY[] = []

function readsynthplayinternal(board: string): SYNTH_PLAY[] {
  const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const owner = createsynthid(board)
  const queue = memoryreadbookflag(main, owner, SYNTH_PLAYQUEUE_KEY) as MAYBE<
    SYNTH_PLAY[]
  >
  if (ispresent(queue)) {
    return queue
  }
  const nextqueue = deepcopy(SYNTH_PLAY_DEFAULT)
  memorywritebookflag(main, owner, SYNTH_PLAYQUEUE_KEY, nextqueue as any)
  return nextqueue
}

export function memoryreadsynthplay(board: string): SYNTH_PLAY[] {
  return readsynthplayinternal(board)
}

/** Added after converting pattern end time (seconds) to board ticks; tune if `#play` advances too early/late. */
const SYNTH_PLAY_QUEUE_TICK_PAD = -2

function synthplaypatterntickwait(pattern: SYNTH_NOTE_ENTRY[]): number {
  const last = pattern[pattern.length - 1]
  if (!ispresent(last)) {
    return 1
  }
  return Math.max(1, Math.ceil(last[0] * TICK_FPS) + SYNTH_PLAY_QUEUE_TICK_PAD)
}

export function memoryqueuesynthplay(board: string, play: string) {
  const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(main)) {
    return
  }

  if (board === '') {
    synthplay(SOFTWARE, '', board, play)
    return
  }

  if (play === '') {
    const queue = readsynthplayinternal(board)
    queue.length = 0
    synthplay(SOFTWARE, '', board, '')
    return
  }

  const invokes = parseplay(play)
  let endtime = 0
  for (let i = 0; i < invokes.length; ++i) {
    const invoke = invokes[i]
    const pattern = invokeplay(i, 0, invoke, true)
    endtime = Math.max(endtime, synthplaypatterntickwait(pattern))
  }

  const queue = readsynthplayinternal(board)
  queue.push([play, endtime])
}
