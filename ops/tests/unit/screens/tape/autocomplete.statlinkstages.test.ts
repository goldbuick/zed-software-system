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

jest.mock('zss/rom', () => {
  const actual = jest.requireActual<typeof import('zss/rom')>('zss/rom')
  return {
    ...actual,
    romread: jest.fn(),
  }
})

import { tokenize } from 'zss/feature/lang/backend/typescript/lexer'
import type { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import { romread } from 'zss/rom'
import { getautocomplete } from 'zss/screens/tape/autocomplete'
import type { EDITOR_CODE_ROW } from 'zss/screens/tape/common'
import { resolvestatlinkstage } from 'zss/screens/tape/statlinkstages'
import { ARG_TYPE } from 'zss/words/types'

const romreadmock = romread as jest.MockedFunction<typeof romread>

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

describe('resolvestatlinkstage', () => {
  it('detects name, type, typed, and label on @p1 number;label', () => {
    const image = '@p1 number;pick a number!'
    expect(resolvestatlinkstage(image, 1).stage).toBe('name')
    expect(resolvestatlinkstage(image, 3).prefix).toBe('p1')
    const afterspace = image.indexOf(' ') + 1
    expect(resolvestatlinkstage(image, afterspace).stage).toBe('type')
    const onnumber = image.indexOf('number') + 6
    expect(resolvestatlinkstage(image, onnumber).stage).toBe('typed')
    expect(resolvestatlinkstage(image, onnumber).canonical).toBe('number')
    const inlabel = image.indexOf(';') + 2
    expect(resolvestatlinkstage(image, inlabel).stage).toBe('label')
    expect(resolvestatlinkstage(image, inlabel).canonical).toBe('number')
  })

  it('resolves alias nm to number', () => {
    const image = '@p1 nm;'
    const atnm = image.indexOf('nm') + 2
    expect(resolvestatlinkstage(image, atnm).canonical).toBe('number')
  })

  it('treats @char 2 value as args, not type', () => {
    const image = '@char 2'
    const onvalue = image.indexOf('2')
    const info = resolvestatlinkstage(image, onvalue + 1)
    expect(info.stage).toBe('args')
    expect(info.name).toBe('char')
    expect(info.canonical).toBe('')
  })
})

describe('getautocomplete stage-aware stat/hyperlink hints', () => {
  beforeEach(() => {
    romreadmock.mockReset()
    romreadmock.mockImplementation((path: string) => {
      const hints: Record<string, string> = {
        'editor:stats': `---
hint: "declares a codepage or element stat"
---`,
        'editor:stats:p1': `---
hint: "Element parameter 1"
---`,
        'editor:stats:cycle': `---
hint: "How often the object runs"
---`,
        'editor:stats:char': `---
hint: "Display character code"
---`,
        'editor:stats:number': `---
hint: "read number input into given stat/flag"
---`,
        'editor:stats:label-number': `---
hint: "Label for number"
---`,
        'editor:stats:label-message': `---
hint: "Label for message"
---`,
        'editor:hyperlink': `---
hint: "adds hyperlink text to scroll"
---`,
        'editor:hyperlink:range': `---
hint: "a slider input from 1 to 9 "
---`,
        'editor:hyperlink:label-range': `---
hint: "Label for range"
---`,
        'editor:hyperlink:label-message': `---
hint: "Label for message"
---`,
        'editor:hyperlink:copyit': `---
hint: "copies given content into the clipboard"
---`,
      }
      return hints[path]
    })
  })

  it('suggests kind words including aliases after @p1 ', () => {
    const row = rowforcode('@p1 ', 20)
    const ac = getautocomplete(row, row.start + 4, words)
    const wordsuggested = ac.suggestions.map((s) => s.word)
    expect(wordsuggested).toEqual(
      expect.arrayContaining(['number', 'range', 'copyit']),
    )
    // Empty type slot still keeps the field name hint (not bare category)
    expect(romreadmock).toHaveBeenCalledWith('editor:stats:p1')
  })

  it('filters kind aliases by prefix nm', () => {
    const row = rowforcode('@p1 nm', 20)
    // Cursor mid-alias so type stage still filters
    const ac = getautocomplete(row, row.start + 5, words)
    expect(ac.suggestions.map((s) => s.word)).toEqual(
      expect.arrayContaining(['nm', 'number']),
    )
  })

  it('shows stats:number hint on @p1 number', () => {
    const row = rowforcode('@p1 number', 20)
    const ac = getautocomplete(row, row.start + 10, words)
    expect(ac.endoflinehint).toBe(true)
    expect(ac.endoflineargs).toEqual([
      'read number input into given stat/flag',
    ])
    expect(romreadmock).toHaveBeenCalledWith('editor:stats:number')
  })

  it('shows Label for number in @ label stage', () => {
    const row = rowforcode('@p1 number;pick a number!', 20)
    const cursor = row.start + row.code.indexOf('pick')
    const ac = getautocomplete(row, cursor, words)
    expect(ac.endoflineargs).toEqual(['Label for number'])
    expect(romreadmock).toHaveBeenCalledWith('editor:stats:label-number')
  })

  it('keeps field hint for @cycle 1 non-kind args', () => {
    const row = rowforcode('@cycle 1', 20)
    const ac = getautocomplete(row, row.start + 1, words)
    expect(ac.endoflineargs).toEqual(['How often the object runs'])
    expect(romreadmock).toHaveBeenCalledWith('editor:stats:cycle')
  })

  it('keeps char field hint when cursor is on @char 2 value', () => {
    const row = rowforcode('@char 2', 20)
    const cursor = row.start + row.code.indexOf('2')
    const ac = getautocomplete(row, cursor, words, undefined, 'object')
    expect(ac.endoflineargs).toEqual(['Display character code'])
    expect(romreadmock).toHaveBeenCalledWith('editor:stats:char')
    expect(romreadmock).not.toHaveBeenCalledWith('editor:stats')
  })

  it('shows hyperlink:range on !gonk range', () => {
    const row = rowforcode('!gonk range')
    const cursor = row.code.indexOf('range') + 5
    const ac = getautocomplete(row, cursor, words)
    expect(ac.endoflineargs).toEqual(['a slider input from 1 to 9 '])
    expect(romreadmock).toHaveBeenCalledWith('editor:hyperlink:range')
  })

  it('shows Label for range on !gonk range;pick', () => {
    const row = rowforcode('!gonk range;pick a thing')
    const cursor = row.code.indexOf(';') + 1
    const ac = getautocomplete(row, cursor, words)
    expect(ac.endoflineargs).toEqual(['Label for range'])
    expect(romreadmock).toHaveBeenCalledWith('editor:hyperlink:label-range')
  })

  it('shows Label for message on plain !menu;go there', () => {
    const row = rowforcode('!menu;go there')
    const cursor = row.code.indexOf(';')
    const ac = getautocomplete(row, cursor, words)
    expect(ac.endoflineargs).toEqual(['Label for message'])
    expect(romreadmock).toHaveBeenCalledWith('editor:hyperlink:label-message')
  })

  it('suggests copyit among hyperlink kinds', () => {
    const row = rowforcode('!target ')
    const ac = getautocomplete(row, row.code.indexOf(' ') + 1, words)
    expect(ac.suggestions.map((s) => s.word)).toEqual(
      expect.arrayContaining(['copyit', 'openit', 'number']),
    )
  })
})
