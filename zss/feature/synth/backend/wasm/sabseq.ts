import type { MaxiEngine } from './maximilian'
import {
  WASM_SAB_SEQ,
  WASM_SAB_SEQ_LEN,
  WASM_SAB_SEQ_CHANNEL_TO_IDX,
} from './wasmsabchannels'

let seqview: Int32Array | undefined
let seqregistered = false

function canusezerosab(): boolean {
  return typeof SharedArrayBuffer !== 'undefined'
}

/** Ensure the Int32 sequence counter SAB exists on the main thread. */
export function ensureseqchannel(): Int32Array | undefined {
  if (!canusezerosab()) {
    return undefined
  }
  if (!seqview) {
    const sab = new SharedArrayBuffer(
      WASM_SAB_SEQ_LEN * Int32Array.BYTES_PER_ELEMENT,
    )
    seqview = new Int32Array(sab, 0, WASM_SAB_SEQ_LEN)
  }
  return seqview
}

/** Register the seq SAB with the worklet (Int32, not Float64). */
export function registerseqchannel(maxi: MaxiEngine) {
  if (!maxi.audioWorkletNode?.port || seqregistered || !canusezerosab()) {
    return
  }
  const view = ensureseqchannel()
  if (!view) {
    return
  }
  maxi.audioWorkletNode.port.postMessage({
    zss_sab_register: 1,
    channelID: WASM_SAB_SEQ,
    sab: view.buffer,
    length: view.length,
    sabkind: 'int32',
  })
  seqregistered = true
}

/** Bump the dirty counter for a pushed data channel. */
export function bumpsabseq(channelid: string) {
  const idx = WASM_SAB_SEQ_CHANNEL_TO_IDX[channelid]
  if (idx === undefined) {
    return
  }
  const view = ensureseqchannel()
  if (!view) {
    return
  }
  Atomics.add(view, idx, 1)
}

/** Zero all seq counters (boot/resync before full state push). */
export function resetsabseq() {
  const view = ensureseqchannel()
  if (!view) {
    return
  }
  for (let i = 0; i < WASM_SAB_SEQ_LEN; i++) {
    Atomics.store(view, i, 0)
  }
}

/** Read seq counters (tests / debug). */
export function sabseqsnapshot(): number[] {
  const view = ensureseqchannel()
  if (!view) {
    return []
  }
  const out: number[] = []
  for (let i = 0; i < WASM_SAB_SEQ_LEN; i++) {
    out.push(Atomics.load(view, i))
  }
  return out
}

/** Clear seq registry state (tests). */
export function resetsabseqregistry() {
  seqview = undefined
  seqregistered = false
}
