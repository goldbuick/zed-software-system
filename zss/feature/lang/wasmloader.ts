import type { CHIP } from 'zss/chip'

import { createhostimports } from './hostcall'

export type WasmScriptInstance = {
  instance: WebAssembly.Instance
  run: () => 0 | 1
}

export type LoadscriptOptions = {
  /**
   * Abort synchronous wasm run loops after this many sy() polls.
   * Jest timeouts cannot interrupt a blocking run(); use this in tests.
   * Set ZSS_WASM_RUN_BUDGET=0 in a Jest worker to disable the default cap.
   */
  runbudget?: number
}

const DEFAULT_JEST_RUN_BUDGET = 16_384

function jestdefaultrunbudget(): number | undefined {
  if (!process.env.JEST_WORKER_ID) {
    return undefined
  }
  const raw = process.env.ZSS_WASM_RUN_BUDGET
  if (raw === '0' || raw === 'off') {
    return undefined
  }
  if (raw) {
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_JEST_RUN_BUDGET
  }
  return DEFAULT_JEST_RUN_BUDGET
}

function wrapchipwithrunbudget(chip: CHIP, runbudget: number): CHIP {
  let polls = 0
  return new Proxy(chip, {
    get(target, prop, receiver) {
      if (prop === 'sy') {
        return () => {
          polls++
          if (polls > runbudget) {
            throw new Error(
              `wasm script exceeded run budget of ${runbudget} sy() polls without terminating — check getcase/nextcase stubs or command continue loops`,
            )
          }
          return target.sy()
        }
      }
      const value = Reflect.get(target, prop, receiver)
      if (typeof value === 'function') {
        return value.bind(target)
      }
      return value
    },
  })
}

/** Instantiate a per-script WASM module with CHIP as the host import bridge. */
export function loadscriptsync(
  bytes: Uint8Array,
  chip: CHIP,
  options?: LoadscriptOptions,
): WasmScriptInstance {
  const runbudget = options?.runbudget ?? jestdefaultrunbudget()
  const hostchip =
    runbudget !== undefined ? wrapchipwithrunbudget(chip, runbudget) : chip
  const memref: { current: WebAssembly.Memory | null } = { current: null }
  const imports = createhostimports(hostchip, memref)
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
  options?: LoadscriptOptions,
): Promise<WasmScriptInstance> {
  return Promise.resolve(loadscriptsync(bytes, chip, options))
}
