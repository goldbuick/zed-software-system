/*
Regression: after an authoritative cross-board move, a stale `board:<id>`
reverse-projection (same shape as a worker push_batch row) must not be able
to resurrect the player on the source board — that ordering is what broke
edge exits before the tick applied `memorymoveplayertoboard` locally on the
boardrunner worker.
*/
import { deepcopy, ispresent } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardaccess'
import { memoryreadbookflag } from 'zss/memory/bookoperations'
import { memorydirtyclear } from 'zss/memory/memorydirty'
import { memorymoveplayertoboard } from 'zss/memory/playermanagement'
import {
  memoryreadbookbyaddress,
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
import { COLLISION } from 'zss/words/types'

import { boardstreamfromcodepage, projectboardcodepage } from '../memoryproject'
import { memorysyncreverseproject } from '../memorysync'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
}))

function makeboard(id: string): BOARD {
  return {
    id,
    name: id,
    terrain: [],
    objects: {},
  }
}

function makeboardcodepage(id: string, statname: string): CODE_PAGE {
  return {
    id,
    code: '',
    board: makeboard(id),
    stats: { type: CODE_PAGE_TYPE.BOARD, name: statname },
  }
}

function makebook(opts: {
  id: string
  name: string
  pages?: CODE_PAGE[]
  flags?: BOOK['flags']
  activelist?: string[]
}): BOOK {
  return {
    id: opts.id,
    name: opts.name,
    timestamp: 0,
    activelist: opts.activelist ?? [],
    pages: opts.pages ?? [],
    flags: opts.flags ?? {},
  }
}

describe('cross-board move vs stale board reverseproject', () => {
  beforeEach(() => {
    memorydirtyclear()
  })

  afterEach(() => {
    memorydirtyclear()
    memoryresetbooks([])
  })

  it('documents that stale source-board overlay can undo a move (guard for worker ordering)', () => {
    const pagea = makeboardcodepage('codepage-a', 'boardA')
    const pageb = makeboardcodepage('codepage-b', 'boardB')
    pagea.board.objects.p1 = {
      id: 'p1',
      x: 0,
      y: 0,
      collision: COLLISION.ISWALK,
    }
    const main = makebook({
      id: 'main-id',
      name: 'main',
      pages: [pagea, pageb],
      flags: { p1: { board: 'boardA' } },
      activelist: ['p1'],
    })
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    memorydirtyclear()

    const book = memoryreadbookbyaddress('main-id')
    expect(book).toBeDefined()
    if (!ispresent(book)) {
      return
    }

    const stalesource = deepcopy(projectboardcodepage(pagea)) as Record<
      string,
      unknown
    >

    const moved = memorymoveplayertoboard(book, 'p1', 'boardB', {
      x: 1,
      y: 1,
    })
    expect(moved).toBe(true)
    expect(memoryreadbookflag(book, 'p1', 'board')).toBe('codepage-b')
    expect(memoryreadobject(pagea.board, 'p1')).toBeUndefined()
    expect(memoryreadobject(pageb.board, 'p1')).toBeDefined()

    memorysyncreverseproject(boardstreamfromcodepage(pagea), stalesource)

    expect(memoryreadobject(pagea.board, 'p1')).toBeDefined()
    expect(memoryreadbookflag(book, 'p1', 'board')).toBe('codepage-b')
  })

  it('fresh source-board projection after move omits player so reverseproject stays consistent', () => {
    const pagea = makeboardcodepage('codepage-a', 'boardA')
    const pageb = makeboardcodepage('codepage-b', 'boardB')
    pagea.board.objects.p1 = {
      id: 'p1',
      x: 0,
      y: 0,
      collision: COLLISION.ISWALK,
    }
    const main = makebook({
      id: 'main-id',
      name: 'main',
      pages: [pagea, pageb],
      flags: { p1: { board: 'boardA' } },
      activelist: ['p1'],
    })
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    memorydirtyclear()

    const book = memoryreadbookbyaddress('main-id')
    if (!ispresent(book)) {
      return
    }

    expect(memorymoveplayertoboard(book, 'p1', 'boardB', { x: 1, y: 1 })).toBe(
      true,
    )

    const freshsource = deepcopy(projectboardcodepage(pagea)) as Record<
      string,
      unknown
    >
    memorysyncreverseproject(boardstreamfromcodepage(pagea), freshsource)

    expect(memoryreadobject(pagea.board, 'p1')).toBeUndefined()
    expect(memoryreadobject(pageb.board, 'p1')).toBeDefined()
    expect(memoryreadbookflag(book, 'p1', 'board')).toBe('codepage-b')
  })
})
