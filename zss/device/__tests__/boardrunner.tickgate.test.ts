/**
 * Scoped repl catch-up runs in the background; the worker must still run
 * `memorytickmain` every tick (regression: do not gate on catch-up).
 */
jest.mock('zss/memory/runtime', () => {
  const actual =
    jest.requireActual<typeof import('zss/memory/runtime')>(
      'zss/memory/runtime',
    )
  return {
    ...actual,
    memorytickmain: jest.fn(),
  }
})

jest.mock('../boardrunnerreplcatchup', () => {
  return {
    BOARDRUNNER_REPL_CATCHUP_TIMEOUT_MS: 15_000,
    boardrunnerscopedcatchupwithtimeout: jest.fn(
      () => new Promise<void>(() => {}),
    ),
  }
})

import { createmessage } from 'zss/device'
import { hub } from 'zss/hub'
import * as playermanagement from 'zss/memory/playermanagement'
import * as runtime from 'zss/memory/runtime'
import * as session from 'zss/memory/session'
import { BOARD, BOOK, MEMORY_LABEL } from 'zss/memory/types'

import { setassignedplayer } from '../boardrunner'

const catchupmod = jest.requireMock('../boardrunnerreplcatchup')

describe('boardrunner tick vs repl catch-up', () => {
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

  it('runs memorytickmain on every tick even while scoped repl catch-up never completes', () => {
    hub.invoke(createmessage('ses_br_tickreg', 'p1', 'vm', 'ready', undefined))
    hub.invoke(
      createmessage(
        'ses_br_tickreg',
        'p1',
        'vm',
        'boardrunner:ownedboard',
        boardaddr,
      ),
    )
    expect(catchupmod.boardrunnerscopedcatchupwithtimeout).toHaveBeenCalled()

    hub.invoke(
      createmessage('ses_br_tickreg', 'p1', 'vm', 'boardrunner:tick', 1),
    )
    expect(jest.mocked(runtime.memorytickmain)).toHaveBeenCalledTimes(1)
    expect(jest.mocked(runtime.memorytickmain)).toHaveBeenCalledWith(
      1,
      expect.anything(),
    )

    hub.invoke(
      createmessage('ses_br_tickreg', 'p1', 'vm', 'boardrunner:tick', 2),
    )
    expect(jest.mocked(runtime.memorytickmain)).toHaveBeenCalledTimes(2)
    expect(jest.mocked(runtime.memorytickmain)).toHaveBeenLastCalledWith(
      2,
      expect.anything(),
    )
  })
})
