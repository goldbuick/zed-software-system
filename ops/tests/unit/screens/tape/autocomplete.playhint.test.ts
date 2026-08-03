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

const playsig = [ARG_TYPE.MAYBE_NAME, 'music notes'] as const
const toastsig = ['toast notification'] as const

const words = {
  langcommands: {},
  clicommands: {},
  loadercommands: {},
  runtimecommands: {
    play: [...playsig],
    bgplay: [ARG_TYPE.MAYBE_NAME, '#play but for sound effects'],
    toast: [...toastsig],
    ticker: ['element ticker text'],
    clear: [ARG_TYPE.NAME, 'flag name to clear'],
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

describe('getautocomplete free-form play/toast/ticker hints', () => {
  it('resolves #play notation to play signature, not send-the-message fallback', () => {
    const row = rowforcode('#play c c c')
    // Cursor on the free-form play token (after "#play ").
    const ac = getautocomplete(row, 7, words)
    expect(ac.hintcommandname).toBe('play')
    expect(ac.endoflinehint).toBe(true)
    expect(ac.endoflineargs).toEqual([...playsig])
    expect(ac.suggestions).toEqual([])
    const fallback = String(ac.endoflineargs[ac.endoflineargs.length - 1] ?? '')
    expect(fallback).not.toMatch(/^send the message/)
  })

  it('resolves #bgplay the same way', () => {
    const row = rowforcode('#bgplay c4')
    const ac = getautocomplete(row, 8, words)
    expect(ac.hintcommandname).toBe('bgplay')
    expect(ac.endoflineargs[ac.endoflineargs.length - 1]).toBe(
      '#play but for sound effects',
    )
    expect(ac.suggestions).toEqual([])
  })

  it('resolves #toast free-form line', () => {
    const row = rowforcode('#toast hello world')
    const ac = getautocomplete(row, 8, words)
    expect(ac.hintcommandname).toBe('toast')
    expect(ac.endoflineargs).toEqual([...toastsig])
    expect(ac.suggestions).toEqual([])
  })

  it('shows endoflinehint when cursor is on #', () => {
    const row = rowforcode('#clear key15')
    const ac = getautocomplete(row, 0, words)
    expect(ac.endoflinehint).toBe(true)
    expect(ac.hintcommandname).toBe('clear')
    expect(ac.endoflineargs.length).toBeGreaterThan(0)
    expect(ac.endoflineargs).toEqual([ARG_TYPE.NAME, 'flag name to clear'])
  })

  it('still shows endoflinehint when cursor is on the command name', () => {
    const row = rowforcode('#clear key15')
    // Cursor on "c" of clear
    const ac = getautocomplete(row, 1, words)
    expect(ac.endoflinehint).toBe(true)
    expect(ac.hintcommandname).toBe('clear')
    expect(ac.endoflineargs).toEqual([ARG_TYPE.NAME, 'flag name to clear'])
  })
})
