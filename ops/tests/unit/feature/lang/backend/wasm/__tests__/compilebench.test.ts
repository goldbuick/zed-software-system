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
import {
  LANG_COOLREGIONSBOW_DIR,
  LANG_PARITY_DIR,
  LANG_SCRIPTS_DIR,
} from 'ops/lib/fixturepaths'

const FIXTUREDIR = LANG_PARITY_DIR
const INTEGRATIONDIR = LANG_SCRIPTS_DIR
const BOOKDIR = LANG_COOLREGIONSBOW_DIR

function readzss(dir: string, id: string) {
  return readFileSync(path.join(dir, `${id}.zss`), 'utf8')
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function bench(fn: () => void, iterations: number, warmup: number) {
  for (let i = 0; i < warmup; i++) {
    fn()
  }
  const samples: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    samples.push(performance.now() - start)
  }
  return { median: median(samples) }
}

function formatms(ms: number) {
  return ms < 1 ? `${(ms * 1000).toFixed(0)} µs` : `${ms.toFixed(3)} ms`
}

/** TS backend only — pair with `yarn task run lang:bench:wasm` for WASM. */
describe('lang compile benchmark', () => {
  it('benchmark TS compile time', () => {
    jest.spyOn(console, 'time').mockImplementation(() => {})
    jest.spyOn(console, 'timeEnd').mockImplementation(() => {})

    const cases = [
      {
        id: 'drawdisplay',
        name: 'drawpass',
        source: readzss(FIXTUREDIR, 'drawdisplay'),
      },
      {
        id: 'short_go',
        name: 'short_go',
        source: readzss(FIXTUREDIR, 'short_go'),
      },
      {
        id: 'simple_chat_player',
        name: 'player',
        source: readzss(INTEGRATIONDIR, 'simple_chat_player'),
      },
      {
        id: 'duplicator',
        name: 'duplicator',
        source: readzss(BOOKDIR, 'duplicator'),
      },
      {
        id: 'player',
        name: 'player',
        source: readzss(BOOKDIR, 'player'),
      },
    ]

    const iterations = 30
    const warmup = 3
    const rows: string[] = []

    rows.push('TS compile benchmark (Chevrotain + transform + new Function)')
    rows.push(`Iterations: ${iterations} (+ ${warmup} warmup each)`)
    rows.push('')

    const idwidth = Math.max(...cases.map((item) => item.id.length))
    rows.push(`${'fixture'.padEnd(idwidth)}  lines   TS median`)
    rows.push('-'.repeat(idwidth + 20))

    for (const item of cases) {
      const lines = item.source.split('\n').length
      const tsbuild = compile(item.name, item.source)
      expect(tsbuild.errors ?? []).toHaveLength(0)

      const ts = bench(
        () => {
          compile(item.name, item.source)
        },
        iterations,
        warmup,
      )

      rows.push(
        `${item.id.padEnd(idwidth)}  ${String(lines).padStart(5)}   ${formatms(ts.median).padStart(9)}`,
      )
    }

    rows.push('')
    rows.push(
      'Run `yarn task run lang:bench:wasm` for Emscripten WASM timings.',
    )

    // eslint-disable-next-line no-console
    console.log('\n' + rows.join('\n') + '\n')
  })
})
