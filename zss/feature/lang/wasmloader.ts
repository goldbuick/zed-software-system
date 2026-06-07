import type { CHIP } from 'zss/chip'

import { createhostimports } from './hostcall'

export type WasmScriptInstance = {
  instance: WebAssembly.Instance
  run: () => 0 | 1
}

/** Instantiate a per-script WASM module with CHIP as the host import bridge. */
export function loadscriptsync(
  bytes: Uint8Array,
  chip: CHIP,
): WasmScriptInstance {
  const memref: { current: WebAssembly.Memory | null } = { current: null }
  const imports = createhostimports(chip, memref)
  const module = new WebAssembly.Module(bytes as BufferSource)
  const instance = new WebAssembly.Instance(module, imports)
  memref.current = instance.exports.memory as WebAssembly.Memory
  const runexport = instance.exports.run as (() => number) | undefined
  if (!runexport) {
    throw new Error('wasm script missing run export')
  }
  const run = () => {
    const result = runexport()
    return result ? 1 : 0
  }
  return { instance, run }
}

export function loadscript(
  bytes: Uint8Array,
  chip: CHIP,
): Promise<WasmScriptInstance> {
  return Promise.resolve(loadscriptsync(bytes, chip))
}
