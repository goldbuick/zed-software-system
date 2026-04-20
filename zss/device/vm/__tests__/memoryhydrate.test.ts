/*
phase 2 worker-side hydration coverage.

these tests stand in for the boardrunner worker: they call
`memoryhydratefromjsonsync` directly against the worker's MEMORY singleton
and verify that snapshots / patches arriving for the `memory` and
`board:<id>` streams produce the right local state. We never touch
jsonsyncserver here — the worker only consumes jsonsync via the client
device.
*/
import {
  MEMORY_STREAM_ID,
  boardstreamid,
  memorydirtyclear,
  memorydirtyhas,
} from 'zss/memory/memorydirty'
import {
  memoryreadbookbyaddress,
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadoperator,
  memoryreadroot,
  memoryresetbooks,
} from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

import { memoryhydratefromjsonsync } from '../memoryhydrate'

describe('memoryhydratefromjsonsync', () => {
  beforeEach(() => {
    memoryresetbooks([])
    memorydirtyclear()
  })

  afterEach(() => {
    memoryresetbooks([])
    memorydirtyclear()
  })

  it('creates main book and applies scalars from a fresh memory snapshot', () => {
    memoryhydratefromjsonsync(MEMORY_STREAM_ID, {
      operator: 'op-player',
      halt: false,
      freeze: false,
      software: { main: 'main-id', game: '' },
      books: {
        'main-id': {
          id: 'main-id',
          name: 'main',
          activelist: ['op-player'],
          pages: [],
          flags: { 'op-player': { board: 'boardA' } },
        },
      },
    })

    expect(memoryreadoperator()).toBe('op-player')
    expect(memoryreadhalt()).toBe(false)

    const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    expect(main?.id).toBe('main-id')
    expect(main?.name).toBe('main')
    expect(main?.activelist).toEqual(['op-player'])
    expect(main?.flags['op-player']).toEqual({ board: 'boardA' })

    // hydration runs inside memorywithsilentwrites; nothing should be flagged.
    expect(memorydirtyhas(MEMORY_STREAM_ID)).toBe(false)
  })

  it('hydrates a board snapshot into the main book and rebuilds runtime caches', () => {
    memoryhydratefromjsonsync(MEMORY_STREAM_ID, {
      operator: '',
      software: { main: 'main-id', temp: '' },
      books: {
        'main-id': {
          id: 'main-id',
          name: 'main',
          activelist: [],
          pages: [],
          flags: {},
        },
      },
    })

    const streamid = boardstreamid('boardA')
    memoryhydratefromjsonsync(streamid, {
      id: 'boardA',
      code: '@boardA\n',
      board: {
        id: 'boardA',
        name: 'boardA',
        terrain: [],
        objects: {
          'obj-1': {
            id: 'obj-1',
            kind: 'player',
            x: 3,
            y: 4,
          },
        },
      },
    })

    const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    const codepage = main?.pages.find((p) => p.id === 'boardA')
    expect(codepage?.code).toBe('@boardA\n')
    expect(codepage?.stats?.type).toBe(CODE_PAGE_TYPE.BOARD)
    expect(codepage?.board?.objects['obj-1']).toBeDefined()
    // memoryinitboard rebuilt the lookup cache; it should now be defined.
    expect(codepage?.board?.lookup).toBeDefined()
    expect(codepage?.board?.named).toBeDefined()
    expect(memorydirtyhas(streamid)).toBe(false)
  })

  it('updates an existing book without dropping local BOARD pages', () => {
    // first hydrate creates main book + boardA
    memoryhydratefromjsonsync(MEMORY_STREAM_ID, {
      software: { main: 'main-id', temp: '' },
      books: {
        'main-id': {
          id: 'main-id',
          name: 'main',
          activelist: [],
          pages: [],
          flags: {},
        },
      },
    })
    memoryhydratefromjsonsync(boardstreamid('boardA'), {
      id: 'boardA',
      code: '',
      board: { id: 'boardA', name: 'boardA', terrain: [], objects: {} },
    })

    // a second memory patch arrives with new flags but no boards in pages —
    // the local BOARD page must survive.
    memoryhydratefromjsonsync(MEMORY_STREAM_ID, {
      software: { main: 'main-id', temp: '' },
      books: {
        'main-id': {
          id: 'main-id',
          name: 'main',
          activelist: ['p1'],
          pages: [],
          flags: { p1: { hp: 5 } },
        },
      },
    })

    const main = memoryreadbookbyaddress('main-id')
    expect(main?.flags.p1).toEqual({ hp: 5 })
    const boardpage = main?.pages.find((p) => p.id === 'boardA')
    expect(boardpage).toBeDefined()
    expect(boardpage?.board).toBeDefined()
  })

  it('removes worker-local books when the authoritative memory stream drops them', () => {
    // First hydrate creates main-id + stale-id locally.
    memoryhydratefromjsonsync(MEMORY_STREAM_ID, {
      software: { main: 'main-id', temp: '' },
      books: {
        'main-id': {
          id: 'main-id',
          name: 'main',
          activelist: [],
          pages: [],
          flags: {},
        },
        'stale-id': {
          id: 'stale-id',
          name: 'stale',
          activelist: [],
          pages: [],
          flags: {},
        },
      },
    })
    expect(memoryreadbookbyaddress('stale-id')).toBeDefined()

    // Subsequent memory document drops stale-id; worker must converge.
    memoryhydratefromjsonsync(MEMORY_STREAM_ID, {
      software: { main: 'main-id', temp: '' },
      books: {
        'main-id': {
          id: 'main-id',
          name: 'main',
          activelist: [],
          pages: [],
          flags: {},
        },
      },
    })

    expect(memoryreadbookbyaddress('stale-id')).toBeUndefined()
    expect(memoryreadbookbyaddress('main-id')).toBeDefined()
    expect(memorydirtyhas(MEMORY_STREAM_ID)).toBe(false)
  })

  it('drops board snapshots arriving before main book exists', () => {
    expect(() =>
      memoryhydratefromjsonsync(boardstreamid('orphan'), {
        id: 'orphan',
        code: '',
        board: { id: 'orphan', name: 'orphan', terrain: [], objects: {} },
      }),
    ).not.toThrow()
    // nothing was created, nothing was marked dirty
    expect(memoryreadroot().books.size).toBe(0)
  })
})
