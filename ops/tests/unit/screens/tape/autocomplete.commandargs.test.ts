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
import { getautocomplete } from 'zss/screens/tape/autocomplete'
import type { EDITOR_CODE_ROW } from 'zss/screens/tape/common'
import { ARG_TYPE } from 'zss/words/types'

const givesig = [ARG_TYPE.NAME, ARG_TYPE.ANY, 'give the value'] as const
const takesig = [ARG_TYPE.NAME, ARG_TYPE.ANY, 'take the value'] as const
const putsig = [ARG_TYPE.DIR, ARG_TYPE.KIND, 'put kind at direction'] as const
const setsig = [
  ARG_TYPE.NAME,
  'variable to value; multiple words joined with spaces',
] as const
const clearsig = [ARG_TYPE.NAME, 'variables (set to 0)'] as const
const arraysig = [ARG_TYPE.NAME, 'array variable'] as const

const words = {
  langcommands: {
    give: [...givesig],
    take: [...takesig],
    put: [...putsig],
  },
  clicommands: {},
  loadercommands: {},
  runtimecommands: {
    set: [...setsig],
    clear: [...clearsig],
    array: [...arraysig],
  },
  flags: ['ammo', 'gems', 'health'],
  statsboard: [],
  statshelper: [],
  statssender: [],
  statsinteraction: [],
  statsboolean: [],
  statsconfig: [],
  objects: ['northguard'],
  terrains: [],
  boards: [],
  palettes: [],
  charsets: [],
  loaders: [],
  categories: [],
  colors: [],
  dirs: ['north', 'south'],
  dirmods: [],
  exprs: [],
  roles: [],
  permissionconfigs: [],
  players: [],
  commandargmeta: {
    give: { lists: ['flags'], editor: ['variables'] },
    take: { lists: ['flags'], editor: ['variables'] },
    set: { lists: ['flags'], editor: ['variables'] },
    clear: { lists: ['flags'], editor: ['variables'] },
    array: { lists: ['flags'], editor: ['variables'] },
  },
} satisfies GADGET_ZSS_WORDS

function rowforcode(code: string): EDITOR_CODE_ROW {
  const fullcode = code.endsWith('\n') ? code : `${code}\n`
  const result = tokenize(fullcode)
  expect(result.errors.length).toBe(0)
  return {
    start: 0,
    code: fullcode,
    end: fullcode.length - 1,
    tokens: result.tokens,
  }
}

describe('command arg autocomplete (not text category)', () => {
  it('suggests flags for #give am and keeps give signature hint', () => {
    const row = rowforcode('#give am')
    const cursor = row.code.indexOf('am') + 2
    const ac = getautocomplete(row, cursor, words)
    expect(ac.suggestions.map((s) => s.word)).toEqual(['ammo'])
    expect(ac.endoflineargs).toEqual([...givesig])
    expect(ac.endoflineargs).not.toEqual(['adds text to scroll'])
    expect(ac.hintcommandname).toBe('give')
  })

  it('yields no #give name suggestions without commandargmeta.lists', () => {
    const { commandargmeta: _meta, ...wordswithoutmeta } = words
    const row = rowforcode('#give am')
    const cursor = row.code.indexOf('am') + 2
    const ac = getautocomplete(row, cursor, {
      ...wordswithoutmeta,
      commandargmeta: {},
    })
    expect(ac.suggestions).toEqual([])
    expect(ac.endoflineargs).toEqual([...givesig])
  })

  it('suggests flags for #take ge', () => {
    const row = rowforcode('#take ge')
    const cursor = row.code.indexOf('ge') + 2
    const ac = getautocomplete(row, cursor, words)
    expect(ac.suggestions.map((s) => s.word)).toEqual(['gems'])
    expect(ac.endoflineargs).toEqual([...takesig])
  })

  it('uses put signature for #put no, not text ROM hint', () => {
    const row = rowforcode('#put no')
    const cursor = row.code.indexOf('no') + 2
    const ac = getautocomplete(row, cursor, words)
    expect(ac.endoflineargs).toEqual([...putsig])
    expect(ac.suggestions.map((s) => s.word)).toEqual(
      expect.arrayContaining(['north']),
    )
    expect(ac.endoflineargs.join(' ')).not.toContain('adds text to scroll')
  })

  it('suggests flags for #set am in terminal (lists, no editorctx)', () => {
    const row = rowforcode('#set am')
    const cursor = row.code.indexOf('am') + 2
    const ac = getautocomplete(row, cursor, words)
    expect(ac.suggestions.map((s) => s.word)).toEqual(['ammo'])
    expect(ac.endoflineargs).toEqual([...setsig])
  })

  it('suggests editor variables for #set when editorctx is present', () => {
    const row = rowforcode('#set am')
    const cursor = row.code.indexOf('am') + 2
    const ac = getautocomplete(row, cursor, words, {
      labels: [],
      variables: ['ammo', 'camera'],
    })
    expect(ac.suggestions.map((s) => s.word)).toEqual(['ammo'])
  })

  it('suggests flags for #clear he and #array he', () => {
    for (const code of ['#clear he', '#array he'] as const) {
      const row = rowforcode(code)
      const cursor = row.code.indexOf('he') + 2
      const ac = getautocomplete(row, cursor, words)
      expect(ac.suggestions.map((s) => s.word)).toEqual(['health'])
    }
  })
})
