import {
  memoryplayerflagsready,
  memoryreadbookplayerboards,
} from 'zss/memory/playermanagement'
import {
  memoryreadbookbysoftware,
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { BOOK, MEMORY_LABEL } from 'zss/memory/types'

function mountmain(book: BOOK) {
  memoryresetbooks([book])
  memorywritesoftwarebook(MEMORY_LABEL.MAIN, book.id)
}

describe('memoryplayerflagsready', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('is false when flags row is missing', () => {
    const book: BOOK = {
      id: 'main-id',
      name: 'main',
      timestamp: 0,
      activelist: ['pid_1'],
      pages: [],
      flags: {},
    }
    mountmain(book)
    const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    expect(memoryplayerflagsready(main, 'pid_1')).toBe(false)
  })

  it('is false when row exists but board is absent', () => {
    const book: BOOK = {
      id: 'main-id',
      name: 'main',
      timestamp: 0,
      activelist: ['pid_1'],
      pages: [],
      flags: { pid_1: { user: 'a' } as BOOK['flags'][string] },
    }
    mountmain(book)
    const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    expect(memoryplayerflagsready(main, 'pid_1')).toBe(false)
  })

  it('memoryreadbookplayerboards does not auto-create flag rows for activelist players', () => {
    const book: BOOK = {
      id: 'main-id',
      name: 'main',
      timestamp: 0,
      activelist: ['pid_1'],
      pages: [],
      flags: {},
    }
    memoryreadbookplayerboards(book)
    expect(book.flags.pid_1).toBeUndefined()
  })

  it('is true when board is a non-empty string', () => {
    const book: BOOK = {
      id: 'main-id',
      name: 'main',
      timestamp: 0,
      activelist: ['pid_1'],
      pages: [],
      flags: { pid_1: { board: 'boardA' } as BOOK['flags'][string] },
    }
    mountmain(book)
    const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    expect(memoryplayerflagsready(main, 'pid_1')).toBe(true)
  })
})
