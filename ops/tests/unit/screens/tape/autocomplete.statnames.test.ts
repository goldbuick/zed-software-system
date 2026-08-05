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
}))

jest.mock('zss/rom', () => {
  const actual = jest.requireActual<typeof import('zss/rom')>('zss/rom')
  return {
    ...actual,
    romread: jest.fn(() => undefined),
  }
})

import { tokenize } from 'zss/feature/lang/backend/typescript/lexer'
import type { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import { getautocomplete } from 'zss/screens/tape/autocomplete'
import { applyautocompletesuggestion } from 'zss/screens/tape/autocompleteui'
import type { EDITOR_CODE_ROW } from 'zss/screens/tape/common'
import { CODE_PAGE_TYPE_STAT_KEYWORDS } from 'zss/words/stats'

const words = {
  langcommands: {},
  clicommands: {},
  loadercommands: {},
  runtimecommands: {},
  flags: [],
  statsboard: [],
  statshelper: [],
  statssender: [],
  statsinteraction: [],
  statsboolean: [],
  statsconfig: [],
  objects: [],
  terrains: [],
  boards: [],
  palettes: [],
  charsets: [],
  loaders: [],
  categories: [],
  colors: [],
  dirs: [],
  dirmods: [],
  exprs: [],
  roles: [],
  permissionconfigs: [],
  players: [],
  labels: [],
  commandargmeta: {},
} satisfies GADGET_ZSS_WORDS

function rowforcode(code: string, start = 0): EDITOR_CODE_ROW {
  const fullcode = code.endsWith('\n') ? code : `${code}\n`
  const result = tokenize(fullcode)
  expect(result.errors.length).toBe(0)
  return {
    start,
    code: fullcode,
    end: start + fullcode.length - 1,
    tokens: result.tokens,
  }
}

function spliceat(
  source: string,
  wordstart: number,
  prefixlen: number,
  word: string,
): string {
  return source.slice(0, wordstart) + word + source.slice(wordstart + prefixlen)
}

describe('getautocomplete @stat name suggestions', () => {
  it('suggests ispushable for @ispu and accept keeps leading @', () => {
    const row = rowforcode('@ispu', 20)
    const ac = getautocomplete(row, row.start, words, undefined, 'object')
    expect(ac.prefix).toBe('ispu')
    expect(ac.wordstart).toBe(row.start + 1)
    expect(ac.suggestions.map((s) => s.word)).toContain('ispushable')

    const idx = ac.suggestions.findIndex((s) => s.word === 'ispushable')
    expect(idx).toBeGreaterThanOrEqual(0)
    // Full document: 20 chars padding + `@ispu\n`
    let doc = `${' '.repeat(20)}${row.code}`
    const applied = applyautocompletesuggestion(ac, idx, (ws, plen, word) => {
      doc = spliceat(doc, ws, plen, word)
    })
    expect(applied).toBe(true)
    expect(doc.slice(20).startsWith('@ispushable')).toBe(true)
    expect(doc.includes('@@')).toBe(false)
  })

  it('suggests object for first-line @ob', () => {
    const row = rowforcode('@ob')
    const ac = getautocomplete(row, 0, words)
    expect(ac.suggestions.map((s) => s.word)).toContain('object')
  })

  it('suggests type prefixes for first-line bare @', () => {
    const row = rowforcode('@')
    const ac = getautocomplete(row, 0, words)
    const names = ac.suggestions.map((s) => s.word)
    expect(names.length).toBeGreaterThan(0)
    for (const key of CODE_PAGE_TYPE_STAT_KEYWORDS) {
      expect(names).toContain(key)
    }
    expect(ac.wordstart).toBe(1)
  })

  it('does not flood suggestions for later-line bare @', () => {
    const row = rowforcode('@', 20)
    const ac = getautocomplete(row, row.start, words, undefined, 'object')
    expect(ac.suggestions).toEqual([])
  })
})
