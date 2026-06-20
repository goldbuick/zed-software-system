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

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { compileparse } from 'zss/feature/lang/backend/typescript/compileparse'

const FIXTURES = path.join(process.cwd(), 'ops/fixtures/lang/zzt')
const MANIFEST = JSON.parse(
  readFileSync(path.join(FIXTURES, 'manifest.json'), 'utf8'),
)

describe('zzt corpus parse fixtures', () => {
  for (const id of MANIFEST.raw_zzt) {
    it(`raw_zzt/${id}.zss compileparse clean`, () => {
      const source = readFileSync(
        path.join(FIXTURES, 'raw_zzt', `${id}.zss`),
        'utf8',
      )
      const result = compileparse(source)
      expect(result.errors ?? []).toEqual([])
      expect(result.cst).toBeDefined()
    })
  }
})

describe('zzt line classification', () => {
  it('parses mid-scroll @ line as text', () => {
    const result = compileparse(':touch\n@Stars\nhello\n')
    expect(result.errors ?? []).toEqual([])
  })

  it('parses prose with embedded # as text', () => {
    const result = compileparse('change to #char 32 and\n')
    expect(result.errors ?? []).toEqual([])
  })

  it('parses indented # prose as text', () => {
    const result = compileparse(' #char back into stars\n')
    expect(result.errors ?? []).toEqual([])
  })

  it('parses line-1 @objectname as stat', () => {
    const result = compileparse('@Creature\n#end\n')
    expect(result.errors ?? []).toEqual([])
  })
})
