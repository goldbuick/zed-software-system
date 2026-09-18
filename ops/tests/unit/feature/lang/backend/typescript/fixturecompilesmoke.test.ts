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

jest.mock('zss/words/textformat', () => ({
  MaybeFlag: { name: 'MaybeFlag' },
  BraceFlag: { name: 'BraceFlag' },
  flagnamefromtoken: () => undefined,
  tokenize: () => ({ errors: [{ message: 'mock' }], tokens: [] }),
}))

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { compileast } from 'zss/feature/lang/backend/typescript/ast'
import { readcoolregionsbowbookexport } from 'ops/lib/coolregionsbowbook'
import { LANG_COOLREGIONSBOW_DIR } from 'ops/lib/fixturepaths'

function assertcompiles(label: string, source: string) {
  const result = compileast(source)
  const errors = result.errors ?? []
  if (errors.length > 0) {
    const detail = errors
      .map((e) => `${e.line}:${e.column} ${e.message}`)
      .join('; ')
    throw new Error(`${label}: ${detail}`)
  }
  expect(result.ast).toBeDefined()
}

function listzss(dir: string) {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.zss'))
    .sort()
}

describe('fixture compile smoke', () => {
  it('compiles every coolregionsbow .zss', () => {
    const files = listzss(LANG_COOLREGIONSBOW_DIR)
    expect(files.length).toBeGreaterThan(0)
    for (const name of files) {
      const source = readFileSync(
        path.join(LANG_COOLREGIONSBOW_DIR, name),
        'utf8',
      )
      assertcompiles(name, source)
    }
  })

  it('compiles every coolregionsbow book page code', () => {
    const book = readcoolregionsbowbookexport().data
    let count = 0
    for (let i = 0; i < book.pages.length; ++i) {
      const code = book.pages[i]?.code?.trim()
      if (!code) {
        continue
      }
      count += 1
      const head = code.split('\n')[0] ?? `page${i}`
      assertcompiles(`book[${i}] ${head}`, code)
    }
    expect(count).toBeGreaterThan(0)
  })
})
