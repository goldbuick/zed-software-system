import type { SabEngine } from 'zss/feature/synth/backend/shared/sabengine'

import { bumpsabseq, registerseqchannel, resetsabseqregistry } from './sabseq'
import { WASM_SAB_CHANNELS } from './wasmsabchannels'

type ENGINE_SAB = {
  registry: Map<string, Float64Array>
  registered: Set<string>
}

const byengine = new WeakMap<SabEngine, ENGINE_SAB>()
let lastengine: SabEngine | undefined
let writehook: ((channelid: string, view: Float64Array) => void) | undefined

function canusezerosab(): boolean {
  return typeof SharedArrayBuffer !== 'undefined'
}

function getenginesab(maxi: SabEngine): ENGINE_SAB {
  let state = byengine.get(maxi)
  if (!state) {
    state = {
      registry: new Map(),
      registered: new Set(),
    }
    byengine.set(maxi, state)
  }
  lastengine = maxi
  return state
}

function assignview(view: Float64Array, data: number[]) {
  const len = Math.min(data.length, view.length)
  for (let i = 0; i < len; i++) {
    view[i] = data[i]
  }
}

function registerchannel(maxi: SabEngine, channelid: string) {
  if (!maxi.audioWorkletNode?.port) {
    return
  }
  const state = getenginesab(maxi)
  if (state.registered.has(channelid)) {
    return
  }
  const view = state.registry.get(channelid)
  if (!view) {
    return
  }
  maxi.audioWorkletNode.port.postMessage({
    zss_sab_register: 1,
    channelID: channelid,
    sab: view.buffer,
    length: view.length,
  })
  state.registered.add(channelid)
}

function ensurechannel(
  maxi: SabEngine,
  channelid: string,
  length: number,
): Float64Array {
  const state = getenginesab(maxi)
  let view = state.registry.get(channelid)
  if (!view || view.length < length) {
    const sab = new SharedArrayBuffer(length * Float64Array.BYTES_PER_ELEMENT)
    view = new Float64Array(sab, 0, length)
    state.registry.set(channelid, view)
    state.registered.delete(channelid)
  }
  return view
}

/** Pre-register all synth SAB channels with the worklet (call before first push). */
export function initwasmsabchannels(maxi: SabEngine) {
  if (!canusezerosab()) {
    return
  }
  for (let i = 0; i < WASM_SAB_CHANNELS.length; i++) {
    const ch = WASM_SAB_CHANNELS[i]
    ensurechannel(maxi, ch.id, ch.len)
    registerchannel(maxi, ch.id)
  }
  registerseqchannel(maxi)
}

/** Push voice/drum/FX state into the worklet via zero-copy SharedArrayBuffer views. */
export function pushwasmsabvalues(
  maxi: SabEngine,
  channelid: string,
  data: number[],
) {
  if (!maxi.audioWorkletNode?.port) {
    return
  }
  if (!canusezerosab()) {
    maxi.audioWorkletNode.port.postMessage({
      zss_sab_push: 1,
      channelID: channelid,
      data,
    })
    return
  }
  const view = ensurechannel(maxi, channelid, data.length)
  assignview(view, data)
  registerchannel(maxi, channelid)
  bumpsabseq(maxi, channelid)
  writehook?.(channelid, view)
}

/** Read a channel snapshot (tests / debug). Optional engine; defaults to last touched. */
export function wasmsabsnapshot(channelid: string, maxi?: SabEngine): number[] {
  const engine = maxi ?? lastengine
  if (!engine) {
    return []
  }
  const view = getenginesab(engine).registry.get(channelid)
  if (!view) {
    return []
  }
  return Array.from(view)
}

/** Clear main-thread SAB registry bookkeeping (tests). */
export function resetwasmsabregistry() {
  lastengine = undefined
  writehook = undefined
  resetsabseqregistry()
}

/** Observe SAB writes in tests (zero-copy path has no postMessage payload). */
export function setwasmsabwritehook(
  hook: ((channelid: string, view: Float64Array) => void) | undefined,
) {
  writehook = hook
}
