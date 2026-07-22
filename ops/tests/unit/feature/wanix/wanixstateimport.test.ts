import {
  assembleboardjson,
  assemblecodepagejson,
  parsezedcafeexportfiles,
} from 'zss/feature/wanix/wanixstateimport'
import {
  buildzedcafecodepagefiles,
  buildzedcafeexportfiles,
  splitboardexport,
} from 'zss/feature/wanix/wanixstateexport'
import type { CODE_PAGE } from 'zss/memory/types'

jest.mock('zss/device/wanixclient/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
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

function decodefilebytes(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(bytes))
}

describe('wanixstateimport', () => {
  it('assembleboardjson merges board terrain array and objects', () => {
    const terrain = Array.from({ length: 1500 }, () => ({ kind: 'solid' }))
    terrain[0] = { kind: 'fake' }
    const boardfiles = splitboardexport({
      terrain,
      objects: { obj1: { kind: 'player', id: 'obj1' } },
      startx: 3,
      starty: 4,
    })
    const index = new Map<string, Uint8Array>()
    for (let i = 0; i < boardfiles.length; ++i) {
      const file = boardfiles[i]!
      index.set(`b1/p1/${file.path}`, file.bytes)
    }
    const board = assembleboardjson(index, 'b1/p1')
    expect(board?.startx).toBe(3)
    expect(board?.starty).toBe(4)
    expect(board?.objects).toEqual({ obj1: { kind: 'player', id: 'obj1' } })
    expect((board?.terrain as unknown[])[0]).toEqual({ kind: 'fake' })
    expect((board?.terrain as unknown[]).length).toBe(1500)
  })

  it('assembleboardjson rejects per-cell terrain files', () => {
    const index = new Map<string, Uint8Array>([
      [
        'b1/p1/board/terrain/0.json',
        new TextEncoder().encode('{"kind":"solid"}\n'),
      ],
    ])
    expect(() => assembleboardjson(index, 'b1/p1')).toThrow(
      /wipe\/re-seed remotes/,
    )
  })

  it('assembleboardjson always includes objects even when empty', () => {
    const boardfiles = splitboardexport({
      startx: 1,
      starty: 2,
    })
    const index = new Map<string, Uint8Array>()
    for (let i = 0; i < boardfiles.length; ++i) {
      const file = boardfiles[i]!
      index.set(`b1/p1/${file.path}`, file.bytes)
    }
    const board = assembleboardjson(index, 'b1/p1')
    expect(board.objects).toEqual({})
  })

  it('assembleboardjson omits pid_* player object files', () => {
    const index = new Map<string, Uint8Array>([
      [
        'b1/p1/board/objects/npc1.json',
        new TextEncoder().encode('{"id":"npc1","kind":"object"}\n'),
      ],
      [
        'b1/p1/board/objects/pid_1.json',
        new TextEncoder().encode('{"id":"pid_1","kind":"player"}\n'),
      ],
      [
        'b1/p1/board/stats.json',
        new TextEncoder().encode('{"startx":1,"starty":2}\n'),
      ],
    ])
    const board = assembleboardjson(index, 'b1/p1')
    expect(board?.objects).toEqual({ npc1: { id: 'npc1', kind: 'object' } })
  })

  it('round-trips granular export layout', () => {
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
    }
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([book])

    const exported = buildzedcafeexportfiles()
    const parsed = parsezedcafeexportfiles(exported)
    expect(parsed.books).toHaveLength(1)
    expect(parsed.books[0]?.pages).toHaveLength(2)

    const page1 = assemblecodepagejson(
      new Map(exported.map((file) => [file.path, file.bytes])),
      'demo-book1/demo-page1',
    )
    expect(page1?.code).toBe('@board demo')
    expect(page1?.board).toEqual({
      startx: 10,
      starty: 12,
      objects: {},
    })

    const page2 = assemblecodepagejson(
      new Map(exported.map((file) => [file.path, file.bytes])),
      'demo-book1/player-page2',
    )
    expect(page2?.object).toEqual({ kind: 'player', char: 2 })
  })

  it('reads guestTouch from root stats.json', () => {
    const files = buildzedcafeexportfiles()
    const root = files.find((file) => file.path === 'stats.json')
    expect(root).toBeDefined()
    const stats = decodefilebytes(root!.bytes) as Record<string, unknown>
    stats.guestTouch = true
    root!.bytes = new TextEncoder().encode(`${JSON.stringify(stats)}\n`)
    const parsed = parsezedcafeexportfiles(files)
    expect(parsed.guestTouch).toBe(true)
  })
})
