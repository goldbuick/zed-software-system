/**
 * Viewport gadget admission must include players with flags.board on the board
 * even when they are not yet on mainbook.activelist (e.g. join-in-progress).
 */
import {
  rxstreamreplserverclearfortests,
  rxstreamreplserverreadstream,
  rxstreamreplserverregister,
} from 'zss/device/rxstreamreplserver'
import { initstate } from 'zss/gadget/data/api'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { memorywritebookflag } from 'zss/memory/bookoperations'
import { creategadgetmemid } from 'zss/memory/flagmemids'
import { gadgetstream, memorystream } from 'zss/memory/memorydirty'
import {
  memoryreadbookbysoftware,
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { BOOK, CODE_PAGE, CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

import { projectmemory } from '../memoryproject'
import {
  memorypushsimsyncdirty,
  memorysyncadmitboardrunner,
} from '../memorysimsync'
import { ackboardrunners } from '../state'

describe('memorysync viewport gadget admission', () => {
  afterEach(() => {
    for (const k of Object.keys(ackboardrunners)) {
      delete ackboardrunners[k]
    }
    rxstreamreplserverclearfortests()
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
        name: boardId,
        terrain: [],
        objects: {
          [runner]: { id: runner },
          [joiner]: { id: joiner },
        },
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
        [creategadgetmemid(joiner)]: g,
      } as BOOK['flags'],
    }

    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-vpga')
    rxstreamreplserverclearfortests()

    memorysyncadmitboardrunner(runner, boardId)

    const gstream = gadgetstream(joiner)
    const entry = rxstreamreplserverreadstream(gstream)
    expect(entry?.players.has(runner)).toBe(true)
    expect(entry?.players.get(runner)?.writable).toBe(true)
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
        name: boardId,
        terrain: [],
        objects: {
          [runner]: { id: runner },
          [joiner]: { id: joiner },
        },
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
        [creategadgetmemid(joiner)]: gj,
      } as BOOK['flags'],
    }

    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-vpga2')
    rxstreamreplserverclearfortests()
    rxstreamreplserverregister(memorystream(), projectmemory())

    ackboardrunners[boardId] = Date.now()
    memorysyncadmitboardrunner(runner, boardId)

    let gjoin = rxstreamreplserverreadstream(gadgetstream(joiner))
    expect(gjoin?.players.has(joiner) ?? false).toBe(false)

    const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    expect(main).toBeDefined()
    memorywritebookflag(main, joiner, 'board', boardId)
    memorypushsimsyncdirty()

    gjoin = rxstreamreplserverreadstream(gadgetstream(joiner))
    expect(gjoin?.players.has(runner)).toBe(true)
  })
})
