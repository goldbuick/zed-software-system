import type { CHIP } from 'zss/chip'
import { RUNTIME } from 'zss/config'
import {
  type LoadscriptOptions,
  loadscriptsync,
} from 'zss/feature/lang/wasmloader'
import type { WORD } from 'zss/words/types'

/** Default sy() polls before aborting a stuck wasm run() in Jest workers. */
export const DEFAULT_WASM_RUN_BUDGET = 16_384

export type Wasmstubstate = {
  ec: number
  ys: number
  lc: number
}

/** Minimal CHIP host stubs for direct loadscriptsync tests (advances getcase, mirrors sy yield). */
export function createwasmstubchip(overrides: Partial<CHIP> = {}): CHIP {
  const state: Wasmstubstate = { ec: 1, ys: 0, lc: 0 }
  const base = {
    sy: () => {
      if (state.ys) {
        return true
      }
      return ++state.lc > RUNTIME.YIELD_AT_COUNT
    },
    getcase: () => state.ec,
    nextcase: () => {
      state.ec++
    },
    jump: (line: number) => {
      state.ec = line
    },
    yield: () => {
      state.ys = 1
    },
    text: () => 0,
    stat: () => 0,
    hyperlink: () => 0,
    template: (words: WORD[]) => words.join(' '),
    get: () => undefined,
    set: () => undefined,
    and: () => 0,
    or: () => 0,
    not: () => 0,
    expr: () => 0,
    isEq: () => 0,
    isNotEq: () => 0,
    isLessThan: () => 0,
    isGreaterThan: () => 0,
    isLessThanOrEq: () => 0,
    isGreaterThanOrEq: () => 0,
    opPlus: () => 0,
    opMinus: () => 0,
    opPower: () => 0,
    opMultiply: () => 0,
    opDivide: () => 0,
    opModDivide: () => 0,
    opFloorDivide: () => 0,
    opUniPlus: () => 0,
    opUniMinus: () => 0,
    print: () => '',
    try: () => 0,
    take: () => 0,
    give: () => 0,
    duplicate: () => 0,
    repeatstart: () => undefined,
    repeat: () => 0,
    foreachstart: () => 0,
    foreach: () => 0,
    waitfor: () => 0,
    command: () => 0,
    if: () => 0,
  }
  return { ...base, ...overrides } as unknown as CHIP
}

/** Run a per-script wasm module with an optional loop poll budget (see loadscriptsync). */
export function runwasmscriptfortest(
  bytes: Uint8Array,
  chip: CHIP,
  options?: LoadscriptOptions,
): 0 | 1 {
  return loadscriptsync(bytes, chip, options).run()
}
