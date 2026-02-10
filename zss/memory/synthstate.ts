import { SYNTH_STATE } from 'zss/gadget/data/types'
import { MAYBE, deepcopy, isnumber, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { memoryreadbookflag, memorywritebookflag } from './bookoperations'
import { MEMORY_LABEL } from './types'

import { memoryreadbookbysoftware } from '.'

const SYNTH_STATE_FLAG = 'synthstate'
const SYNTH_STATE_DEFAULT: SYNTH_STATE = {
  voices: {},
  voicefx: {},
}

function readsynthcacheinternal(board: string): SYNTH_STATE {
  const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const cache = memoryreadbookflag(
    main,
    SYNTH_STATE_FLAG,
    board,
  ) as MAYBE<SYNTH_STATE>
  // use the cached synth state
  if (ispresent(cache)) {
    return cache
  }
  // create a new synth state
  const synthstate = deepcopy(SYNTH_STATE_DEFAULT)
  memorywritebookflag(main, SYNTH_STATE_FLAG, board, synthstate as any)
  return synthstate
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
    cache.voices = {}
    cache.voicefx = {}
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
