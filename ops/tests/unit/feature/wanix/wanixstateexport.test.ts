import {
  buildzedcafemanifest,
  buildzedcafeexportfiles,
  resetwanixstateexportfortest,
  schedulewanixexport,
} from 'zss/feature/wanix/wanixstateexport'
import type { BOOK } from 'zss/memory/types'

jest.mock('zss/device/api', () => ({
  wanixexportstate: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbooklist: jest.fn(() => []),
  memoryreadoperator: jest.fn(() => 'player1'),
}))

import { wanixexportstate } from 'zss/device/api'
import { memoryreadbooklist } from 'zss/memory/session'

const exportmock = wanixexportstate as jest.Mock

describe('wanixstateexport', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetwanixstateexportfortest()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('builds manifest for empty book list', () => {
    const manifest = buildzedcafemanifest([])
    expect(manifest.bookCount).toBe(0)
    expect(manifest.books).toEqual([])
    expect(typeof manifest.exportedAt).toBe('string')
  })

  it('builds logical export paths from books', () => {
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
        },
      ],
      flags: {},
    } as BOOK
    ;(memoryreadbooklist as jest.Mock).mockReturnValue([book])
    const files = buildzedcafeexportfiles()
    expect(files[0]?.path).toBe('manifest.json')
    expect(
      files.some((file) => file.path === 'books/book1/book.json'),
    ).toBe(true)
    expect(
      files.some((file) => file.path === 'books/book1/pages/page1.json'),
    ).toBe(true)
  })

  it('debounces export requests', () => {
    schedulewanixexport({ emit: jest.fn() } as any, 'player1')
    schedulewanixexport({ emit: jest.fn() } as any, 'player1')
    expect(exportmock).not.toHaveBeenCalled()
    jest.advanceTimersByTime(2000)
    expect(exportmock).toHaveBeenCalledTimes(1)
  })
})
