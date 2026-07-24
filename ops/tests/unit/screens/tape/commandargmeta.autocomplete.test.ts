import {
  keywordsforcommandargcomplete,
  listsforcommandargcomplete,
  resolveargitems,
} from 'zss/screens/tape/argcomplete'
import { ARG_TYPE } from 'zss/words/types'

describe('resolveargitems', () => {
  const emptywords = {
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
    objects: ['myobj'],
    terrains: [],
    boards: [],
    palettes: [],
    charsets: [],
    loaders: [],
    categories: [],
    colors: [],
    dirs: ['north', 'flow'],
    dirmods: ['oop', 'cw'],
    exprs: [],
    roles: [],
    permissionconfigs: [],
    players: [],
    commandargmeta: {},
  }

  it('uses lists metadata for objects', () => {
    const items = resolveargitems({
      words: emptywords,
      meta: { lists: ['objects'] },
      argindex: 0,
      firstarglower: '',
      maybesig: undefined,
      prefix: 'my',
    })
    expect(items.map((i) => i.word)).toEqual(['myobj'])
  })

  it('uses dir phase after_mod for flow prefix', () => {
    const items = resolveargitems({
      words: emptywords,
      meta: undefined,
      argindex: 0,
      firstarglower: '',
      maybesig: [ARG_TYPE.DIR, 'dir hint'],
      prefix: 'f',
      dirphase: { kind: 'after_mod' },
    })
    expect(items.some((i) => i.word === 'flow')).toBe(true)
  })

  it('returns empty past signature', () => {
    const items = resolveargitems({
      words: emptywords,
      meta: undefined,
      argindex: 3,
      firstarglower: '',
      maybesig: [ARG_TYPE.NAME, 'one arg'],
      prefix: 'x',
    })
    expect(items).toEqual([])
  })
})

describe('listsforcommandargcomplete', () => {
  it('reads listswhenfirst branch', () => {
    const meta = {
      listswhenfirst: {
        start: [[], ['objects']],
      },
    }
    expect(listsforcommandargcomplete(meta, 1, 'start')).toEqual(['objects'])
  })
})

describe('keywordsforcommandargcomplete', () => {
  it('uses byposition for arg index 1', () => {
    const meta = {
      byposition: [[], ['alpha', 'beta']],
    }
    expect(keywordsforcommandargcomplete(meta, 1, 'ignored')).toEqual([
      'alpha',
      'beta',
    ])
  })

  it('prefers whenfirst row for arg index when first arg matches', () => {
    const meta = {
      byposition: [[], ['frombase']],
      whenfirst: {
        mode: [[], ['x', 'y']],
      },
    }
    expect(keywordsforcommandargcomplete(meta, 1, 'mode')).toEqual(['x', 'y'])
    expect(keywordsforcommandargcomplete(meta, 1, 'other')).toEqual([
      'frombase',
    ])
  })

  it('uses byposition for arg 0 without whenfirst branch', () => {
    const meta = {
      byposition: [['a', 'b']],
      whenfirst: { mode: [['only', 'variant']] },
    }
    expect(keywordsforcommandargcomplete(meta, 0, '')).toEqual(['a', 'b'])
  })

  it('returns undefined when no list applies', () => {
    expect(keywordsforcommandargcomplete(undefined, 0, '')).toBeUndefined()
    expect(keywordsforcommandargcomplete({}, 0, '')).toBeUndefined()
  })
})
