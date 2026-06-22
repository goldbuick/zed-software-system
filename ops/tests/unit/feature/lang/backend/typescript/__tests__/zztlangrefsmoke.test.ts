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

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { compile } from 'zss/feature/lang/backend/typescript/generator'
import { transformast } from 'zss/feature/lang/backend/typescript/transformer'
import { compileast } from 'zss/feature/lang/backend/typescript/ast'

const FIXTURES = path.join(process.cwd(), 'ops/fixtures/lang/zzt/raw_zzt')

describe('zzt langref behavioral smoke', () => {
  it('#die compiles and generates die command emission', () => {
    const source = readFileSync(path.join(FIXTURES, 'langref_die.zss'), 'utf8')
    const ast = compileast(source)
    expect(ast.errors ?? []).toEqual([])
    const emitted = transformast(ast.ast!)
    expect(emitted.code).toContain("api.command('die'")

    const build = compile('langref_die', source)
    expect(build.errors ?? []).toEqual([])
    expect(build.code).toBeDefined()
  })

  it('#if then inline send compiles', () => {
    const source = readFileSync(
      path.join(FIXTURES, 'langref_if_then.zss'),
      'utf8',
    )
    const build = compile('langref_if_then', source)
    expect(build.errors ?? []).toEqual([])
    expect(build.code).toBeDefined()
  })

  it(':do label does not collide with #do extension', () => {
    const source = readFileSync(
      path.join(FIXTURES, 'label_do_collision.zss'),
      'utf8',
    )
    const build = compile('label_do_collision', source)
    expect(build.errors ?? []).toEqual([])
  })
})
