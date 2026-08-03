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
const memoryfssig = [
  ARG_TYPE.NAME,
  'memoryfs status|detach (operator only)',
] as const
const zztsearchsig = [
  ARG_TYPE.NAME,
  ARG_TYPE.MAYBE_NAME,
  'ZZT content by field and text',
] as const
const fetchsig = [
  ARG_TYPE.NAME,
  ARG_TYPE.NAME,
  ARG_TYPE.MAYBE_STRING,
  'URL with label, method, and optional data',
] as const
const fetchwithsig = [
  ARG_TYPE.ANY,
  ARG_TYPE.NAME,
  ARG_TYPE.NAME,
  ARG_TYPE.MAYBE_STRING,
  'URL with argument, label, method, and optional data',
] as const
const zapsig = [ARG_TYPE.NAME, '-activate first label of given name'] as const

const words = {
  langcommands: {
    give: [...givesig],
    take: [...takesig],
    put: [...putsig],
  },
  clicommands: {
    memoryfs: [...memoryfssig],
    zztsearch: [...zztsearchsig],
  },
  loadercommands: {},
  runtimecommands: {
    set: [...setsig],
    clear: [...clearsig],
    array: [...arraysig],
    fetch: [...fetchsig],
    fetchwith: [...fetchwithsig],
    zap: [...zapsig],
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
  labels: [':touch', ':think', ':calc'],
  commandargmeta: {
    give: { lists: ['flags'], editor: ['variables'] },
    take: { lists: ['flags'], editor: ['variables'] },
    set: { lists: ['flags'], editor: ['variables'] },
    clear: { lists: ['flags'], editor: ['variables'] },
    array: { lists: ['flags'], editor: ['variables'] },
    memoryfs: { byposition: [['status', 'detach']] },
    zztsearch: {
      byposition: [
        [
          'title',
          'letter',
          'author',
          'genres',
          'filename',
          'screenshot',
          'publish_date',
        ],
      ],
    },
    fetch: { byposition: [[], [], ['get', 'post:json']] },
    fetchwith: { byposition: [[], [], [], ['get', 'post:json']] },
    zap: { editor: ['labels'], lists: ['labels'] },
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

  it('suggests memoryfs actions for #memoryfs st', () => {
    const row = rowforcode('#memoryfs st')
    const cursor = row.code.indexOf('st') + 2
    const ac = getautocomplete(row, cursor, words)
    expect(ac.suggestions.map((s) => s.word)).toEqual(['status'])
  })

  it('suggests zztsearch fields for #zztsearch ti', () => {
    const row = rowforcode('#zztsearch ti')
    const cursor = row.code.indexOf('ti') + 2
    const ac = getautocomplete(row, cursor, words)
    expect(ac.suggestions.map((s) => s.word)).toEqual(['title'])
  })

  it('suggests fetch methods get and post:json', () => {
    const rowget = rowforcode('#fetch x y ge')
    const cursorget = rowget.code.indexOf('ge') + 2
    const acget = getautocomplete(rowget, cursorget, words)
    expect(acget.suggestions.map((s) => s.word)).toEqual(['get'])

    const rowpost = rowforcode('#fetch x y po')
    const cursorpost = rowpost.code.indexOf('po') + 2
    const acpost = getautocomplete(rowpost, cursorpost, words)
    expect(acpost.suggestions.map((s) => s.word)).toEqual(['post:json'])

    const rowwith = rowforcode('#fetchwith a x y ge')
    const cursorwith = rowwith.code.indexOf('ge') + 2
    const acwith = getautocomplete(rowwith, cursorwith, words)
    expect(acwith.suggestions.map((s) => s.word)).toEqual(['get'])
  })

  it('suggests book labels for #zap in terminal without editorctx', () => {
    const row = rowforcode('#zap :to')
    const cursor = row.code.indexOf(':to') + 3
    const ac = getautocomplete(row, cursor, words)
    expect(ac.suggestions.map((s) => s.word)).toEqual([':touch'])
  })

  it('prefers editor labels for #zap when editorctx is present', () => {
    const row = rowforcode('#zap :th')
    const cursor = row.code.indexOf(':th') + 3
    const ac = getautocomplete(row, cursor, words, {
      labels: [':think', ':thaw'],
      variables: [],
    })
    expect(ac.suggestions.map((s) => s.word)).toEqual([':thaw', ':think'])
  })
})
