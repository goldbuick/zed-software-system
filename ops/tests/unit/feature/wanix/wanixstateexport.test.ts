import {
  acknowledgezedcafeexportpush,
  buildzedcafebookmeta,
  buildzedcafecodepagefiles,
  buildzedcafeexportfiles,
  buildzedcafestats,
  bumpexportrevision,
  checkzedcafeexportontick,
  decodezedcafejsonpointer,
  filterzedcafeexportpathsagainstsimdirty,
  forcezedcafeexportcoalesceclosedfortest,
  forcezedcafeexportcoalesceopenfortest,
  iszedcafeexportpathsimdirty,
  markzedcafeexportpathdirty,
  markzedcafeexportstructuraldirty,
  primezedcafeexportshadow,
  readexportrevision,
  readzedcafeexportdirtygensfortest,
  readzedcafeexportpageprefix,
  readzedcafeexportpendingdirty,
  readzedcafeexportremovepaths,
  readzedcafeexportstatscontentready,
  readzedcafeexportupsertpaths,
  resetwanixstateexportfortest,
  splitboardexport,
  zedcafeexportdoctofiles,
  zedcafeexportfilestodoc,
} from 'zss/feature/wanix/wanixstateexport'
import {
  resetwanixzedcafesessionfortest,
  setlasthostpushdoc,
  setzedcafepollactive,
} from 'zss/device/wanixclient/state'
import type { BOOK, CODE_PAGE } from 'zss/memory/types'
import { compare } from 'fast-json-patch'

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  wanixexportstate: jest.fn(),
}))

jest.mock('zss/device/wanixclient/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
}))

jest.mock('zss/device/wanixclient/wanixzedcafe', () => ({
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
import { pushzedcafesynctoiframe } from 'zss/device/wanixclient/wanixzedcafe'

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

function maketwoboardbook(terrain1: unknown[], terrain2: unknown[]): BOOK {
  const boardpage1 = {
    id: 'page1',
    code: '@board demo',
    board: {
      terrain: terrain1,
      objects: {},
      startx: 10,
      starty: 12,
    },
  } as CODE_PAGE & { board: Record<string, unknown> }
  const boardpage2 = {
    id: 'page2',
    code: '@board demo2',
    board: {
      terrain: terrain2,
      objects: {},
      startx: 1,
      starty: 1,
    },
  } as CODE_PAGE & { board: Record<string, unknown> }
  return {
    id: 'book1',
    name: 'demo',
    token: 'tok',
    timestamp: 1,
    activelist: [],
    pages: [boardpage1, boardpage2],
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

  it('splitboardexport peels terrain array, objects, and stats', () => {
    const terrain = Array.from({ length: 1500 }, () => ({ kind: 'solid' }))
    terrain[0] = { kind: 'fake' }
    const files = splitboardexport({
      terrain,
      objects: { obj1: { kind: 'player', id: 'obj1' } },
      startx: 1,
      starty: 2,
    })
    expect(files[0]?.path).toBe('board/terrain.json')
    expect(files.some((file) => file.path === 'board/terrain/0.json')).toBe(
      false,
    )
    expect(files.some((file) => file.path === 'board/stats.json')).toBe(true)
    expect(files.some((file) => file.path === 'board/objects/obj1.json')).toBe(
      true,
    )
    expect(decodefilebytes(files[0]!.bytes)).toEqual(terrain)
  })

  it('splitboardexport omits pid_* player objects', () => {
    const files = splitboardexport({
      objects: {
        pid_1: { kind: 'player', id: 'pid_1' },
        npc1: { kind: 'object', id: 'npc1' },
      },
      startx: 1,
      starty: 2,
    })
    expect(files.some((file) => file.path === 'board/objects/npc1.json')).toBe(
      true,
    )
    expect(files.some((file) => file.path === 'board/objects/pid_1.json')).toBe(
      false,
    )
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
    ).toBe(false)
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

  it('buildzedcafebookmeta indexes pages without code, flags, or timestamp', () => {
    const book = {
      id: 'book1',
      name: 'demo',
      token: 'tok',
      timestamp: 1,
      activelist: [],
      pages: [{ id: 'page1', code: '@board title' }],
      flags: { pid_1: 'boundary' },
    } as BOOK
    const meta = buildzedcafebookmeta(book)
    expect(meta.pages).toEqual([{ id: 'page1', type: 'board', name: 'title' }])
    expect(meta).not.toHaveProperty('code')
    expect(meta).not.toHaveProperty('flags')
    expect(meta).not.toHaveProperty('timestamp')
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
    expect(
      decodezedcafejsonpointer('/demo-book1~1page~1board~1terrain.json/0/char'),
    ).toEqual(['demo-book1/page/board/terrain.json', '0', 'char'])
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

  it('readzedcafeexportremovepaths collects top-level removes only', () => {
    const paths = readzedcafeexportremovepaths([
      { op: 'remove', path: '/demo-book1~1demo-page1~1board~1objects~1oid.json' },
      {
        op: 'remove',
        path: '/demo-book1~1demo-page1~1board~1terrain.json',
      },
      { op: 'replace', path: '/stats.json/bookCount', value: 0 },
    ])
    expect([...paths].sort()).toEqual([
      'demo-book1/demo-page1/board/objects/oid.json',
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

  it('checkzedcafeexportontick skips build when dirty generation unchanged', () => {
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([])
    setzedcafepollactive(true)
    primezedcafeexportshadow(buildzedcafeexportfiles())
    const before = readzedcafeexportdirtygensfortest()
    checkzedcafeexportontick({ emit: jest.fn() } as never)
    expect(mocksync).not.toHaveBeenCalled()
    expect(readzedcafeexportdirtygensfortest()).toEqual(before)
  })

  it('checkzedcafeexportontick pushes changed terrain array once', async () => {
    const terrain = Array.from({ length: 1500 }, () => ({ kind: 'fake' }))
    const book = makeboardbook(terrain)
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([book])
    setzedcafepollactive(true)
    primezedcafeexportshadow(buildzedcafeexportfiles())

    const next = Array.from({ length: 1500 }, () => ({ kind: 'fake' }))
    next[0] = { kind: 'solid', char: 177 }
    const terrainpath = 'demo-book1/demo-page1/board/terrain.json'
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([makeboardbook(next)])
    markzedcafeexportpathdirty(terrainpath)
    forcezedcafeexportcoalesceopenfortest()

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
    expect(options.nextdoc?.[terrainpath]).toEqual(next)
  })

  it('single dirty terrain path flushes immediately (no coalesce wait)', async () => {
    const terrain = Array.from({ length: 1500 }, () => ({ kind: 'fake' }))
    const book = makeboardbook(terrain)
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([book])
    setzedcafepollactive(true)
    primezedcafeexportshadow(buildzedcafeexportfiles())

    const next = Array.from({ length: 1500 }, () => ({ kind: 'fake' }))
    next[0] = { kind: 'solid', char: 177 }
    const terrainpath = 'demo-book1/demo-page1/board/terrain.json'
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([makeboardbook(next)])
    markzedcafeexportpathdirty(terrainpath)
    // Force the coalesce window "closed" — a single dirty path still flushes
    // immediately (WANIX_ZEDCAFE_EXPORT_COALESCE_SINGLE_MS = 0).
    forcezedcafeexportcoalesceclosedfortest()

    checkzedcafeexportontick({ emit: jest.fn() } as never)
    await Promise.resolve()
    await Promise.resolve()

    expect(mocksync).toHaveBeenCalledTimes(1)
    const options = mocksync.mock.calls[0][3] as {
      nextdoc?: Record<string, unknown>
    }
    expect(options.nextdoc?.[terrainpath]).toEqual(next)
  })

  it('coalesces repeated multi-terrain dirties into one flush', async () => {
    const terrain1 = Array.from({ length: 1500 }, () => ({ kind: 'fake' }))
    const terrain2 = Array.from({ length: 1500 }, () => ({ kind: 'fake' }))
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([
      maketwoboardbook(terrain1, terrain2),
    ])
    setzedcafepollactive(true)
    primezedcafeexportshadow(buildzedcafeexportfiles())
    forcezedcafeexportcoalesceclosedfortest()

    const terrainpath1 = 'demo-book1/demo-page1/board/terrain.json'
    const terrainpath2 = 'demo-book1/demo2-page2/board/terrain.json'

    const mid1 = Array.from({ length: 1500 }, () => ({ kind: 'fake' }))
    mid1[0] = { kind: 'mid' }
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([
      maketwoboardbook(mid1, terrain2),
    ])
    markzedcafeexportpathdirty(terrainpath1)
    markzedcafeexportpathdirty(terrainpath2)
    checkzedcafeexportontick({ emit: jest.fn() } as never)
    expect(mocksync).not.toHaveBeenCalled()

    const next1 = Array.from({ length: 1500 }, () => ({ kind: 'fake' }))
    next1[0] = { kind: 'final', char: 177 }
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([
      maketwoboardbook(next1, terrain2),
    ])
    markzedcafeexportpathdirty(terrainpath1)
    forcezedcafeexportcoalesceopenfortest()
    checkzedcafeexportontick({ emit: jest.fn() } as never)
    await Promise.resolve()
    await Promise.resolve()

    expect(mocksync).toHaveBeenCalledTimes(1)
    const options = mocksync.mock.calls[0][3] as {
      nextdoc?: Record<string, unknown>
    }
    expect(options.nextdoc?.[terrainpath1]).toEqual(next1)
  })

  it('structural dirty survives in-flight rejection until next open window', async () => {
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([])
    setzedcafepollactive(true)
    primezedcafeexportshadow(buildzedcafeexportfiles())
    markzedcafeexportstructuraldirty()
    forcezedcafeexportcoalesceopenfortest()
    const gens = readzedcafeexportdirtygensfortest()
    expect(gens.structural).toBe(true)
    expect(gens.dirty).toBeGreaterThan(gens.ack)
  })

  it('timestamp-only book ticks do not upsert book stats.json', async () => {
    const book = {
      id: 'book1',
      name: 'demo',
      token: 'tok',
      timestamp: 1,
      activelist: [],
      pages: [],
      flags: {},
    } as BOOK
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([book])
    setzedcafepollactive(true)
    primezedcafeexportshadow(buildzedcafeexportfiles())
    book.timestamp = 999
    checkzedcafeexportontick({ emit: jest.fn() } as never)
    await Promise.resolve()
    expect(mocksync).not.toHaveBeenCalled()
  })

  it('checkzedcafeexportontick pushes removepaths when files disappear', async () => {
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([])
    setzedcafepollactive(true)
    const emptyfiles = buildzedcafeexportfiles()
    const emptydoc = zedcafeexportfilestodoc(emptyfiles)
    const orphan = 'demo-book1/demo-page1/board/objects/oid.json'
    setlasthostpushdoc({
      ...emptydoc,
      [orphan]: { id: 'oid' },
    })

    checkzedcafeexportontick({ emit: jest.fn() } as never)
    await Promise.resolve()
    await Promise.resolve()

    expect(mocksync).toHaveBeenCalledTimes(1)
    const pushed = mocksync.mock.calls[0][2] as { path: string }[]
    const options = mocksync.mock.calls[0][3] as {
      partial?: boolean
      removepaths?: string[]
    }
    expect(pushed).toEqual([])
    expect(options.partial).toBe(true)
    expect(options.removepaths).toEqual([orphan])
  })

  it('exportRevision starts at 0, bumps monotonically, and resets for test', () => {
    expect(readexportrevision()).toBe(0)
    expect(bumpexportrevision()).toBe(1)
    expect(bumpexportrevision()).toBe(2)
    expect(readexportrevision()).toBe(2)
    resetwanixstateexportfortest()
    expect(readexportrevision()).toBe(0)
  })

  it('buildzedcafestats includes current exportRevision', () => {
    bumpexportrevision()
    bumpexportrevision()
    const stats = buildzedcafestats([])
    expect(stats.exportRevision).toBe(2)
  })

  it('acknowledgezedcafeexportpush bumps exportRevision', () => {
    expect(readexportrevision()).toBe(0)
    acknowledgezedcafeexportpush()
    expect(readexportrevision()).toBe(1)
    acknowledgezedcafeexportpush()
    expect(readexportrevision()).toBe(2)
  })

  it('zedcafeexportdoctofiles stamps stats.json with current exportRevision', () => {
    bumpexportrevision()
    bumpexportrevision()
    bumpexportrevision()
    const files = zedcafeexportdoctofiles({
      'stats.json': { bookCount: 0, books: [] },
    })
    const stats = decodefilebytes(files[0]!.bytes) as {
      exportRevision?: number
    }
    expect(stats.exportRevision).toBe(3)
  })

  it('stripstatsexportedat-equivalent compare ignores exportedAt but keeps exportRevision diffs', () => {
    const a = zedcafeexportfilestodoc([
      {
        path: 'stats.json',
        bytes: new TextEncoder().encode(
          '{"exportedAt":"t1","exportRevision":1,"bookCount":0,"books":[]}\n',
        ),
      },
    ])
    const b = zedcafeexportfilestodoc([
      {
        path: 'stats.json',
        bytes: new TextEncoder().encode(
          '{"exportedAt":"t2","exportRevision":2,"bookCount":0,"books":[]}\n',
        ),
      },
    ])
    expect(compare(a, b)).not.toEqual([])
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

  it('readzedcafeexportpageprefix covers board and flags paths', () => {
    expect(
      readzedcafeexportpageprefix('demo-book1/demo-page1/board/terrain.json'),
    ).toBe('demo-book1/demo-page1/')
    expect(readzedcafeexportpageprefix('demo-book1/flags/pid_1.json')).toBe(
      'demo-book1/flags/',
    )
    expect(readzedcafeexportpageprefix('stats.json')).toBeUndefined()
  })

  it('iszedcafeexportpathsimdirty protects page siblings of dirty terrain', () => {
    const pending = {
      structural: false,
      paths: ['demo-book1/demo-page1/board/terrain.json'],
    }
    expect(
      iszedcafeexportpathsimdirty(
        'demo-book1/demo-page1/board/terrain.json',
        pending,
      ),
    ).toBe(true)
    expect(
      iszedcafeexportpathsimdirty(
        'demo-book1/demo-page1/board/stats.json',
        pending,
      ),
    ).toBe(true)
    expect(
      iszedcafeexportpathsimdirty('demo-book1/other-page/board/terrain.json', pending),
    ).toBe(false)
    expect(
      iszedcafeexportpathsimdirty('other.json', { structural: true, paths: [] }),
    ).toBe(true)
  })

  it('filterzedcafeexportpathsagainstsimdirty drops protected paths', () => {
    const { keep, skipped } = filterzedcafeexportpathsagainstsimdirty(
      [
        'demo-book1/demo-page1/board/terrain.json',
        'demo-book1/other/stats.json',
      ],
      {
        structural: false,
        paths: ['demo-book1/demo-page1/board/terrain.json'],
      },
    )
    expect(skipped).toEqual(['demo-book1/demo-page1/board/terrain.json'])
    expect(keep).toEqual(['demo-book1/other/stats.json'])
  })

  it('primezedcafeexportshadow retainpendingdirty keeps dirty gens', () => {
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([])
    primezedcafeexportshadow(buildzedcafeexportfiles())
    markzedcafeexportpathdirty('demo-book1/demo-page1/board/terrain.json')
    const before = readzedcafeexportpendingdirty()
    expect(before.pending).toBe(true)
    primezedcafeexportshadow(buildzedcafeexportfiles(), {
      retainpendingdirty: true,
    })
    const after = readzedcafeexportpendingdirty()
    expect(after.pending).toBe(true)
    expect(after.paths).toEqual(before.paths)
    expect(readzedcafeexportdirtygensfortest().dirty).toBe(
      readzedcafeexportdirtygensfortest().dirty,
    )
  })
})
