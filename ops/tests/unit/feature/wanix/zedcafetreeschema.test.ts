import {
  assertzedcafeexportvalid,
  kebabcasezedcafedirname,
  kebabcasezedcafenameportion,
  validatezedcafeexportpaths,
} from 'zss/feature/wanix/zedcafetreeschema'
import { buildzedcafeexportfiles } from 'zss/feature/wanix/wanixstateexport'
import type { BOOK, CODE_PAGE } from 'zss/memory/types'

jest.mock('zss/memory/session', () => ({
  memoryreadbooklist: jest.fn(() => []),
  memoryreadoperator: jest.fn(() => 'player1'),
}))

jest.mock('zss/memory/codepageoperations', () => ({
  memoryexportcodepageasjson: jest.fn((page: CODE_PAGE) => ({
    id: page.id,
    code: page.code,
    board: (page as { board?: unknown }).board,
    object: (page as { object?: unknown }).object,
    terrain: (page as { terrain?: unknown }).terrain,
    charset: (page as { charset?: unknown }).charset,
    palette: (page as { palette?: unknown }).palette,
  })),
  memoryreadcodepagetypeasstring: jest.fn((page: CODE_PAGE) => {
    if (page.code.includes('@object')) {
      return 'object'
    }
    if (page.code.includes('@board')) {
      return 'board'
    }
    return 'error'
  }),
  memoryreadcodepagename: jest.fn((page: CODE_PAGE) => {
    const match = /^@\w+\s+(\S+)/m.exec(page.code)
    return match?.[1]
  }),
}))

import { memoryreadbooklist } from 'zss/memory/session'

function encodetext(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

describe('zedcafetreeschema', () => {
  it('kebab-cases names for dirname segments', () => {
    expect(kebabcasezedcafenameportion('My Cool Book')).toBe('my-cool-book')
    expect(kebabcasezedcafenameportion('  Player_Name  ')).toBe('player-name')
    expect(kebabcasezedcafenameportion('foo..bar!!!')).toBe('foo-bar')
    expect(kebabcasezedcafenameportion('')).toBe('')
    expect(kebabcasezedcafedirname('My Cool Book', 'book1')).toBe(
      'my-cool-book-book1',
    )
    expect(kebabcasezedcafedirname('Player', 'page2')).toBe('player-page2')
    expect(kebabcasezedcafedirname(undefined, 'sid_abc')).toBe('sid_abc')
    expect(kebabcasezedcafedirname('', 'sid_abc')).toBe('sid_abc')
  })

  it('rejects paths outside schema', () => {
    const result = validatezedcafeexportpaths([
      { path: '../stats.json', bytes: encodetext('{}') },
      { path: 'books/foo/bar.json', bytes: encodetext('{}') },
    ])
    expect(result.ok).toBe(false)
    expect(result.errors.some((err) => err.includes('path outside schema'))).toBe(
      true,
    )
  })

  it('requires root stats and book/page stats from meta', () => {
    const root = encodetext(
      JSON.stringify({
        books: [{ id: 'book1', name: 'demo' }],
      }),
    )
    const result = validatezedcafeexportpaths([
      { path: 'stats.json', bytes: root },
    ])
    expect(result.ok).toBe(false)
    expect(
      result.errors.some((err) => err.includes('missing book stats')),
    ).toBe(true)
  })

  it('accepts full tree from buildzedcafeexportfiles', () => {
    const book = {
      id: 'book1',
      name: 'demo',
      token: 'tok',
      timestamp: 1,
      activelist: [],
      pages: [
        {
          id: 'page1',
          code: '@board demo',
          board: { terrain: [], objects: {}, startx: 1, starty: 2 },
        },
      ],
      flags: {},
    } as BOOK
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([book])

    const files = buildzedcafeexportfiles()
    const result = validatezedcafeexportpaths(files)
    expect(result.ok).toBe(true)
    expect(() => assertzedcafeexportvalid(files)).not.toThrow()
    expect(files.some((file) => file.path.includes('demo-book1'))).toBe(true)
    expect(files.some((file) => file.path.includes('demo-page1'))).toBe(true)
  })
})
