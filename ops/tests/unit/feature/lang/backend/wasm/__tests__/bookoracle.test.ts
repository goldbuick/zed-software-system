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
import { compilenativewasmfortest } from 'ops/tests/lib/lang/nativewasmtestutil'
import { LANG_COOLREGIONSBOW_DIR } from 'ops/lib/fixturepaths'

const FIXTUREDIR = LANG_COOLREGIONSBOW_DIR
const manifest = JSON.parse(
  readFileSync(path.join(FIXTUREDIR, 'manifest.json'), 'utf8'),
) as string[]

function readfixture(id: string) {
  return readFileSync(path.join(FIXTUREDIR, `${id}.zss`), 'utf8')
}

describe('coolregionsbow lang TS oracle fixtures', () => {
  it.each(manifest)('%s compiles with TS oracle', (id) => {
    const source = readfixture(id)
    const tsbuild = compile(id, source)
    expect(tsbuild.errors ?? []).toHaveLength(0)
    expect(tsbuild.source?.length ?? 0).toBeGreaterThan(0)
  })

  it.each(manifest)(
    '%s compiles to native wasm',
    (id) => {
      const source = readfixture(id)
      const wasmbytes = compilenativewasmfortest(source)
      expect(wasmbytes[0]).toBe(0x00)
      expect(wasmbytes[1]).toBe(0x61)
      expect(wasmbytes[2]).toBe(0x73)
      expect(wasmbytes[3]).toBe(0x6d)
    },
    15000,
  )
})
