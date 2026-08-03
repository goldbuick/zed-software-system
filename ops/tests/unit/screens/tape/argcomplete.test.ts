import type { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import {
  editorforcommandargcomplete,
  itemsfromwordlistref,
  listsforcommandargcomplete,
  resolveargitems,
} from 'zss/screens/tape/argcomplete'

const emptywords = {
  langcommands: {},
  clicommands: {},
  loadercommands: {},
  runtimecommands: {},
  flags: [],
  statsboard: ['board'],
  statshelper: [],
  statssender: [],
  statsinteraction: [],
  statsboolean: [],
  statsconfig: [],
  objects: ['hero'],
  terrains: [],
  boards: ['start'],
  palettes: [],
  charsets: [],
  loaders: [],
  categories: [],
  colors: [],
  dirs: [],
  dirmods: [],
  exprs: [],
  roles: ['mod'],
  permissionconfigs: ['lockdown', 'creative', 'open'],
  players: ['alice'],
  labels: [],
  commandargmeta: {},
} satisfies GADGET_ZSS_WORDS

describe('listsforcommandargcomplete', () => {
  it('reads lists by arg index', () => {
    const meta = { lists: ['objects', 'boards'] as const }
    expect(listsforcommandargcomplete(meta, 0, '')).toBe('objects')
    expect(listsforcommandargcomplete(meta, 1, '')).toBe('boards')
  })

  it('prefers listswhenfirst branch', () => {
    const meta = {
      lists: ['objects'],
      listswhenfirst: {
        start: ['boards', 'roles'],
      },
    }
    expect(listsforcommandargcomplete(meta, 1, 'start')).toBe('roles')
    expect(listsforcommandargcomplete(meta, 1, 'other')).toBeUndefined()
  })
})

describe('editorforcommandargcomplete', () => {
  it('reads editor source by arg index', () => {
    const meta = { editor: ['variables', 'labels'] as const }
    expect(editorforcommandargcomplete(meta, 0, '')).toBe('variables')
    expect(editorforcommandargcomplete(meta, 1, '')).toBe('labels')
  })
})

describe('itemsfromwordlistref', () => {
  it('maps objects and synthetic stats', () => {
    const objects = itemsfromwordlistref('objects', emptywords)
    expect(objects).toEqual([{ word: 'hero', category: 'objects' }])
    const stats = itemsfromwordlistref('stats', emptywords)
    expect(stats).toEqual([{ word: 'board', category: 'stats' }])
  })
})

describe('resolveargitems', () => {
  it('prefers keywords over lists', () => {
    const items = resolveargitems({
      words: emptywords,
      meta: {
        byposition: [['lockdown', 'creative', 'open']],
        lists: ['objects'],
      },
      argindex: 0,
      firstarglower: '',
      maybesig: undefined,
      prefix: 'loc',
    })
    expect(items.map((i) => i.word)).toEqual(['lockdown', 'creative', 'open'])
  })

  it('uses editor variables when present', () => {
    const items = resolveargitems({
      words: emptywords,
      meta: { editor: ['variables'] },
      argindex: 0,
      firstarglower: '',
      maybesig: undefined,
      prefix: 'sco',
      editorctx: { labels: [], variables: ['score', 'health'] },
    })
    expect(items.map((i) => i.word)).toEqual(['score', 'health'])
  })

  it('uses lists for run-style commands', () => {
    const items = resolveargitems({
      words: emptywords,
      meta: { lists: ['objects'] },
      argindex: 0,
      firstarglower: '',
      maybesig: undefined,
      prefix: 'he',
    })
    expect(items).toEqual([{ word: 'hero', category: 'objects' }])
  })
})
