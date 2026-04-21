/**
 * Viewport gadget admission must include players with flags.board on the board
 * even when they are not yet on mainbook.activelist (e.g. join-in-progress).
 */
import { initstate } from 'zss/gadget/data/api'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { gadgetstream, memorystream } from 'zss/memory/memorydirty'
import { memorywritebookflag } from 'zss/memory/bookoperations'
import {
  streamreplserverclearfortests,
  streamreplserverreadstream,
  streamreplserverregister,
} from 'zss/device/streamreplserver'
import {
  memoryreadbookbysoftware,
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { BOOK, CODE_PAGE, CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

import { projectmemory } from '../memoryproject'
import { memorysyncadmitboardrunner, memorysyncpushdirty } from '../memorysync'
import { ackboardrunners } from '../state'

describe('memorysync viewport gadget admission', () => {
  afterEach(() => {
    for (const k of Object.keys(ackboardrunners)) {
      delete ackboardrunners[k]
    }
    streamreplserverclearfortests()
    memoryresetbooks([])
  })

  it('admits gadget:<joiner> when joiner has board flag but is not in activelist', () => {
    const runner = 'pid_runner_vpga'
    const joiner = 'pid_joiner_vpga'
    const boardId = 'brd_vpga_test'

    const g = initstate()
    g.layers = [{ id: 'l1', type: LAYER_TYPE.BLANK }]

    const codepage: CODE_PAGE = {
      id: boardId,
      code: '',
      stats: { type: CODE_PAGE_TYPE.BOARD },
      board: {
        id: boardId,
        terrain: [],
        objects: {},
      },
    }

    const book: BOOK = {
      id: 'main-vpga',
      name: 'main',
      timestamp: 0,
      activelist: [runner],
      pages: [codepage],
      flags: {
        [runner]: { board: boardId },
        [joiner]: { board: boardId },
        [MEMORY_LABEL.GADGETSTORE]: {
          [joiner]: g,
        } as unknown as Record<string, never>,
      },
    }

    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-vpga')
    streamreplserverclearfortests()

    memorysyncadmitboardrunner(runner, boardId)

    const gstream = gadgetstream(joiner)
    const entry = streamreplserverreadstream(gstream)
    expect(entry?.players.has(joiner)).toBe(true)
    expect(entry?.players.has(runner)).toBe(true)
  })

  it('memory push admits gadget for joiner whose board flag appears after snapshot', () => {
    const runner = 'pid_runner_vpga2'
    const joiner = 'pid_joiner_vpga2'
    const boardId = 'brd_vpga2_test'

    const gj = initstate()
    gj.layers = [{ id: 'l1', type: LAYER_TYPE.BLANK }]

    const codepage: CODE_PAGE = {
      id: boardId,
      code: '',
      stats: { type: CODE_PAGE_TYPE.BOARD },
      board: {
        id: boardId,
        terrain: [],
        objects: {},
      },
    }

    const book: BOOK = {
      id: 'main-vpga2',
      name: 'main',
      timestamp: 0,
      activelist: [runner],
      pages: [codepage],
      flags: {
        [runner]: { board: boardId },
        [joiner]: {},
        [MEMORY_LABEL.GADGETSTORE]: {
          [joiner]: gj,
        } as unknown as Record<string, never>,
      },
    }

    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-vpga2')
    streamreplserverclearfortests()
    streamreplserverregister(memorystream(), projectmemory())

    ackboardrunners[boardId] = runner
    memorysyncadmitboardrunner(runner, boardId)

    let gjoin = streamreplserverreadstream(gadgetstream(joiner))
    expect(gjoin?.players.has(joiner) ?? false).toBe(false)

    const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    expect(main).toBeDefined()
    memorywritebookflag(main!, joiner, 'board', boardId)
    memorysyncpushdirty()

    gjoin = streamreplserverreadstream(gadgetstream(joiner))
    expect(gjoin?.players.has(joiner)).toBe(true)
    expect(gjoin?.players.has(runner)).toBe(true)
  })
})
