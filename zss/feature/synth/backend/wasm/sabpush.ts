import type { SabEngine } from '../shared/sabengine'

import { bumpsabseq, registerseqchannel, resetsabseqregistry } from './sabseq'
import { WASM_SAB_CHANNELS } from './wasmsabchannels'

const registry = new Map<string, Float64Array>()
const registered = new Set<string>()
let writehook: ((channelid: string, view: Float64Array) => void) | undefined

function canusezerosab(): boolean {
  return typeof SharedArrayBuffer !== 'undefined'
}

function assignview(view: Float64Array, data: number[]) {
  const len = Math.min(data.length, view.length)
  for (let i = 0; i < len; i++) {
    view[i] = data[i]
  }
}

function registerchannel(maxi: SabEngine, channelid: string) {
  if (!maxi.audioWorkletNode?.port || registered.has(channelid)) {
    return
  }
  const view = registry.get(channelid)
  if (!view) {
    return
  }
  maxi.audioWorkletNode.port.postMessage({
    zss_sab_register: 1,
    channelID: channelid,
    sab: view.buffer,
    length: view.length,
  })
  registered.add(channelid)
}

function ensurechannel(channelid: string, length: number): Float64Array {
  let view = registry.get(channelid)
  if (!view || view.length < length) {
    const sab = new SharedArrayBuffer(length * Float64Array.BYTES_PER_ELEMENT)
    view = new Float64Array(sab, 0, length)
    registry.set(channelid, view)
    registered.delete(channelid)
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
    ensurechannel(ch.id, ch.len)
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
  const view = ensurechannel(channelid, data.length)
  assignview(view, data)
  registerchannel(maxi, channelid)
  bumpsabseq(channelid)
  writehook?.(channelid, view)
}

/** Read a channel snapshot (tests / debug). */
export function wasmsabsnapshot(channelid: string): number[] {
  const view = registry.get(channelid)
  if (!view) {
    return []
  }
  return Array.from(view)
}

/** Clear main-thread SAB registry (tests). */
export function resetwasmsabregistry() {
  registry.clear()
  registered.clear()
  writehook = undefined
  resetsabseqregistry()
}

/** Observe SAB writes in tests (zero-copy path has no postMessage payload). */
export function setwasmsabwritehook(
  hook: ((channelid: string, view: Float64Array) => void) | undefined,
) {
  writehook = hook
}
