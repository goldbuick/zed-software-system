/*
VOLATILE_FLAG_KEYS coverage.

The boardrunner worker owns `flags[id].inputqueue` (user:input), tick-local
`inputcurrent`, and similar per-board queues `synthstate` / `synthplay`. These
must NOT ride in the
memory stream projection (otherwise we burn diff cycles and let the server
round-trip clobber live worker state on hydrate). memoryproject strips them
at projection time; memoryhydrate preserves them on incoming merges.

Gadget UI state replicates via `gadget:<pid>` streams; `projectmemory` omits
`flags.gadgetstore` from the wire snapshot. Player bags for ids matching
`ispid` replicate via `flags:<pid>` and are omitted from `projectmemory`.
*/
import {
  flagsstreamid,
  gadgetstreamid,
  MEMORY_STREAM_ID,
  memorydirtyclear,
} from 'zss/memory/memorydirty'
import {
  memoryreadbookbyaddress,
  memoryreadroot,
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { BOOK, BOOK_FLAGS, MEMORY_LABEL } from 'zss/memory/types'

import {
  memoryhydratefromjsonsync,
  mergeflagspreservingvolatile,
} from '../memoryhydrate'
import {
  VOLATILE_FLAG_KEYS,
  projectmemory,
  projectplayerflags,
} from '../memoryproject'

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

  it('projectmemory omits ispid player rows from main book flags', () => {
    const pidkey = 'pid_projmem_omit'
    const book = makemainbook()
    ;(book.flags as Record<string, BOOK_FLAGS>)[pidkey] = {
      board: 'boardA',
      hp: 3,
    } as unknown as BOOK_FLAGS
    book.activelist = [...(book.activelist ?? []), pidkey]
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')

    const projected = projectmemory() as {
      books: Record<string, { flags: Record<string, unknown> }>
    }
    expect(projected.books['main-id'].flags[pidkey]).toBeUndefined()
    expect(projectplayerflags(pidkey).hp).toBe(3)
  })

  it('projectmemory omits gadgetstore from main book flags', () => {
    const book = makemainbook()
    ;(book.flags as Record<string, unknown>)[MEMORY_LABEL.GADGETSTORE] = {
      p1: { id: 'g', board: 'x', boardname: '' },
    }
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')

    const projected = projectmemory() as {
      books: Record<string, { flags: Record<string, unknown> }>
    }
    expect(projected.books['main-id'].flags[MEMORY_LABEL.GADGETSTORE]).toBe(
      undefined,
    )
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

  it('hydrate keeps player board flag when incoming row omits board', () => {
    const book = makemainbook()
    ;(book.flags as Record<string, BOOK_FLAGS>).joiner = {
      board: 'boardA',
      hp: 1,
    } as unknown as BOOK_FLAGS
    book.activelist = ['p1', 'joiner']
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')

    const stripped = projectmemory() as Record<string, unknown>
    const joinerflags = (
      stripped.books as Record<string, { flags: Record<string, unknown> }>
    )['main-id'].flags.joiner as Record<string, unknown>
    delete joinerflags.board

    memoryhydratefromjsonsync(MEMORY_STREAM_ID, stripped)

    const after = memoryreadbookbyaddress('main-id')
    const joiner = after?.flags.joiner as Record<string, unknown>
    expect(joiner.board).toBe('boardA')
    expect(joiner.hp).toBe(1)
  })

  it('hydrate keeps flags row when incoming.flags omits an activelist pid', () => {
    const joinerid = 'pid_9999_joinertestzzzz'
    const book = makemainbook()
    ;(book.flags as Record<string, BOOK_FLAGS>)[joinerid] = {
      board: 'boardA',
      hp: 2,
    } as unknown as BOOK_FLAGS
    book.activelist = ['p1', joinerid]
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')

    const stripped = projectmemory() as Record<string, unknown>
    const main = (stripped.books as Record<string, unknown>)['main-id'] as {
      flags: Record<string, unknown>
      activelist: string[]
    }
    main.activelist = ['p1', joinerid]
    const p1flags = (main.flags as Record<string, unknown>).p1 as Record<
      string,
      unknown
    >
    main.flags = { p1: { ...p1flags } }

    memoryhydratefromjsonsync(MEMORY_STREAM_ID, stripped)

    const after = memoryreadbookbyaddress('main-id')
    const joiner = after?.flags[joinerid] as Record<string, unknown>
    expect(joiner.board).toBe('boardA')
    expect(joiner.hp).toBe(2)
  })

  it('memoryhydratefromjsonsync flags stream merges player row preserving volatile', () => {
    const pidkey = 'pid_hydrate_flags'
    const book = makemainbook()
    ;(book.flags as Record<string, BOOK_FLAGS>)[pidkey] = {
      board: 'boardA',
      hp: 1,
      inputqueue: [[9, 0]],
    } as unknown as BOOK_FLAGS
    book.activelist = [...(book.activelist ?? []), pidkey]
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')

    memoryhydratefromjsonsync(flagsstreamid(pidkey), { board: 'boardA', hp: 8 })

    const after = memoryreadbookbyaddress('main-id')
    const row = after?.flags[pidkey] as Record<string, unknown>
    expect(row.hp).toBe(8)
    expect(row.inputqueue).toEqual([[9, 0]])
  })

  it('memoryhydratefromjsonsync gadget stream writes gadgetstore row', () => {
    const book = makemainbook()
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')

    const doc = {
      id: 'gadget-doc',
      board: 'boardA',
      boardname: 'Room',
      layers: [{ id: 'L1' }],
      exiteast: '',
      exitwest: '',
      exitnorth: '',
      exitsouth: '',
      exitne: '',
      exitnw: '',
      exitse: '',
      exitsw: '',
      scroll: [],
      sidebar: [],
    }
    memoryhydratefromjsonsync(gadgetstreamid('p1'), doc)

    const after = memoryreadbookbyaddress('main-id')
    const gs = after?.flags[MEMORY_LABEL.GADGETSTORE] as Record<
      string,
      unknown
    >
    expect(gs.p1).toEqual(doc)
  })

  it('hydrate keeps local gadgetstore when memory snapshot omits gadgetstore', () => {
    const pidJoin = 'pid_8888_gadgetstorehydrate'
    const book = makemainbook()
    ;(book.flags as Record<string, unknown>)[MEMORY_LABEL.GADGETSTORE] = {
      p1: { foo: 1 },
      [pidJoin]: { layers: [{ id: 'layer-a' }] },
    }
    ;(book.flags as Record<string, BOOK_FLAGS>)[pidJoin] = {
      board: 'boardA',
      hp: 2,
    } as unknown as BOOK_FLAGS
    book.activelist = ['p1', pidJoin]
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')

    const stripped = projectmemory() as Record<string, unknown>

    memoryhydratefromjsonsync(MEMORY_STREAM_ID, stripped)

    const after = memoryreadbookbyaddress('main-id')
    const afterGs = after?.flags[MEMORY_LABEL.GADGETSTORE] as Record<
      string,
      unknown
    >
    expect(afterGs[pidJoin]).toEqual({ layers: [{ id: 'layer-a' }] })
  })
})

describe('mergeflagspreservingvolatile', () => {
  it('preserves volatile keys on player flag rows', () => {
    const existing: Record<string, BOOK_FLAGS> = {
      p1: {
        board: 'b',
        inputqueue: [
          [1, 0],
          [2, 0],
        ],
      } as unknown as BOOK_FLAGS,
    }
    const incoming: Record<string, Record<string, unknown>> = {
      p1: { board: 'b', hp: 3 },
    }
    const out = mergeflagspreservingvolatile(existing, incoming, ['p1'])
    const p1 = out.p1 as Record<string, unknown>
    expect(p1.hp).toBe(3)
    expect(p1.inputqueue).toEqual([
      [1, 0],
      [2, 0],
    ])
  })
})
