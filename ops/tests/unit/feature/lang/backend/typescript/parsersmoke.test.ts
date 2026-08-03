jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
}))

jest.mock('zss/words/textformat', () => ({
  MaybeFlag: { name: 'MaybeFlag' },
  tokenize: () => ({ errors: [{ message: 'mock' }], tokens: [] }),
}))

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { compileast } from 'zss/feature/lang/backend/typescript/ast'
import { compile } from 'zss/feature/lang/backend/typescript/generator'
import { LANG_SCRIPTS_DIR } from 'ops/lib/fixturepaths'

const FIXTURE = path.join(LANG_SCRIPTS_DIR, 'parser_smoke.zss')

describe('parser_smoke.zss', () => {
  const source = readFileSync(FIXTURE, 'utf8')

  it('parses without CST errors', () => {
    const result = compileast(source)
    expect(result.errors ?? []).toEqual([])
    expect(result.ast).toBeDefined()
  })

  it('compiles through the TypeScript generator', () => {
    const build = compile('parser_smoke', source)
    expect(build.errors ?? []).toEqual([])
    expect(build.code).toBeDefined()
  })
})
