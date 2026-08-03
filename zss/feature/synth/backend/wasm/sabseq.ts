import type { SabEngine } from 'zss/feature/synth/backend/shared/sabengine'

import {
  WASM_SAB_SEQ,
  WASM_SAB_SEQ_CHANNEL_TO_IDX,
  WASM_SAB_SEQ_LEN,
} from './wasmsabchannels'

type ENGINE_SEQ = {
  view: Int32Array
  registered: boolean
}

const byengine = new WeakMap<SabEngine, ENGINE_SEQ>()
let lastengine: SabEngine | undefined

function canusezerosab(): boolean {
  return typeof SharedArrayBuffer !== 'undefined'
}

function getengineseq(maxi: SabEngine): ENGINE_SEQ | undefined {
  if (!canusezerosab()) {
    return undefined
  }
  let state = byengine.get(maxi)
  if (!state) {
    const sab = new SharedArrayBuffer(
      WASM_SAB_SEQ_LEN * Int32Array.BYTES_PER_ELEMENT,
    )
    state = {
      view: new Int32Array(sab, 0, WASM_SAB_SEQ_LEN),
      registered: false,
    }
    byengine.set(maxi, state)
  }
  lastengine = maxi
  return state
}

/** Ensure the Int32 sequence counter SAB exists for this engine. */
export function ensureseqchannel(maxi: SabEngine): Int32Array | undefined {
  return getengineseq(maxi)?.view
}

/** Register the seq SAB with the worklet (Int32, not Float64). */
export function registerseqchannel(maxi: SabEngine) {
  if (!maxi.audioWorkletNode?.port || !canusezerosab()) {
    return
  }
  const state = getengineseq(maxi)
  if (!state || state.registered) {
    return
  }
  maxi.audioWorkletNode.port.postMessage({
    zss_sab_register: 1,
    channelID: WASM_SAB_SEQ,
    sab: state.view.buffer,
    length: state.view.length,
    sabkind: 'int32',
  })
  state.registered = true
}

/** Bump the dirty counter for a pushed data channel. */
export function bumpsabseq(maxi: SabEngine, channelid: string) {
  const idx = WASM_SAB_SEQ_CHANNEL_TO_IDX[channelid]
  if (idx === undefined) {
    return
  }
  const view = ensureseqchannel(maxi)
  if (!view) {
    return
  }
  Atomics.add(view, idx, 1)
}

/** Zero all seq counters (boot/resync before full state push). */
export function resetsabseq(maxi: SabEngine) {
  const view = ensureseqchannel(maxi)
  if (!view) {
    return
  }
  for (let i = 0; i < WASM_SAB_SEQ_LEN; i++) {
    Atomics.store(view, i, 0)
  }
}

/** Read seq counters (tests / debug). Optional engine; defaults to last touched. */
export function sabseqsnapshot(maxi?: SabEngine): number[] {
  const engine = maxi ?? lastengine
  if (!engine) {
    return []
  }
  const view = ensureseqchannel(engine)
  if (!view) {
    return []
  }
  const out: number[] = []
  for (let i = 0; i < WASM_SAB_SEQ_LEN; i++) {
    out.push(Atomics.load(view, i))
  }
  return out
}

/** Clear seq registry bookkeeping (tests). WeakMap entries drop with engines. */
export function resetsabseqregistry() {
  lastengine = undefined
}
