import {
  boardstream,
  flagsstream,
  memoryconsumealldirty,
  memorydirtyclear,
} from 'zss/memory/memorydirty'
import { memoryruncli } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritesoftwarebook } from 'zss/memory/session'
import {
  BOARD,
  BOARD_ELEMENT,
  BOOK,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from 'zss/memory/types'
import { COLLISION } from 'zss/words/types'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 0,
    DRAW_CHAR_HEIGHT: () => 0,
  },
}))

jest.mock('tone', () => ({
  Time: class TimeMock {},
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

describe('memoryruncli jsonsync dirty streams', () => {
  const pid = 'pid_0001_cli000000000000'
  const pageid = 'cp_board_cli'

  function setupPlayerOnBoard() {
    const page = makeboardcodepage(pageid, 'boardCli')
    const b = page.board!
    b.objects[pid] = {
      id: pid,
      x: 0,
      y: 0,
      kind: 'player',
      collision: COLLISION.ISWALK,
    } as BOARD_ELEMENT

    const main = makebook({
      id: 'main-cli-dirty',
      name: 'main',
      pages: [page],
      flags: { [pid]: { board: 'boardCli' } },
      activelist: [pid],
    })

    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, main.id)
  }

  afterEach(() => {
    memoryresetbooks([])
    memorydirtyclear()
  })

  it('marks player flags stream after #set for custom player flag', () => {
    setupPlayerOnBoard()
    memorydirtyclear()

    memoryruncli(pid, '#set mycustom 42', false)

    const dirty = memoryconsumealldirty()
    expect(dirty).toEqual(expect.arrayContaining([flagsstream(pid)]))
  })

  it('marks board stream after #color (element mutation)', () => {
    setupPlayerOnBoard()
    memorydirtyclear()

    memoryruncli(pid, '#color red', false)

    const dirty = memoryconsumealldirty()
    expect(dirty).toEqual(expect.arrayContaining([boardstream(pageid)]))
  })
})
