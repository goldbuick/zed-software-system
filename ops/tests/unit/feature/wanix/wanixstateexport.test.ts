import {
  buildzedcafebookmeta,
  buildzedcafecodepagefiles,
  buildzedcafeexportfiles,
  buildzedcafestats,
  checkzedcafeexportontick,
  decodezedcafejsonpointer,
  primezedcafeexportshadow,
  readzedcafeexportstatscontentready,
  readzedcafeexportupsertpaths,
  resetwanixstateexportfortest,
  splitboardexport,
  zedcafeexportfilestodoc,
} from 'zss/feature/wanix/wanixstateexport'
import {
  resetwanixzedcafesessionfortest,
  setzedcafepollactive,
} from 'zss/feature/wanix/wanixzedcafesession'
import type { BOOK, CODE_PAGE } from 'zss/memory/types'
import { compare } from 'fast-json-patch'

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  wanixexportstate: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
}))

jest.mock('zss/feature/wanix/wanixzedcafe', () => ({
  pushzedcafesynctoiframe: jest.fn().mockResolvedValue(true),
  readhostexportfilesasync: jest.fn().mockResolvedValue([
    {
      path: 'stats.json',
      bytes: new TextEncoder().encode('{"bookCount":0,"books":[]}\n'),
    },
  ]),
  markwanixzedcafependingexport: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbooklist: jest.fn(() => []),
  memoryreadoperator: jest.fn(() => 'player1'),
  memoryreadroot: jest.fn(() => ({ books: {} })),
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
import { pushzedcafesynctoiframe } from 'zss/feature/wanix/wanixzedcafe'

const mocksync = pushzedcafesynctoiframe as jest.Mock

function decodefilebytes(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(bytes))
}

function makeboardbook(terrain: unknown[] = []): BOOK {
  const boardpage = {
    id: 'page1',
    code: '@board demo',
    board: {
      terrain,
      objects: {},
      startx: 10,
      starty: 12,
    },
  } as CODE_PAGE & { board: Record<string, unknown> }
  return {
    id: 'book1',
    name: 'demo',
    token: 'tok',
    timestamp: 1,
    activelist: [],
    pages: [boardpage],
    flags: {},
  } as BOOK
}

describe('wanixstateexport', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetwanixzedcafesessionfortest()
    resetwanixstateexportfortest()
  })

  it('builds session stats for empty book list', () => {
    const stats = buildzedcafestats([])
    expect(stats.bookCount).toBe(0)
    expect(stats.books).toEqual([])
    expect(typeof stats.exportedAt).toBe('string')
  })

  it('readzedcafeexportstatscontentready rejects empty and accepts host stats', () => {
    expect(readzedcafeexportstatscontentready(new Uint8Array())).toBe(false)
    expect(
      readzedcafeexportstatscontentready(
        new TextEncoder().encode('{"bookCount":0}\n'),
      ),
    ).toBe(false)
    const ready = new TextEncoder().encode(
      `${JSON.stringify(buildzedcafestats([]), null, 2)}\n`,
    )
    expect(readzedcafeexportstatscontentready(ready)).toBe(true)
  })

  it('splitboardexport peels terrain, objects, and stats', () => {
    const files = splitboardexport({
      terrain: [{ kind: 'solid' }],
      objects: { obj1: { kind: 'player', id: 'obj1' } },
      startx: 1,
      starty: 2,
    })
    expect(files.map((file) => file.path)).toEqual([
      'board/terrain.json',
      'board/stats.json',
      'board/objects/obj1.json',
    ])
    expect(decodefilebytes(files[1]!.bytes)).toEqual({ startx: 1, starty: 2 })
  })

  it('builds granular export paths from books', () => {
    const boardpage = {
      id: 'page1',
      code: '@board demo',
      board: {
        terrain: [],
        objects: {},
        startx: 10,
        starty: 12,
      },
    } as CODE_PAGE & { board: Record<string, unknown> }
    const objectpage = {
      id: 'page2',
      code: '@object player',
      object: { kind: 'player', char: 2 },
    } as CODE_PAGE & { object: Record<string, unknown> }
    const book = {
      id: 'book1',
      name: 'demo',
      token: 'tok',
      timestamp: 1,
      activelist: [],
      pages: [boardpage, objectpage],
      flags: {},
    } as BOOK
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([book])

    const files = buildzedcafeexportfiles()
    expect(files[0]?.path).toBe('stats.json')

    const bookmeta = files.find(
      (file) => file.path === 'demo-book1/stats.json',
    )
    expect(bookmeta).toBeDefined()
    const bookjson = decodefilebytes(bookmeta!.bytes) as {
      pages: { id: string; type: string }[]
      code?: string
    }
    expect(bookjson.pages).toEqual([
      { id: 'page1', type: 'board', name: 'demo' },
      { id: 'page2', type: 'object', name: 'player' },
    ])
    expect(bookjson.code).toBeUndefined()

    expect(
      files.some(
        (file) => file.path === 'demo-book1/demo-page1/stats.json',
      ),
    ).toBe(true)
    expect(
      files.some(
        (file) =>
          file.path === 'demo-book1/demo-page1/board/terrain.json',
      ),
    ).toBe(true)
    expect(
      files.some(
        (file) =>
          file.path === 'demo-book1/demo-page1/board/stats.json',
      ),
    ).toBe(true)
    expect(
      files.some(
        (file) =>
          file.path === 'demo-book1/player-page2/object/element.json',
      ),
    ).toBe(true)
    expect(
      files.some((file) => file.path === 'demo-book1/demo-page1.json'),
    ).toBe(false)
    expect(files.some((file) => file.path === 'demo-book1/book.json')).toBe(
      false,
    )
  })

  it('buildzedcafebookmeta indexes pages without code bodies', () => {
    const book = {
      id: 'book1',
      name: 'demo',
      token: 'tok',
      timestamp: 1,
      activelist: [],
      pages: [{ id: 'page1', code: '@board title' }],
      flags: {},
    } as BOOK
    const meta = buildzedcafebookmeta(book)
    expect(meta.pages).toEqual([{ id: 'page1', type: 'board', name: 'title' }])
    expect(meta).not.toHaveProperty('code')
  })

  it('buildzedcafecodepagefiles emits page stats and object payload', () => {
    const book = {
      id: 'book1',
      name: 'demo',
      token: 'tok',
      timestamp: 1,
      activelist: [],
      pages: [],
      flags: {},
    } as BOOK
    const page = {
      id: 'page2',
      code: '@object gem',
      object: { kind: 'gem', char: 4 },
    } as CODE_PAGE & { object: Record<string, unknown> }
    const files = buildzedcafecodepagefiles(book, page)
    expect(files.map((file) => file.path)).toEqual([
      'demo-book1/gem-page2/stats.json',
      'demo-book1/gem-page2/object/element.json',
    ])
  })

  it('decodezedcafejsonpointer unescapes path keys with slashes', () => {
    expect(decodezedcafejsonpointer('/demo-book1~1page~1board~1terrain.json/0')).toEqual([
      'demo-book1/page/board/terrain.json',
      '0',
    ])
  })

  it('readzedcafeexportupsertpaths maps nested ops to file paths', () => {
    const paths = readzedcafeexportupsertpaths([
      {
        op: 'replace',
        path: '/demo-book1~1demo-page1~1board~1terrain.json/0/char',
        value: 177,
      },
      { op: 'remove', path: '/gone.json' },
    ])
    expect([...paths]).toEqual([
      'demo-book1/demo-page1/board/terrain.json',
    ])
  })

  it('checkzedcafeexportontick no-ops when poll inactive or shadow matches', () => {
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([])
    checkzedcafeexportontick({ emit: jest.fn() } as never)
    expect(mocksync).not.toHaveBeenCalled()

    setzedcafepollactive(true)
    primezedcafeexportshadow(buildzedcafeexportfiles())
    checkzedcafeexportontick({ emit: jest.fn() } as never)
    expect(mocksync).not.toHaveBeenCalled()
  })

  it('checkzedcafeexportontick pushes only changed files', async () => {
    const book = makeboardbook([])
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([book])
    setzedcafepollactive(true)
    primezedcafeexportshadow(buildzedcafeexportfiles())

    const terrainpath = 'demo-book1/demo-page1/board/terrain.json'
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([
      makeboardbook([{ kind: 'solid', char: 177 }]),
    ])

    checkzedcafeexportontick({ emit: jest.fn() } as never)
    await Promise.resolve()
    await Promise.resolve()

    expect(mocksync).toHaveBeenCalledTimes(1)
    const pushed = mocksync.mock.calls[0][2] as { path: string }[]
    const options = mocksync.mock.calls[0][3] as {
      partial?: boolean
      nextdoc?: Record<string, unknown>
    }
    expect(options.partial).toBe(true)
    expect(pushed.map((file) => file.path)).toEqual([terrainpath])
    expect(options.nextdoc?.[terrainpath]).toEqual([
      { kind: 'solid', char: 177 },
    ])
  })

  it('zedcafeexportfilestodoc strips volatile exportedAt for compare', () => {
    const a = zedcafeexportfilestodoc([
      {
        path: 'stats.json',
        bytes: new TextEncoder().encode(
          '{"exportedAt":"t1","bookCount":0,"books":[]}\n',
        ),
      },
    ])
    const b = zedcafeexportfilestodoc([
      {
        path: 'stats.json',
        bytes: new TextEncoder().encode(
          '{"exportedAt":"t2","bookCount":0,"books":[]}\n',
        ),
      },
    ])
    expect(compare(a, b)).toEqual([])
  })
})
