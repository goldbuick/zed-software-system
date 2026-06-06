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
}))

jest.mock('zss/words/textformat', () => ({
  MaybeFlag: { name: 'MaybeFlag' },
  tokenize: () => ({ errors: [{ message: 'mock' }], tokens: [] }),
}))

import { readfixture } from '../langparityload'

describe('lang compile behavioral parity', () => {
  it('native-produced if_break JS is executable generator source', () => {
    const source = readfixture('if_break', 'js')
    expect(source).toContain('api.if')
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      new Function('api', source)
    }).not.toThrow()
  })

  it('native-produced divide JS references api.opDivide', () => {
    const source = readfixture('divide', 'js')
    expect(source).toContain('api.opDivide')
  })
})
