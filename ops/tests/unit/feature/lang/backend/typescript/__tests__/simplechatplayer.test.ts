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

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { compile } from 'zss/feature/lang/backend/typescript/generator'

const FIXTURE = path.join(
  process.cwd(),
  'ops/fixtures/lang/scripts/simple_chat_player.zss',
)

describe('simple chat player compile', () => {
  it('compiles without errors and emits inputmenu hint toggle paths', () => {
    const source = readFileSync(FIXTURE, 'utf8')
    const build = compile('simple_chat_player', source)
    expect(build.errors ?? []).toEqual([])
    expect(build.code).toBeDefined()
    expect(build.source).toContain("api.if('inputmenu')")
    expect(build.source).toContain("api.opMinus(1, 'hint')")
    expect(build.source).toContain("api.command('think')")
  })
})
