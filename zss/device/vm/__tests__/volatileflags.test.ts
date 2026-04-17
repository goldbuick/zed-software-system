/*
VOLATILE_FLAG_KEYS coverage.

The boardrunner worker owns `flags[id].inputqueue` (user:input), tick-local
`inputcurrent`, and similar per-board queues `synthstate` / `synthplay`. These
must NOT ride in the
memory stream projection (otherwise we burn diff cycles and let the server
round-trip clobber live worker state on hydrate). memoryproject strips them
at projection time; memoryhydrate preserves them on incoming merges.
*/
import { MEMORY_STREAM_ID, memorydirtyclear } from 'zss/memory/memorydirty'
import {
  memoryreadbookbyaddress,
  memoryreadroot,
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { BOOK, BOOK_FLAGS, MEMORY_LABEL } from 'zss/memory/types'

import { memoryhydratefromjsonsync } from '../memoryhydrate'
import { VOLATILE_FLAG_KEYS, projectmemory } from '../memoryproject'

function makemainbook(): BOOK {
  const flags = {
    p1: {
      board: 'boardA',
      hp: 5,
      inputcurrent: 6,
      inputqueue: [
        [1, 0],
        [2, 0],
      ],
    } as unknown as BOOK_FLAGS,
    boardA: {
      synthstate: { voices: {}, voicefx: {} },
      synthplay: [],
      custom: 'keep-me',
    } as unknown as BOOK_FLAGS,
  }
  return {
    id: 'main-id',
    name: 'main',
    timestamp: 0,
    activelist: ['p1'],
    pages: [],
    flags,
  }
}

describe('VOLATILE_FLAG_KEYS projection + hydration', () => {
  beforeEach(() => {
    memoryresetbooks([makemainbook()])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    memorydirtyclear()
  })

  afterEach(() => {
    memoryresetbooks([])
    memorydirtyclear()
  })

  it('exposes the expected volatile flag keys', () => {
    expect([...VOLATILE_FLAG_KEYS]).toEqual([
      'inputqueue',
      'inputcurrent',
      'synthstate',
      'synthplay',
    ])
  })

  it('projectmemory strips VOLATILE_FLAG_KEYS from book.flags', () => {
    const projected = projectmemory() as {
      books: Record<string, { flags: Record<string, Record<string, unknown>> }>
    }
    const flags = projected.books['main-id'].flags

    expect(flags.p1.board).toBe('boardA')
    expect(flags.p1.hp).toBe(5)
    expect(flags.p1.inputcurrent).toBeUndefined()
    expect(flags.p1.inputqueue).toBeUndefined()

    expect(flags.boardA.custom).toBe('keep-me')
    expect(flags.boardA.synthstate).toBeUndefined()
    expect(flags.boardA.synthplay).toBeUndefined()
  })

  it('memoryhydratefromjsonsync preserves local volatile keys when merging', () => {
    // Simulate an inbound memory snapshot with the server's stripped flags.
    // The worker-local flags already carry inputqueue + synthstate; they
    // must survive the hydrate.
    const stripped = projectmemory() as Record<string, unknown>
    memoryhydratefromjsonsync(MEMORY_STREAM_ID, stripped)

    const book = memoryreadbookbyaddress('main-id')
    const p1 = book?.flags.p1 as Record<string, unknown>
    expect(p1.board).toBe('boardA')
    expect(p1.hp).toBe(5)
    expect(p1.inputcurrent).toBe(6)
    expect(p1.inputqueue).toEqual([
      [1, 0],
      [2, 0],
    ])

    const boardflags = book?.flags.boardA as Record<string, unknown>
    expect(boardflags.custom).toBe('keep-me')
    expect(boardflags.synthstate).toEqual({ voices: {}, voicefx: {} })
    expect(boardflags.synthplay).toEqual([])
  })

  it('hydrate still picks up non-volatile server updates while keeping local volatile keys', () => {
    // Server raises hp for p1 and re-projects; worker already had an
    // inputqueue locally. After hydrate, hp updates AND inputqueue survives.
    const root = memoryreadroot()
    const book = root.books.get('main-id')
    if (book) {
      book.flags.p1 = {
        ...(book.flags.p1 as unknown as Record<string, unknown>),
        hp: 9,
      } as unknown as BOOK['flags'][string]
    }
    const stripped = projectmemory() as Record<string, unknown>

    // Reset the worker's local state back to the original (hp: 5 with
    // inputqueue) to simulate the pre-hydrate divergence.
    memoryresetbooks([makemainbook()])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')

    memoryhydratefromjsonsync(MEMORY_STREAM_ID, stripped)

    const after = memoryreadbookbyaddress('main-id')
    const p1 = after?.flags.p1 as Record<string, unknown>
    expect(p1.hp).toBe(9)
    expect(p1.inputqueue).toEqual([
      [1, 0],
      [2, 0],
    ])
  })
})
