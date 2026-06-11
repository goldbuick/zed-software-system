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

import { compile } from 'zss/feature/lang'
import { readcorpus } from 'zss/feature/lang/backend/wasm/corpus'
import { compilecppfromdisk } from 'zss/feature/lang/backend/wasm/langparityload'

describe('drawdisplay label parity', () => {
  it('TS and C++ agree on drawpass labels for :drawdisplay', () => {
    const source = readcorpus('parity', 'drawdisplay')
    const js = compile('drawpass', source)
    const cpp = compilecppfromdisk('drawpass', source)

    expect(cpp.errors).toHaveLength(0)
    expect(js.errors ?? []).toHaveLength(0)
    expect(JSON.parse(cpp.labelsjson)).toEqual(js.labels)
    expect((js.labels?.drawdisplay?.[0] ?? 0) > 0).toBe(true)
  })
})
