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

import { tokenize } from 'zss/feature/lang/backend/typescript/lexer'
import type { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import {
  drawautocomplete,
  getautocomplete,
} from 'zss/screens/tape/autocomplete'
import type { EDITOR_CODE_ROW } from 'zss/screens/tape/common'
import { createwritetextcontext } from 'zss/words/textformat'
import { ARG_TYPE, COLOR } from 'zss/words/types'

const words = {
  langcommands: {},
  clicommands: {},
  loadercommands: {},
  runtimecommands: {
    set: [ARG_TYPE.NAME, ARG_TYPE.ANY, 'set flag'],
  },
  flags: [],
  statsboard: [],
  statshelper: [],
  statssender: [],
  statsinteraction: [],
  statsboolean: [],
  statsconfig: [],
  objects: ['apple', 'banana'],
  terrains: ['grass'],
  boards: ['main'],
  palettes: [],
  charsets: [],
  loaders: ['boot'],
  categories: [],
  colors: [],
  dirs: [],
  dirmods: [],
  exprs: [],
  roles: [],
  permissionconfigs: [],
  players: [],
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

describe('terminal @ codepage autocomplete', () => {
  it('suggests book codepage names, not first-line type keywords', () => {
    const row = rowforcode('@')
    const ac = getautocomplete(
      row,
      0,
      words,
      undefined,
      undefined,
      'codepages',
    )
    const names = ac.suggestions.map((s) => s.word)
    expect(names).toEqual(
      expect.arrayContaining(['apple', 'banana', 'grass', 'main', 'boot']),
    )
    expect(names).not.toEqual(expect.arrayContaining(['loader', 'board']))
    expect(names.includes('loader')).toBe(false)
    expect(names.includes('object')).toBe(false)
  })

  it('filters codepage names by prefix', () => {
    const row = rowforcode('@ap')
    const ac = getautocomplete(
      row,
      2,
      words,
      undefined,
      undefined,
      'codepages',
    )
    expect(ac.suggestions.map((s) => s.word)).toEqual(['apple'])
  })
})

describe('terminal autocomplete draw geometry', () => {
  it('places suggestion 0 above the status strip and aligns px to edge.left', () => {
    const width = 40
    const height = 12
    const context = createwritetextcontext(
      width,
      height,
      COLOR.WHITE,
      COLOR.BLACK,
    )
    context.char = Array(width * height).fill(' ')
    context.color = Array(width * height).fill(COLOR.WHITE)
    context.bg = Array(width * height).fill(COLOR.BLACK)
    context.width = width
    context.height = height

    const edge = {
      left: 0,
      top: 0,
      right: width - 1,
      bottom: height - 1,
      width,
      height,
    }
    const statusy = edge.bottom - 1
    const ac = getautocomplete(
      rowforcode('@'),
      0,
      words,
      undefined,
      undefined,
      'codepages',
    )
    expect(ac.suggestions.length).toBeGreaterThan(0)
    expect(ac.wordcol).toBe(0)

    drawautocomplete(
      ac,
      0,
      edge.left + ac.wordcol,
      statusy,
      edge,
      context,
      words,
      true,
      true,
    )

    const sug0y = statusy - 1
    const row = context.char
      .slice(sug0y * width, sug0y * width + width)
      .join('')
      .trimEnd()
    expect(row.trimStart().length).toBeGreaterThan(0)
    // First suggestion word should start at column 0 (no off-by-one clip)
    expect(context.char[sug0y * width + 1]).not.toBe(' ')
    // Status strip row should not hold the suggestion word column fill from itemwidth alone on divider
    const statusrow = context.char
      .slice(statusy * width, statusy * width + 8)
      .join('')
    // omitselectedhint: no long prose beside; status row untouched by drawautocomplete
    expect(statusrow.includes('codepage')).toBe(false)
  })
})
