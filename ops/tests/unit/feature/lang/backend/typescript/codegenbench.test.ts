jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    YIELD_STRIKE_LIMIT: 3,
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

jest.mock('zss/words/textformat', () => ({
  MaybeFlag: { name: 'MaybeFlag' },
  tokenize: () => ({ errors: [{ message: 'mock' }], tokens: [] }),
}))

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

import type { CHIP } from 'zss/chip'
import { compileast } from 'zss/feature/lang/backend/typescript/ast'
import { compile } from 'zss/feature/lang/backend/typescript/generator'
import { readexpr } from 'zss/words/expr'
import { READ_CONTEXT } from 'zss/words/reader'

const FIXTURE = path.join(
  process.cwd(),
  'ops/fixtures/lang/scripts/simple_chat_player.zss',
)

const RUNTIME_SOURCE = Array.from(
  { length: 64 },
  (_, i) => `#clear flag${i}`,
).join('\n')

function benchcompile(source: string, iterations: number) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    const build = compile('bench', source)
    expect(build.errors ?? []).toEqual([])
    expect(build.code).toBeDefined()
  }
  return performance.now() - start
}

function stubchip(): CHIP {
  let ec = 1
  let lc = 0
  const noop = () => 0
  const api = new Proxy({} as CHIP, {
    get(_target, prop) {
      switch (prop) {
        case 'sy':
          return () => ++lc > 512
        case 'getcase':
          return () => ec
        case 'nextcase':
          return () => {
            ec += 1
          }
        case 'jump':
          return (line: number) => {
            ec = line
          }
        case 'yield':
          return () => undefined
        case 'stacktrace':
          return () => ({ line: 0, column: 0 })
        default:
          return noop
      }
    },
  })
  return api
}

function benchruntime(source: string, iterations: number) {
  const build = compile('bench', source)
  expect(build.errors ?? []).toEqual([])
  expect(build.code).toBeDefined()
  const fn = build.code!
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn(stubchip())
  }
  return performance.now() - start
}

describe('lang codegen microbench', () => {
  it('records compile baseline for simple_chat_player', () => {
    const source = readFileSync(FIXTURE, 'utf8')
    const compilems = benchcompile(source, 5)
    expect(compilems).toBeGreaterThan(0)
    expect(compilems).toBeLessThan(30_000)
  })

  it('records runtime baseline for fused straight-line clears', () => {
    const runtimems = benchruntime(RUNTIME_SOURCE, 200)
    expect(runtimems).toBeGreaterThan(0)
    expect(runtimems).toBeLessThan(30_000)
  })

  it('records readexpr fast path for numeric literals', () => {
    READ_CONTEXT.words = [42, 'north']
    const start = performance.now()
    for (let i = 0; i < 10_000; i++) {
      const [value, next] = readexpr(0)
      expect(value).toBe(42)
      expect(next).toBe(1)
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(5000)
  })

  it('compileast skips addRange on runtime path', () => {
    const source = '#clear x\n'
    const withranges = compileast(source, { ranges: true }).ast
    const noranges = compileast(source, { ranges: false }).ast
    expect(withranges?.lines?.[0]?.range).toBeDefined()
    expect(noranges?.lines?.[0]?.range).toBeUndefined()
  })
})
