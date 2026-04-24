/**
 * Boardrunner defers `memorytickmain` until scoped repl catch-up completes
 * (`boardrunnerscopedcatchupwithtimeout`).
 */
jest.mock('zss/memory/runtime', () => {
  const actual = jest.requireActual<typeof import('zss/memory/runtime')>(
    'zss/memory/runtime',
  )
  return {
    ...actual,
    memorytickmain: jest.fn(),
  }
})

jest.mock('../boardrunnerreplcatchup', () => {
  const resolvestore: { current?: () => void } = {}
  return {
    BOARDRUNNER_REPL_CATCHUP_TIMEOUT_MS: 15_000,
    boardrunnerscopedcatchupwithtimeout: jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvestore.current = resolve
        }),
    ),
    __testresolveboardrunnercatchup: () => resolvestore.current?.(),
  }
})

import { createmessage } from 'zss/device'
import { hub } from 'zss/hub'
import * as playermanagement from 'zss/memory/playermanagement'
import * as runtime from 'zss/memory/runtime'
import * as session from 'zss/memory/session'
import { BOARD, BOOK, MEMORY_LABEL } from 'zss/memory/types'

import { setassignedplayer } from '../boardrunner'

const catchupmod = jest.requireMock('../boardrunnerreplcatchup') as {
  __testresolveboardrunnercatchup: () => void
}

describe('boardrunner tick gate', () => {
  const boardaddr = 'addr_tickgate'

  function makemainbook(): BOOK {
    return {
      id: 'main-tickgate',
      name: 'main',
      timestamp: 0,
      activelist: ['p1'],
      pages: [],
      flags: { p1: { board: boardaddr } },
    }
  }

  beforeEach(() => {
    session.memoryresetbooks([makemainbook()])
    session.memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-tickgate')
    session.memorywritefreeze(false)
    jest.spyOn(playermanagement, 'memoryreadplayers').mockReturnValue(['p1'])
    jest
      .spyOn(playermanagement, 'memoryreadplayerboard')
      .mockReturnValue({ id: boardaddr } as BOARD)
    setassignedplayer('p1')
  })

  afterEach(() => {
    session.memoryresetbooks([])
    jest.restoreAllMocks()
  })

  it('does not run memorytickmain until repl catch-up promise resolves', async () => {
    hub.invoke(
      createmessage('ses_br_tickgate', 'p1', 'vm', 'ready', undefined),
    )
    hub.invoke(
      createmessage(
        'ses_br_tickgate',
        'p1',
        'vm',
        'boardrunner:ownedboard',
        boardaddr,
      ),
    )

    hub.invoke(
      createmessage('ses_br_tickgate', 'p1', 'vm', 'boardrunner:tick', 1),
    )
    expect(jest.mocked(runtime.memorytickmain)).not.toHaveBeenCalled()

    catchupmod.__testresolveboardrunnercatchup()
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })

    hub.invoke(
      createmessage('ses_br_tickgate', 'p1', 'vm', 'boardrunner:tick', 2),
    )
    expect(jest.mocked(runtime.memorytickmain)).toHaveBeenCalledTimes(1)
  })
})
