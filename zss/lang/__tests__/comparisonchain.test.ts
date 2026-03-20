jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  STATS_DEV: false,
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

import { compileast } from 'zss/lang/ast'
import { transformast } from 'zss/lang/transformer'

function emit(source: string) {
  const astresult = compileast(source)
  expect(astresult.errors?.length ?? 0).toBe(0)
  expect(astresult.ast).toBeDefined()
  const out = transformast(astresult.ast!)
  expect(out.code).toBeDefined()
  return out.code
}

describe('chained comparison lowering', () => {
  it('emits and of pairwise compares for a < b < c', () => {
    const code = emit('#if 1 < 2 < 3\n')
    expect(code).toContain('api.and(')
    expect(code.split('api.isLessThan').length - 1).toBe(2)
  })

  it('emits single compare for one operator', () => {
    const code = emit('#if 1 < 2\n')
    expect(code.split('api.isLessThan').length - 1).toBe(1)
    expect(code).not.toContain('api.and(')
  })

  it('allows mixed operators in the chain', () => {
    const code = emit('#if 1 < 3 >= 2\n')
    expect(code).toContain('api.and(')
    expect(code).toContain('api.isLessThan')
    expect(code).toContain('api.isGreaterThanOrEq')
  })
})
