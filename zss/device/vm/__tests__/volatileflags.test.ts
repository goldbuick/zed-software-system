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

import {
  memoryhydratefromjsonsync,
  mergeflagspreservingvolatile,
} from '../memoryhydrate'
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

  it('hydrate keeps gadgetstore pid when incoming.gadgetstore omits that activelist pid', () => {
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
    const main = (stripped.books as Record<string, unknown>)['main-id'] as {
      flags: Record<string, unknown>
      activelist: string[]
    }
    const gs = main.flags[MEMORY_LABEL.GADGETSTORE] as Record<string, unknown>
    main.flags[MEMORY_LABEL.GADGETSTORE] = {
      p1: gs.p1,
    }

    memoryhydratefromjsonsync(MEMORY_STREAM_ID, stripped)

    const after = memoryreadbookbyaddress('main-id')
    const afterGs = after?.flags[MEMORY_LABEL.GADGETSTORE] as Record<
      string,
      unknown
    >
    expect(afterGs[pidJoin]).toEqual({ layers: [{ id: 'layer-a' }] })
  })

  it('merge preserves gadgetstore layers when incoming pid row has empty layers', () => {
    const pidJoin = 'pid_4444_gadgetlayermerge'
    const existing: Record<string, BOOK_FLAGS> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [pidJoin]: { board: 'b1', layers: [{ id: 'L1' }] },
      } as unknown as BOOK_FLAGS,
    }
    const incoming: Record<string, Record<string, unknown>> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [pidJoin]: { board: 'b1', layers: [] },
      },
    }
    const out = mergeflagspreservingvolatile(existing, incoming, [pidJoin])
    const gs = out[MEMORY_LABEL.GADGETSTORE] as Record<
      string,
      { layers?: unknown[] }
    >
    expect(gs[pidJoin].layers).toEqual([{ id: 'L1' }])
  })

  it('merge preserves gadgetstore layers when incoming omits or nulls layers', () => {
    const pidJoin = 'pid_6666_gadgetlayersomit'
    const existing: Record<string, BOOK_FLAGS> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [pidJoin]: { board: 'b1', layers: [{ id: 'L1' }] },
      } as unknown as BOOK_FLAGS,
    }
    const incoming: Record<string, Record<string, unknown>> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [pidJoin]: { board: 'b1', layers: undefined as unknown as [] },
      },
    }
    const out = mergeflagspreservingvolatile(existing, incoming, [pidJoin])
    const gs = out[MEMORY_LABEL.GADGETSTORE] as Record<
      string,
      { layers?: unknown[] }
    >
    expect(gs[pidJoin].layers).toEqual([{ id: 'L1' }])
  })

  it('merge seeds joiner gadgetstore layers from boardmate when incoming omits board', () => {
    const host = 'pid_1001_hostnoboardhint'
    const join = 'pid_2001_joinnoboardhint'
    const b = 'board_sid_nohint'
    const existing: Record<string, BOOK_FLAGS> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [host]: { board: b, layers: [{ id: 'fromhost' }] },
        [join]: { layers: [] },
      } as unknown as BOOK_FLAGS,
    }
    const incoming: Record<string, Record<string, unknown>> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [join]: { layers: [] },
      },
    }
    const out = mergeflagspreservingvolatile(existing, incoming, [host, join])
    const gs = out[MEMORY_LABEL.GADGETSTORE] as Record<
      string,
      { layers?: unknown[] }
    >
    expect(gs[join].layers).toEqual([{ id: 'fromhost' }])
  })

  it('merge fills gadgetstore board from prev when incoming clears board but keeps layers via preserve', () => {
    const pid = 'pid_3333_boardfromprev'
    const existing: Record<string, BOOK_FLAGS> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [pid]: { board: 'bx', layers: [{ id: 'L' }] },
      } as unknown as BOOK_FLAGS,
    }
    const incoming: Record<string, Record<string, unknown>> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [pid]: { board: '', layers: [] },
      },
    }
    const out = mergeflagspreservingvolatile(existing, incoming, [pid])
    const gs = out[MEMORY_LABEL.GADGETSTORE] as Record<
      string,
      { layers?: unknown[]; board?: string }
    >
    expect(gs[pid].layers).toEqual([{ id: 'L' }])
    expect(gs[pid].board).toBe('bx')
  })

  it('merge does not seed from a boardmate on a different board when board hint is set', () => {
    const host = 'pid_1002_hostotherboard'
    const join = 'pid_2002_joinotherboard'
    const existing: Record<string, BOOK_FLAGS> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [host]: { board: 'board_host_only', layers: [{ id: 'hostonly' }] },
        [join]: { board: 'board_join', layers: [] },
      } as unknown as BOOK_FLAGS,
    }
    const incoming: Record<string, Record<string, unknown>> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [join]: { board: 'board_join', layers: [] },
      },
    }
    const out = mergeflagspreservingvolatile(existing, incoming, [host, join])
    const gs = out[MEMORY_LABEL.GADGETSTORE] as Record<
      string,
      { layers?: unknown[] }
    >
    expect(gs[join].layers).toEqual([])
  })

  it('merge seeds joiner gadgetstore layers from a boardmate with the same board id', () => {
    const host = 'pid_1000_hostseed'
    const join = 'pid_2000_joinseed'
    const b = 'board_sid_seed'
    const existing: Record<string, BOOK_FLAGS> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [host]: { board: b, layers: [{ id: 'fromhost' }] },
        [join]: { board: b, layers: [] },
      } as unknown as BOOK_FLAGS,
    }
    const incoming: Record<string, Record<string, unknown>> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [join]: { board: b, layers: [] },
      },
    }
    const out = mergeflagspreservingvolatile(existing, incoming, [host, join])
    const gs = out[MEMORY_LABEL.GADGETSTORE] as Record<
      string,
      { layers?: unknown[] }
    >
    expect(gs[join].layers).toEqual([{ id: 'fromhost' }])
    expect(gs[host].layers).toEqual([{ id: 'fromhost' }])
  })

  it('merge replaces gadgetstore layers when incoming carries a non-empty stack', () => {
    const pidJoin = 'pid_5555_gadgetlayerupdate'
    const existing: Record<string, BOOK_FLAGS> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [pidJoin]: { board: 'b1', layers: [{ id: 'A' }] },
      } as unknown as BOOK_FLAGS,
    }
    const incoming: Record<string, Record<string, unknown>> = {
      [MEMORY_LABEL.GADGETSTORE]: {
        [pidJoin]: { board: 'b1', layers: [{ id: 'B' }, { id: 'C' }] },
      },
    }
    const out = mergeflagspreservingvolatile(existing, incoming, [pidJoin])
    const gs = out[MEMORY_LABEL.GADGETSTORE] as Record<
      string,
      { layers?: unknown[] }
    >
    expect(gs[pidJoin].layers).toEqual([{ id: 'B' }, { id: 'C' }])
  })
})
