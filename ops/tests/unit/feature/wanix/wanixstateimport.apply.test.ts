const flagbags = new Map<string, Record<string, unknown>>()
const boards = new Map<string, {
  id: string
  terrain: unknown[]
  objects: Record<string, Record<string, unknown>>
  [key: string]: unknown
}>()

jest.mock('zss/memory/boundaries', () => ({
  memoryboundarydelete: jest.fn((id: string) => {
    flagbags.delete(id)
  }),
}))

jest.mock('zss/memory/bookoperations', () => ({
  memoryimportbookfromjson: jest.fn((flat: { id: string; pages: unknown[] }) => ({
    id: flat.id,
    name: 'imported',
    token: '',
    timestamp: 0,
    activelist: [],
    flags: {},
    pages: flat.pages ?? [],
  })),
  memoryupsertcodepage: jest.fn(() => true),
  memoryclearbookcodepage: jest.fn(() => ({ id: 'removed' })),
  memoryclearbookflags: jest.fn((_book: unknown, id: string) => {
    flagbags.set(id, {})
  }),
  memoryreadbookflags: jest.fn((_book: unknown, id: string) => {
    if (!flagbags.has(id)) {
      flagbags.set(id, {})
    }
    return flagbags.get(id)!
  }),
  memoryreadcodepage: jest.fn(
    (book: { pages: { id: string }[] }, id: string) =>
      book.pages.find((page) => page.id === id),
  ),
}))

jest.mock('zss/memory/boardlifecycle', () => ({
  memorycreateboardobject: jest.fn(
    (
      board: { objects: Record<string, Record<string, unknown>> },
      from: Record<string, unknown>,
    ) => {
      const id = String(from.id ?? 'obj')
      board.objects[id] = { ...from, id }
      return board.objects[id]
    },
  ),
  memorydeleteboardobject: jest.fn(
    (board: { objects: Record<string, unknown> }, id: string) => {
      if (!(id in board.objects)) {
        return false
      }
      delete board.objects[id]
      return true
    },
  ),
}))

jest.mock('zss/memory/codepageoperations', () => {
  const actual = jest.requireActual(
    'zss/memory/codepageoperations',
  ) as typeof import('zss/memory/codepageoperations')
  return {
    ...actual,
    memoryreadcodepagedata: jest.fn((page: { id: string }) =>
      boards.get(page.id),
    ),
    memoryreadcodepageruntime: jest.fn((page: { id: string }) => ({
      board: boards.get(page.id),
    })),
  }
})
jest.mock('zss/memory/runtimeboundary', () => ({
  memoryreadboardruntime: jest.fn(() => ({})),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbooklist: jest.fn(() => []),
  memorywritebook: jest.fn(),
  memoryclearbook: jest.fn(),
}))

import {
  memoryclearbookcodepage,
  memoryimportbookfromjson,
  memoryreadbookflags,
  memoryupsertcodepage,
} from 'zss/memory/bookoperations'
import {
  memoryclearbook,
  memoryreadbooklist,
  memorywritebook,
} from 'zss/memory/session'
import { BOARD_SIZE } from 'zss/memory/types'
import {
  applyzedcafepartialtomemory,
  applyzedcafetomemory,
} from 'zss/feature/wanix/wanixstateimport'

const mockreadlist = memoryreadbooklist as jest.Mock
const mockwritebook = memorywritebook as jest.Mock
const mockclearbook = memoryclearbook as jest.Mock
const mockupsert = memoryupsertcodepage as jest.Mock
const mockclearpage = memoryclearbookcodepage as jest.Mock
const mockimport = memoryimportbookfromjson as jest.Mock

const encoder = new TextEncoder()

function maketerrain(char = 1) {
  return Array.from({ length: BOARD_SIZE }, () => ({ char, color: 0 }))
}

describe('applyzedcafetomemory', () => {
  beforeEach(() => {
    flagbags.clear()
    boards.clear()
    mockreadlist.mockReset()
    mockwritebook.mockReset()
    mockclearbook.mockReset()
    mockupsert.mockReset()
    mockclearpage.mockReset()
    mockimport.mockReset()
    mockupsert.mockReturnValue(true)
    mockclearpage.mockReturnValue({ id: 'removed' })
    mockimport.mockImplementation((flat: { id: string; pages: unknown[] }) => ({
      id: flat.id,
      name: 'imported',
      token: '',
      timestamp: 0,
      activelist: [],
      flags: {},
      pages: flat.pages ?? [],
    }))
  })

  it('imports new books and clears sim books missing from guest tree', () => {
    mockreadlist.mockReturnValue([
      {
        id: 'gone',
        name: 'gone',
        token: '',
        timestamp: 0,
        activelist: [],
        flags: {},
        pages: [],
      },
    ])
    const changed = applyzedcafetomemory({
      books: [
        {
          id: 'keep',
          name: 'keep',
          token: '',
          timestamp: 1,
          activelist: [],
          flags: {},
          pages: [{ id: 'p1', code: '@board a' }],
        },
      ],
    })
    expect(changed).toBe(true)
    expect(mockimport).toHaveBeenCalled()
    expect(mockwritebook).toHaveBeenCalled()
    expect(mockclearbook).toHaveBeenCalledWith('gone')
  })

  it('upserts pages and clears pages missing from guest book', () => {
    const book = {
      id: 'b1',
      name: 'b1',
      token: 't',
      timestamp: 1,
      activelist: ['pid_1'],
      flags: {},
      pages: [
        { id: 'keep', code: '@board keep' },
        { id: 'drop', code: '@board drop' },
      ],
    }
    mockreadlist.mockReturnValue([book])
    const changed = applyzedcafetomemory({
      books: [
        {
          id: 'b1',
          name: 'b1',
          token: 't2',
          timestamp: 2,
          activelist: ['pid_1'],
          flags: {},
          pages: [{ id: 'keep', code: '@board keep' }],
        },
      ],
    })
    expect(changed).toBe(true)
    expect(mockupsert).toHaveBeenCalled()
    expect(mockclearpage).toHaveBeenCalledWith(book, 'drop')
    expect(book.activelist).toEqual(['pid_1'])
    expect(book.token).toBe('t2')
  })

  it('applies folderized player flags onto an existing book', () => {
    const book = {
      id: 'b1',
      name: 'b1',
      token: 't',
      timestamp: 5,
      activelist: ['pid_1'],
      flags: { pid_1: 'pid_1' },
      pages: [],
    }
    flagbags.set('pid_1', { ammo: 0, health: 100 })
    mockreadlist.mockReturnValue([book])
    const changed = applyzedcafetomemory({
      books: [
        {
          id: 'b1',
          name: 'b1',
          token: 't',
          timestamp: 0,
          activelist: ['pid_1'],
          flags: { pid_1: { ammo: 3333, health: 100 } },
          pages: [],
        },
      ],
    })
    expect(changed).toBe(true)
    expect(memoryreadbookflags(book, 'pid_1')).toEqual({
      ammo: 3333,
      health: 100,
    })
    expect(book.timestamp).toBe(5)
  })

  it('preserves *_gadget flag bags when absent from guest tree', () => {
    const gadgetowner = 'pid_1_gadget'
    const book = {
      id: 'b1',
      name: 'b1',
      token: 't',
      timestamp: 1,
      activelist: ['pid_1'],
      flags: { pid_1: 'pid_1', [gadgetowner]: gadgetowner },
      pages: [],
    }
    flagbags.set('pid_1', { ammo: 1 })
    flagbags.set(gadgetowner, { state: { sidebar: [['text', 'hello']] } })
    mockreadlist.mockReturnValue([book])
    const changed = applyzedcafetomemory({
      books: [
        {
          id: 'b1',
          name: 'b1',
          token: 't',
          timestamp: 0,
          activelist: ['pid_1'],
          flags: { pid_1: { ammo: 9 } },
          pages: [],
        },
      ],
    })
    expect(changed).toBe(true)
    expect(book.flags[gadgetowner]).toBe(gadgetowner)
    expect(memoryreadbookflags(book, gadgetowner)).toEqual({
      state: { sidebar: [['text', 'hello']] },
    })
    expect(memoryreadbookflags(book, 'pid_1')).toEqual({ ammo: 9 })
  })

  it('ignores guest overwrite of *_gadget flag bags', () => {
    const gadgetowner = 'pid_1_gadget'
    const book = {
      id: 'b1',
      name: 'b1',
      token: 't',
      timestamp: 1,
      activelist: ['pid_1'],
      flags: { [gadgetowner]: gadgetowner },
      pages: [],
    }
    flagbags.set(gadgetowner, { state: { sidebar: [['text', 'keep']] } })
    mockreadlist.mockReturnValue([book])
    const changed = applyzedcafetomemory({
      books: [
        {
          id: 'b1',
          name: 'b1',
          token: 't',
          timestamp: 0,
          activelist: ['pid_1'],
          flags: {
            [gadgetowner]: { state: { sidebar: [['text', 'wipe']] } },
          },
          pages: [],
        },
      ],
    })
    expect(changed).toBe(false)
    expect(memoryreadbookflags(book, gadgetowner)).toEqual({
      state: { sidebar: [['text', 'keep']] },
    })
  })

  it('clears all books when guest tree has empty books list', () => {
    mockreadlist.mockReturnValue([
      {
        id: 'only',
        name: 'only',
        token: '',
        timestamp: 0,
        activelist: [],
        flags: {},
        pages: [],
      },
    ])
    const changed = applyzedcafetomemory({ books: [] })
    expect(changed).toBe(true)
    expect(mockclearbook).toHaveBeenCalledWith('only')
  })

  it('marks changed for guestTouch even without book diffs', () => {
    mockreadlist.mockReturnValue([])
    mockupsert.mockReturnValue(false)
    const changed = applyzedcafetomemory({
      guestTouch: true,
      books: [],
    })
    expect(changed).toBe(true)
  })
})

describe('applyzedcafepartialtomemory', () => {
  const page = { id: 'page1', code: '@board title' }
  const book = {
    id: 'b1',
    name: 'demo',
    token: 't',
    timestamp: 1,
    activelist: ['pid_1'],
    flags: {
      pid_1: 'pid_1',
      pid_1_gadget: 'pid_1_gadget',
    },
    pages: [page],
  }

  beforeEach(() => {
    flagbags.clear()
    boards.clear()
    mockreadlist.mockReset()
    mockreadlist.mockReturnValue([book])
    book.flags = {
      pid_1: 'pid_1',
      pid_1_gadget: 'pid_1_gadget',
    }
    book.pages = [page]
    flagbags.set('pid_1', { ammo: 1 })
    flagbags.set('pid_1_gadget', {
      state: { sidebar: [['text', 'hello']] },
    })
    boards.set('page1', {
      id: 'page1',
      terrain: maketerrain(0),
      objects: {
        keep: { id: 'keep', kind: 'object', cycle: 1 },
        dropme: { id: 'dropme', kind: 'object', cycle: 2 },
      },
    })
  })

  it('applies terrain without wiping sibling objects or gadget sidebar', () => {
    const terrain = maketerrain(7)
    const result = applyzedcafepartialtomemory([
      {
        path: 'demo-b1/title-page1/board/terrain.json',
        bytes: encoder.encode(JSON.stringify(terrain)),
      },
    ])
    expect(result.changed).toBe(true)
    expect(result.paintids).toEqual(['page1'])
    expect(boards.get('page1')?.terrain[0]).toEqual({ char: 7, color: 0 })
    expect(boards.get('page1')?.objects.keep).toBeTruthy()
    expect(boards.get('page1')?.objects.dropme).toBeTruthy()
    expect(memoryreadbookflags(book, 'pid_1_gadget')).toEqual({
      state: { sidebar: [['text', 'hello']] },
    })
  })

  it('ignores guest gadget flag file on partial upsert', () => {
    const result = applyzedcafepartialtomemory([
      {
        path: 'demo-b1/flags/pid_1_gadget.json',
        bytes: encoder.encode(
          JSON.stringify({ state: { sidebar: [['text', 'wipe']] } }),
        ),
      },
    ])
    expect(result.changed).toBe(false)
    expect(memoryreadbookflags(book, 'pid_1_gadget')).toEqual({
      state: { sidebar: [['text', 'hello']] },
    })
  })

  it('upserts one object without deleting siblings', () => {
    const result = applyzedcafepartialtomemory([
      {
        path: 'demo-b1/title-page1/board/objects/newobj.json',
        bytes: encoder.encode(
          JSON.stringify({ id: 'newobj', kind: 'object', cycle: 10 }),
        ),
      },
    ])
    expect(result.changed).toBe(true)
    const objects = boards.get('page1')?.objects ?? {}
    expect(objects.keep).toBeTruthy()
    expect(objects.dropme).toBeTruthy()
    expect(objects.newobj).toEqual({
      id: 'newobj',
      kind: 'object',
      cycle: 10,
    })
  })

  it('removes only the named object path', () => {
    const result = applyzedcafepartialtomemory([], [
      'demo-b1/title-page1/board/objects/dropme.json',
    ])
    expect(result.changed).toBe(true)
    const objects = boards.get('page1')?.objects ?? {}
    expect(objects.keep).toBeTruthy()
    expect(objects.dropme).toBeUndefined()
  })
})
