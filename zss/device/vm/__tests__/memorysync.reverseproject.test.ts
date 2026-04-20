/*
phase 1 reverse-projection coverage.

these tests exercise `memorysyncreverseproject` directly against MEMORY. they
do NOT spin up the jsonsyncserver pipeline; that integration is covered in the
worker round-trip tests in phase 2. here we just want to confirm that a
correctly-shaped accepted document for either a `memory` stream or a
`board:<id>` stream lands in the canonical MEMORY object, and that the writes
do not re-fire the per-stream dirty bits (which would create the feedback
loop the silent-writes guard is designed to prevent).
*/
import {
  MEMORY_STREAM_ID,
  boardstreamid,
  flagsstreamid,
  gadgetstreamid,
  memoryconsumealldirty,
  memorydirtyclear,
  memorydirtyhas,
} from 'zss/memory/memorydirty'
import {
  memoryreadbookbyaddress,
  memoryreadroot,
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import {
  BOARD,
  BOOK,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from 'zss/memory/types'

import { memorysyncreverseproject } from '../memorysync'

function makeboard(id: string): BOARD {
  return {
    id,
    name: id,
    terrain: [],
    objects: {},
  }
}

function makeboardcodepage(id: string): CODE_PAGE {
  return {
    id,
    code: '',
    board: makeboard(id),
    stats: { type: CODE_PAGE_TYPE.BOARD, name: id },
  }
}

function makebook(opts: {
  id: string
  name: string
  pages?: CODE_PAGE[]
  flags?: BOOK['flags']
}): BOOK {
  return {
    id: opts.id,
    name: opts.name,
    timestamp: 0,
    activelist: [],
    pages: opts.pages ?? [],
    flags: opts.flags ?? {},
  }
}

describe('memorysyncreverseproject', () => {
  beforeEach(() => {
    memorydirtyclear()
  })

  afterEach(() => {
    memorydirtyclear()
    memoryresetbooks([])
  })

  it('lands player flag patch from memory stream into MEMORY.books.flags', () => {
    const board = makeboardcodepage('boardA')
    const main = makebook({
      id: 'main-id',
      name: 'main',
      pages: [board],
      flags: { player1: { board: 'boardA' } },
    })
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    // memoryresetbooks marks memory dirty; clear it so we can observe that
    // the reverse-projection itself doesn't re-fire the bit.
    memorydirtyclear()

    // mimic an accepted memory stream document where player1 just gained an
    // hp flag and player2 logged in fresh on the same board.
    const incomingdocument = {
      books: {
        'main-id': {
          id: 'main-id',
          name: 'main',
          activelist: ['player1', 'player2'],
          pages: [],
          flags: {
            player1: { board: 'boardA', hp: 10 },
            player2: { board: 'boardA' },
          },
        },
      },
    }

    memorysyncreverseproject(MEMORY_STREAM_ID, incomingdocument)

    const book = memoryreadbookbyaddress('main-id')
    expect(book?.flags.player1).toEqual({ board: 'boardA', hp: 10 })
    expect(book?.flags.player2).toEqual({ board: 'boardA' })
    expect(book?.activelist).toEqual(['player1', 'player2'])
    // silent-writes guard must keep MEMORY_STREAM_ID out of the dirty set.
    expect(memorydirtyhas(MEMORY_STREAM_ID)).toBe(false)
  })

  it('reverse-projects gadget stream into flags.gadgetstore', () => {
    const pidHost = 'pid_1111_hostgadget'
    const main = makebook({
      id: 'main-id',
      name: 'main',
      flags: {
        [MEMORY_LABEL.GADGETSTORE]: {
          [pidHost]: { id: 'a', board: '', boardname: '' },
        },
        [pidHost]: { board: 'boardA' },
      } as unknown as BOOK['flags'],
    })
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    memorydirtyclear()

    memorysyncreverseproject(gadgetstreamid(pidHost), {
      id: 'g2',
      board: 'boardA',
      boardname: 'X',
      layers: [{ id: 'L' }],
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
    })

    const book = memoryreadbookbyaddress('main-id')
    const gadgetstore = book?.flags[MEMORY_LABEL.GADGETSTORE] as Record<
      string,
      unknown
    >
    expect((gadgetstore[pidHost] as Record<string, unknown>).id).toBe('g2')
    expect((gadgetstore[pidHost] as Record<string, unknown>).boardname).toBe(
      'X',
    )
    expect(memorydirtyhas(gadgetstreamid(pidHost))).toBe(false)
  })

  it('reverse-projects flags stream into mainbook.flags[pid]', () => {
    const pidHost = 'pid_2222_hostflags'
    const main = makebook({
      id: 'main-id',
      name: 'main',
      flags: {
        [pidHost]: { board: 'boardA', hp: 1 },
      } as unknown as BOOK['flags'],
    })
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    memorydirtyclear()

    memorysyncreverseproject(flagsstreamid(pidHost), {
      board: 'boardA',
      hp: 99,
    })

    const book = memoryreadbookbyaddress('main-id')
    expect(book?.flags[pidHost]).toEqual({ board: 'boardA', hp: 99 })
    expect(memorydirtyhas(flagsstreamid(pidHost))).toBe(false)
  })

  it('preserves BOARD pages on the live book when memory stream re-projects', () => {
    const board = makeboardcodepage('boardA')
    const main = makebook({
      id: 'main-id',
      name: 'main',
      pages: [board],
    })
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    memorydirtyclear()

    // projection strips BOARD pages out of the memory stream, so an accepted
    // memory document won't carry boardA. reverse-projection must keep the
    // local BOARD page intact, otherwise we'd lose the board on every patch.
    memorysyncreverseproject(MEMORY_STREAM_ID, {
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

    const book = memoryreadbookbyaddress('main-id')
    expect(book?.pages.length).toBe(1)
    expect(book?.pages[0].id).toBe('boardA')
    expect(book?.pages[0].board).toBeDefined()
  })

  it('lands board element mutation from board:<id> stream into MEMORY board objects', () => {
    const board = makeboardcodepage('boardA')
    const main = makebook({ id: 'main-id', name: 'main', pages: [board] })
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    memorydirtyclear()

    const streamid = boardstreamid('boardA')
    const incomingdocument = {
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
            x: 5,
            y: 7,
            color: 14,
            bg: 0,
          },
        },
      },
    }

    memorysyncreverseproject(streamid, incomingdocument)

    const root = memoryreadroot()
    const book = root.books.get('main-id')
    const codepage = book?.pages.find((p) => p.id === 'boardA')
    expect(codepage?.code).toBe('@boardA\n')
    expect(codepage?.board?.objects['obj-1']).toEqual({
      id: 'obj-1',
      kind: 'player',
      x: 5,
      y: 7,
      color: 14,
      bg: 0,
    })
    // board stream silent-writes guard must keep board:<id> out of dirty.
    expect(memorydirtyhas(streamid)).toBe(false)
  })

  it('materializes a new book when the memory stream carries an unknown id', () => {
    const main = makebook({ id: 'main-id', name: 'main' })
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    memorydirtyclear()

    memorysyncreverseproject(MEMORY_STREAM_ID, {
      books: {
        'main-id': {
          id: 'main-id',
          name: 'main',
          activelist: [],
          pages: [],
          flags: {},
        },
        'extra-id': {
          id: 'extra-id',
          name: 'extra',
          activelist: [],
          pages: [],
          flags: { player1: { hp: 3 } },
        },
      },
    })

    const extra = memoryreadbookbyaddress('extra-id')
    expect(extra).toBeDefined()
    expect(extra?.name).toBe('extra')
    expect(extra?.flags.player1).toEqual({ hp: 3 })
    // silent-writes guard must keep MEMORY_STREAM_ID out of the dirty set.
    expect(memorydirtyhas(MEMORY_STREAM_ID)).toBe(false)
  })

  it('removes a local book when the authoritative memory stream drops it', () => {
    const main = makebook({ id: 'main-id', name: 'main' })
    const stale = makebook({ id: 'stale-id', name: 'stale' })
    memoryresetbooks([main, stale])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    memorydirtyclear()

    expect(memoryreadbookbyaddress('stale-id')).toBeDefined()

    memorysyncreverseproject(MEMORY_STREAM_ID, {
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

  it('ignores documents for unknown streams without throwing', () => {
    expect(() =>
      memorysyncreverseproject('unknown-stream', { foo: 'bar' }),
    ).not.toThrow()
    expect(() =>
      memorysyncreverseproject('board:does-not-exist', {
        board: { id: 'does-not-exist', name: 'x', terrain: [], objects: {} },
      }),
    ).not.toThrow()
    // and never marks anything dirty as a side effect.
    expect(memoryconsumealldirty()).toEqual([])
  })
})
