jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
  WASM_SCRIPT: false,
}))

jest.mock('zss/words/textformat', () => ({
  MaybeFlag: { name: 'MaybeFlag' },
  tokenize: () => ({ errors: [{ message: 'mock' }], tokens: [] }),
}))

import { compile } from 'zss/feature/lang'
import { createchip } from 'zss/chip'
import { DRIVER_TYPE } from 'zss/firmware/runner'

import {
  compilenativewasm,
  readfixture,
  runnativeparitygate,
} from 'zss/feature/lang/backend/wasm/langparityload'

describe('lang native wasm parity gate', () => {
  it('native compiler emits wasm magic for all fixtures', () => {
    const output = runnativeparitygate()
    expect(output).toContain('fail=0')
  })
})

describe('lang wasm behavioral parity', () => {
  const FIXTURES = [
    'if_break',
    'label_goto',
    'divide',
    'command',
    'empty',
  ] as const

  it.each(FIXTURES)('%s wasm run matches JS oracle', (id) => {
    const source = readfixture(id, 'zss')
    const jsbuild = compile(id, source)
    const wasmbytes = compilenativewasm(source)

    expect(wasmbytes[0]).toBe(0x00)
    expect(wasmbytes[1]).toBe(0x61)
    expect(wasmbytes[2]).toBe(0x73)
    expect(wasmbytes[3]).toBe(0x6d)

    const jschip = createchip(`js-${id}`, DRIVER_TYPE.RUNTIME, jsbuild)
    const wasmbuild = {
      ...jsbuild,
      wasmbytes,
      code: undefined,
    }
    const wasmchip = createchip(`wasm-${id}`, DRIVER_TYPE.RUNTIME, wasmbuild)

    jschip.once()
    wasmchip.once()

    expect(wasmchip.isended()).toBe(jschip.isended())
  })
})
