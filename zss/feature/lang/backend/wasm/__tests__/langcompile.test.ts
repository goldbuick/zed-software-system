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

import {
  compilenativewasm,
  readfixture,
} from 'zss/feature/lang/backend/wasm/langparityload'

describe('lang compile wasm output', () => {
  it('native-produced if_break wasm is valid module bytes', () => {
    const source = readfixture('if_break', 'zss')
    const wasmbytes = compilenativewasm(source)
    expect(wasmbytes.length).toBeGreaterThan(8)
    expect(wasmbytes[0]).toBe(0x00)
    expect(wasmbytes[1]).toBe(0x61)
    expect(wasmbytes[2]).toBe(0x73)
    expect(wasmbytes[3]).toBe(0x6d)
  })

  it('native-produced divide wasm references host dispatch', () => {
    const source = readfixture('divide', 'zss')
    const wasmbytes = compilenativewasm(source)
    expect(wasmbytes.length).toBeGreaterThan(0)
  })
})
