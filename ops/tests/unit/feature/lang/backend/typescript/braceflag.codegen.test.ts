jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  DEBUG_SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
}))

import { compileast } from 'zss/feature/lang/backend/typescript/ast'
import { transformast } from 'zss/feature/lang/backend/typescript/transformer'

function emit(source: string) {
  const r = compileast(source)
  expect(r.errors ?? []).toEqual([])
  expect(r.ast).toBeDefined()
  return transformast(r.ast!).code as string
}

describe('brace flag template codegen', () => {
  it('emits print(get(color)) join with literal key, no opplus', () => {
    const code = emit('#set "${color}key"\n')
    expect(code).toContain("api.print(api.get('color'), 'color')")
    expect(code).toContain("'key'")
    expect(code).not.toContain('opplus')
    expect(code).toContain("api.command('set'")
  })

  it('still emits key$color as prefix join', () => {
    const code = emit('#set "key$color"\n')
    expect(code).toContain("api.print(api.get('color'), 'color')")
    expect(code).not.toContain('opplus')
    expect(code).toContain("'key'")
  })
})
