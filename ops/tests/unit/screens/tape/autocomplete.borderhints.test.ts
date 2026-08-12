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

describe('getautocomplete border status hints', () => {
  beforeEach(() => {
    romreadmock.mockReset()
    romreadmock.mockImplementation((path: string) => {
      switch (path) {
        case 'editor:stats:ispushable':
          return `---
hint: "True if element is pushable"
---`
        case 'editor:stats:cycle':
          return `---
hint: "How often the object runs"
---`
        case 'editor:stats:char':
          return `---
hint: "Display character code"
---`
        case 'editor:stats:event':
          return `---
hint: "Regex matching the loader event name"
---`
        case 'editor:stats:object':
          return `---
hint: "elements that can walk, swim, or be used with #shoot"
---`
        case 'editor:stats:board':
          return `---
hint: "creates a 60x25 space for terrain and object elements"
---`
        case 'editor:stats:color0':
          return `desc;Palette RGB for color slot 0`
        case 'editor:text':
          return `---
hint: "adds text to scroll"
---`
        case 'editor:shortgo':
          return `---
hint: "waits until the object can move in the given direction and moves"
---`
        case 'editor:shorttry':
          return `---
hint: "will move the object in the given direction"
---`
        case 'editor:hyperlink:label-message':
          return `---
hint: "Label for message"
---`
        case 'editor:hyperlink:text':
          return `---
hint: "read text input into given stat/flag"
---`
        case 'editor:hyperlink':
          return `---
hint: "adds hyperlink text to scroll"
---`
        default:
          return undefined
      }
    })
  })

  it('shows per-stat ROM hint on @ispushable', () => {
    // Later-line field (not first-line bare object name)
    const row = rowforcode('@ispushable', 20)
    const ac = getautocomplete(row, row.start, words)
    expect(ac.endoflinehint).toBe(true)
    expect(ac.endoflineargs).toEqual(['True if element is pushable'])
    expect(romreadmock).toHaveBeenCalledWith('editor:stats:ispushable')
  })

  it('shows per-stat ROM hint on @cycle with args', () => {
    const row = rowforcode('@cycle 1', 20)
    const ac = getautocomplete(row, row.start + 1, words)
    expect(ac.endoflinehint).toBe(true)
    expect(ac.endoflineargs).toEqual(['How often the object runs'])
    expect(romreadmock).toHaveBeenCalledWith('editor:stats:cycle')
  })

  it('shows text ROM hint on quoted scroll line', () => {
    const row = rowforcode('"hello scroll"')
    const ac = getautocomplete(row, 0, words)
    expect(ac.endoflinehint).toBe(true)
    expect(ac.endoflineargs).toEqual(['adds text to scroll'])
    expect(romreadmock).toHaveBeenCalledWith('editor:text')
  })

  it('shows shortgo hint on /n', () => {
    const row = rowforcode('/n')
    const ac = getautocomplete(row, 0, words)
    expect(ac.endoflinehint).toBe(true)
    expect(ac.endoflineargs).toEqual([
      'waits until the object can move in the given direction and moves',
    ])
    expect(romreadmock).toHaveBeenCalledWith('editor:shortgo')
  })

  it('shows shorttry hint on ?e', () => {
    const row = rowforcode('?e')
    const ac = getautocomplete(row, 0, words)
    expect(ac.endoflinehint).toBe(true)
    expect(ac.endoflineargs).toEqual([
      'will move the object in the given direction',
    ])
    expect(romreadmock).toHaveBeenCalledWith('editor:shorttry')
  })

  it('does not treat / inside #command as shortgo', () => {
    const row = rowforcode('#set a / 2')
    // Cursor on the "/" token
    const slashcol = row.code.indexOf('/')
    const ac = getautocomplete(row, slashcol, words)
    expect(ac.endoflinehint).toBe(true)
    expect(ac.hintcommandname).toBe('set')
    expect(ac.endoflineargs).toEqual([
      ARG_TYPE.NAME,
      ARG_TYPE.ANY,
      'set flag',
    ])
    expect(romreadmock).not.toHaveBeenCalledWith('editor:shortgo')
    expect(romreadmock).not.toHaveBeenCalledWith('editor:text')
  })

  it('shows Label for message on hyperlink label without type', () => {
    const row = rowforcode('!menu;go there')
    const semicolon = row.code.indexOf(';')
    const ac = getautocomplete(row, semicolon, words)
    expect(ac.endoflinehint).toBe(true)
    expect(ac.endoflineargs).toEqual(['Label for message'])
    expect(romreadmock).toHaveBeenCalledWith('editor:hyperlink:label-message')
  })

  it('shows char field hint on later-line @char', () => {
    const row = rowforcode('@char', 20)
    const ac = getautocomplete(row, row.start, words, undefined, 'object')
    expect(ac.endoflinehint).toBe(true)
    expect(ac.endoflineargs).toEqual(['Display character code'])
    expect(romreadmock).toHaveBeenCalledWith('editor:stats:char')
  })

  it('shows event hint on later-line @event', () => {
    const row = rowforcode('@event', 20)
    const ac = getautocomplete(row, row.start, words, undefined, 'loader')
    expect(ac.endoflinehint).toBe(true)
    expect(ac.endoflineargs).toEqual(['Regex matching the loader event name'])
    expect(romreadmock).toHaveBeenCalledWith('editor:stats:event')
  })

  it('shows parametric color0 hint', () => {
    const row = rowforcode('@color0', 20)
    const ac = getautocomplete(row, row.start, words, undefined, 'palette')
    expect(ac.endoflinehint).toBe(true)
    expect(ac.endoflineargs).toEqual(['Palette RGB for color slot 0'])
    expect(romreadmock).toHaveBeenCalledWith('editor:stats:color0')
  })

  it('shows board type-prefix hint on @board banana', () => {
    const row = rowforcode('@board banana')
    const ac = getautocomplete(row, 0, words)
    expect(ac.endoflinehint).toBe(true)
    expect(ac.endoflineargs).toEqual([
      'creates a 60x25 space for terrain and object elements',
    ])
    expect(romreadmock).toHaveBeenCalledWith('editor:stats:board')
  })

  it('shows object hint for first-line bare @apple', () => {
    const row = rowforcode('@apple')
    const ac = getautocomplete(row, 0, words)
    expect(ac.endoflinehint).toBe(true)
    expect(ac.endoflineargs).toEqual([
      'elements that can walk, swim, or be used with #shoot',
    ])
    expect(romreadmock).toHaveBeenCalledWith('editor:stats:object')
    expect(romreadmock).not.toHaveBeenCalledWith('editor:stats:apple')
  })
})
