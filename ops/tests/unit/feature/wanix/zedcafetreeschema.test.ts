import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  assertzedcafeexportvalid,
  isallowedexportpath,
  kebabcasezedcafedirname,
  kebabcasezedcafenameportion,
  validatezedcafeexportpaths,
  ZED_CAFE_EXPORT_ALLOWED_PATH,
} from 'zss/feature/wanix/zedcafetreeschema'
import {
  buildzedcafebookflagfiles,
  buildzedcafeexportfiles,
} from 'zss/feature/wanix/wanixstateexport'
import type { BOOK, CODE_PAGE } from 'zss/memory/types'

jest.mock('zss/device/wanixclient/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
}))

jest.mock('zss/memory/bookoperations', () => ({
  memoryreadbookflags: jest.fn((_book: unknown, name: string) => ({
    owner: name,
  })),
}))

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

  it('rejects dirname ids that contain .. or end with a dot', () => {
    expect(() => kebabcasezedcafedirname('key', 'sid_zSjwtyZcRFN.')).toThrow(
      /filename-safe/,
    )
    expect(() => kebabcasezedcafedirname('key', 'sid_a..b')).toThrow(
      /filename-safe/,
    )
    expect(kebabcasezedcafedirname('key', 'sid_8FzEX_FvcYV1')).toBe(
      'key-sid_8FzEX_FvcYV1',
    )
  })

  it('rejects sim-only flag paths', () => {
    expect(isallowedexportpath('demo-b1/flags/pid_1.json')).toBe(true)
    expect(isallowedexportpath('demo-b1/flags/pid_1_chip.json')).toBe(false)
    expect(isallowedexportpath('demo-b1/flags/pid_1_gadget.json')).toBe(false)
    expect(isallowedexportpath('demo-b1/flags/board1_synth.json')).toBe(false)
    expect(isallowedexportpath('demo-b1/flags/board1_layers.json')).toBe(false)
    expect(isallowedexportpath('demo-b1/flags/board1_tracking.json')).toBe(false)
    const blocked = validatezedcafeexportpaths([
      {
        path: 'demo-b1/flags/pid_1_chip.json',
        bytes: encodetext('{}'),
      },
    ])
    expect(blocked.ok).toBe(false)
    expect(
      blocked.errors.some((err) => err.includes('path outside schema')),
    ).toBe(true)
  })

  it('omits sim-only flags from buildzedcafebookflagfiles', () => {
    const book = {
      id: 'book1',
      name: 'demo',
      token: 'tok',
      timestamp: 1,
      activelist: [],
      pages: [],
      flags: {
        pid_1: 'pid_1',
        pid_1_chip: 'pid_1_chip',
        board1_synth: 'board1_synth',
      },
    } as BOOK
    const files = buildzedcafebookflagfiles(book)
    expect(files.map((file) => file.path)).toEqual(['demo-book1/flags/pid_1.json'])
  })

  it('rejects paths outside schema', () => {
    const result = validatezedcafeexportpaths([
      { path: '../stats.json', bytes: encodetext('{}') },
      { path: 'foo/bar.json', bytes: encodetext('{}') },
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

  it('matches guest fs allowlist json fixture', () => {
    const jsonpath = join(
      process.cwd(),
      'ops/fixtures/wanix/zedcafe/allowed-path-patterns.json',
    )
    const patterns = JSON.parse(readFileSync(jsonpath, 'utf8')) as string[]
    expect(patterns.length).toBe(ZED_CAFE_EXPORT_ALLOWED_PATH.length)
    const probes = [
      'stats.json',
      'demo-book1/stats.json',
      'demo-book1/flags/pid_1.json',
      'demo-book1/demo-page1/board/terrain.json',
      'demo-book1/demo-page1/board/terrain/0.json',
      'demo-book1/demo-page1/board/objects/obj1.json',
      'evil.txt',
      'foo/bar.json',
    ]
    for (let i = 0; i < patterns.length; ++i) {
      const ts = ZED_CAFE_EXPORT_ALLOWED_PATH[i]!
      const go = new RegExp(patterns[i]!)
      for (const probe of probes) {
        expect(go.test(probe)).toBe(ts.test(probe))
      }
    }
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
