import {
  flagsstream,
  ischipflagsstream,
  memorydirtyclear,
  memoryhasdirty,
  memorystream,
} from 'zss/memory/memorydirty'
import { memoryreadbookflags } from 'zss/memory/bookoperations'
import {
  memoryreadbookbyaddress,
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { BOOK, CODE_PAGE, CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'
import {
  streamreplserverclearfortests,
  streamreplserverreadstream,
  streamreplserverregister,
} from 'zss/device/streamreplserver'

import { projectmemory, projectplayerflags } from '../memoryproject'
import {
  memorysynclazyensurechipflagsstreamforpusher,
  memorysyncadmitboardrunner,
  memorysyncreverseproject,
  memorysyncrevokeboardrunner,
} from '../memorysimsync'
import { memoryinitboard } from 'zss/memory/boards'
import { memorytickobject } from 'zss/memory/runtime'
import { ispresent } from 'zss/mapping/types'

function makemainbook(): BOOK {
  const pid = 'pid_chipflags'
  return {
    id: 'main-chipflags',
    name: 'main',
    timestamp: 0,
    activelist: [pid],
    pages: [],
    flags: {
      [pid]: { board: 'boardchip' },
      el1_chip: { ec: 0 },
    },
  }
}

describe('chip flags streams flags:*_chip', () => {
  beforeEach(() => {
    memoryresetbooks([makemainbook()])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-chipflags')
    memorydirtyclear()
    streamreplserverclearfortests()
  })

  afterEach(() => {
    memoryresetbooks([])
    memorydirtyclear()
    streamreplserverclearfortests()
  })

  it('ischipflagsstream matches suffix _chip only', () => {
    expect(ischipflagsstream(flagsstream('el1_chip'))).toBe(true)
    expect(ischipflagsstream(flagsstream('pid_chipflags'))).toBe(false)
    expect(ischipflagsstream('board:x')).toBe(false)
  })

  it('memorysynclazyensurechipflagsstreamforpusher registers and admits', () => {
    const streamid = flagsstream('el1_chip')
    const runner = 'runner_board'
    streamreplserverregister('memory', projectmemory())
    expect(streamreplserverreadstream(streamid)).toBeUndefined()
    expect(memorysynclazyensurechipflagsstreamforpusher(streamid, runner)).toBe(
      true,
    )
    const entry = streamreplserverreadstream(streamid)
    expect(entry).toBeDefined()
    expect(entry?.players.get(runner)?.writable).toBe(true)
  })

  it('memorysyncreverseproject merges chip bag from flags row', () => {
    const bagid = 'el1_chip'
    memorysyncreverseproject(flagsstream(bagid), { ec: 2, ys: 0 })
    const main = memoryreadbookbyaddress('main-chipflags')
    expect(ispresent(main)).toBe(true)
    if (!ispresent(main)) {
      return
    }
    const bag = memoryreadbookflags(main, bagid) as Record<string, unknown>
    expect(bag.ec).toBe(2)
  })
})

describe('memorytickobject chip flags dirty', () => {
  afterEach(() => {
    memoryresetbooks([])
    memorydirtyclear()
  })

  it('marks flags:element_chip dirty when runtime tick runs', () => {
    const pid = 'pid_tickdirty'
    const boardid = 'boardtick'
    const elid = 'el_tick'
    const book: BOOK = {
      id: 'main-tickdirty',
      name: 'main',
      timestamp: 1,
      activelist: [pid],
      pages: [
        {
          id: boardid,
          name: boardid,
          code: `@board ${boardid}\n`,
          stats: { type: CODE_PAGE_TYPE.BOARD },
          board: {
            id: boardid,
            width: 10,
            height: 10,
            terrain: [],
            objects: {
              [elid]: {
                id: elid,
                x: 1,
                y: 1,
                kind: '',
                code: '',
                char: 1,
                color: 1,
                bg: 0,
                cycle: 1,
              },
            },
          },
        },
      ],
      flags: { [pid]: { board: boardid } },
    }
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-tickdirty')
    memorydirtyclear()
    const main = memoryreadbookbyaddress('main-tickdirty')
    const boardpage = main?.pages[0]
    const board = boardpage?.board
    expect(ispresent(main) && ispresent(board)).toBe(true)
    if (!ispresent(main) || !ispresent(board)) {
      return
    }
    memoryinitboard(board)
    const el = board.objects[elid]
    memorytickobject(main, board, el, '')
    expect(memoryhasdirty(flagsstream(`${elid}_chip`))).toBe(true)
  })
})

describe('memorysyncadmitboardrunner persisted chip + tracking flags', () => {
  afterEach(() => {
    streamreplserverclearfortests()
    memoryresetbooks([])
    memorydirtyclear()
  })

  it('registers flags streams for on-board *_chip bags, tracking_<board>, not orphan *_chip', () => {
    const runner = 'run_persist_chip'
    const boardid = 'brd_persist_chip'
    const elon = 'el_persist_onboard'
    const codepage: CODE_PAGE = {
      id: boardid,
      name: boardid,
      code: `@board ${boardid}\n`,
      stats: { type: CODE_PAGE_TYPE.BOARD },
      board: {
        id: boardid,
        width: 8,
        height: 8,
        terrain: [],
        objects: {
          [elon]: {
            id: elon,
            x: 0,
            y: 0,
            kind: '',
            code: '',
            char: 1,
            color: 1,
            bg: 0,
            cycle: 1,
          },
        },
      },
    }
    const book: BOOK = {
      id: 'main-persist-chip',
      name: 'main',
      timestamp: 0,
      activelist: [runner],
      pages: [codepage],
      flags: {
        [runner]: { board: boardid },
        [`${elon}_chip`]: { ec: 7 },
        stale_chip: { ec: 1 },
        [`tracking_${boardid}`]: { tick: 1 },
      },
    }
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-persist-chip')
    streamreplserverclearfortests()
    streamreplserverregister(memorystream(), projectmemory())

    memorysyncadmitboardrunner(runner, boardid)

    const elstream = streamreplserverreadstream(flagsstream(`${elon}_chip`))
    expect(elstream?.players.get(runner)?.writable).toBe(true)

    const trackingstream = streamreplserverreadstream(
      flagsstream(`tracking_${boardid}`),
    )
    expect(trackingstream?.players.get(runner)?.writable).toBe(true)

    expect(streamreplserverreadstream(flagsstream('stale_chip'))).toBeUndefined()

    memorysyncrevokeboardrunner(runner, boardid)
    expect(
      streamreplserverreadstream(flagsstream(`${elon}_chip`))?.players.has(
        runner,
      ),
    ).toBe(false)
    expect(
      streamreplserverreadstream(
        flagsstream(`tracking_${boardid}`),
      )?.players.has(runner),
    ).toBe(false)
  })
})
