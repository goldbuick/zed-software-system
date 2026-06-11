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

import { compilenativewasmfortest } from 'zss/feature/lang/backend/wasm/testhelpers/nativewasmtestutil'
import { createwasmstubchip } from 'zss/feature/lang/backend/wasm/testhelpers/wasmruntestutil'
import { loadscriptsync } from 'zss/feature/lang/wasmloader'

describe('wasm script run budget', () => {
  it('throws instead of hanging when getcase never advances', () => {
    const wasmbytes = compilenativewasmfortest('#set x 1\n')
    const chip = createwasmstubchip({
      sy: () => false,
      getcase: () => 1,
      nextcase: () => undefined,
    })
    expect(() => loadscriptsync(wasmbytes, chip, { runbudget: 64 }).run()).toThrow(
      /run budget/,
    )
  })

  it('terminates normally under the default jest worker budget', () => {
    const wasmbytes = compilenativewasmfortest('#clear key0\n#die\n')
    const chip = createwasmstubchip()
    expect(() => loadscriptsync(wasmbytes, chip).run()).not.toThrow()
  })
})
