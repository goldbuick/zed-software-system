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
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbooklist: jest.fn(() => []),
  memorywritebook: jest.fn(),
  memoryclearbook: jest.fn(),
}))

import {
  memoryclearbookcodepage,
  memoryimportbookfromjson,
  memoryupsertcodepage,
} from 'zss/memory/bookoperations'
import {
  memoryclearbook,
  memoryreadbooklist,
  memorywritebook,
} from 'zss/memory/session'
import { applyzedcafetomemory } from 'zss/feature/wanix/wanixstateimport'

const mockreadlist = memoryreadbooklist as jest.Mock
const mockwritebook = memorywritebook as jest.Mock
const mockclearbook = memoryclearbook as jest.Mock
const mockupsert = memoryupsertcodepage as jest.Mock
const mockclearpage = memoryclearbookcodepage as jest.Mock
const mockimport = memoryimportbookfromjson as jest.Mock

describe('applyzedcafetomemory', () => {
  beforeEach(() => {
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
