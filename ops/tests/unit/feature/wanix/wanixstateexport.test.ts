import {
  buildzedcafebookmeta,
  buildzedcafecodepagefiles,
  buildzedcafeexportfiles,
  buildzedcafestats,
  resetwanixstateexportfortest,
  schedulewanixexport,
  splitboardexport,
} from 'zss/feature/wanix/wanixstateexport'
import type { BOOK, CODE_PAGE } from 'zss/memory/types'

jest.mock('zss/device/api', () => ({
  wanixexportstate: jest.fn(),
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

import { wanixexportstate } from 'zss/device/api'
import { memoryreadbooklist } from 'zss/memory/session'

const exportmock = wanixexportstate as jest.Mock

function decodefilebytes(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(bytes))
}

describe('wanixstateexport', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetwanixstateexportfortest()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('builds session stats for empty book list', () => {
    const stats = buildzedcafestats([])
    expect(stats.bookCount).toBe(0)
    expect(stats.books).toEqual([])
    expect(typeof stats.exportedAt).toBe('string')
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

    const bookmeta = files.find((file) => file.path === 'books/book1/stats.json')
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
      files.some((file) => file.path === 'books/book1/pages/page1/stats.json'),
    ).toBe(true)
    expect(
      files.some((file) => file.path === 'books/book1/pages/page1/board/terrain.json'),
    ).toBe(true)
    expect(
      files.some((file) => file.path === 'books/book1/pages/page1/board/stats.json'),
    ).toBe(true)
    expect(
      files.some((file) => file.path === 'books/book1/pages/page2/object/element.json'),
    ).toBe(true)
    expect(
      files.some((file) => file.path === 'books/book1/pages/page1.json'),
    ).toBe(false)
    expect(files.some((file) => file.path === 'books/book1/book.json')).toBe(false)
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
    const page = {
      id: 'page2',
      code: '@object gem',
      object: { kind: 'gem', char: 4 },
    } as CODE_PAGE & { object: Record<string, unknown> }
    const files = buildzedcafecodepagefiles('book1', page)
    expect(files.map((file) => file.path)).toEqual([
      'books/book1/pages/page2/stats.json',
      'books/book1/pages/page2/object/element.json',
    ])
  })

  it('debounces export requests', () => {
    schedulewanixexport({ emit: jest.fn() } as any, 'player1')
    schedulewanixexport({ emit: jest.fn() } as any, 'player1')
    expect(exportmock).not.toHaveBeenCalled()
    jest.advanceTimersByTime(2000)
    expect(exportmock).toHaveBeenCalledTimes(1)
  })
})
