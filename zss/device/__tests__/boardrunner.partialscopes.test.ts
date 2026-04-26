jest.mock('zss/device/rxrepl/partialscopes', () => ({
  streamreplpartialscopesOnOwnedBoardsChange: jest.fn(),
  streamreplpartialscopesOnGadgetFlagsPeersChange: jest.fn(),
}))
jest.mock('zss/memory/runtime', () => ({
  ...jest.requireActual('zss/memory/runtime'),
  memorytickmain: jest.fn(),
}))
jest.mock('zss/device/vm/handlers/pilot', () => ({
  ...jest.requireActual('zss/device/vm/handlers/pilot'),
  pilottick: jest.fn(),
}))

import { createchipid } from 'zss/chip'
import { createmessage } from 'zss/device'
import * as partialscopes from 'zss/device/rxrepl/partialscopes'
import * as pilot from 'zss/device/vm/handlers/pilot'
import { hub } from 'zss/hub'
import { memorytrackingflagsbagid } from 'zss/memory/boardchipflags'
import { flagsstream } from 'zss/memory/memorydirty'
import * as playermanagement from 'zss/memory/playermanagement'
import * as runtime from 'zss/memory/runtime'
import * as session from 'zss/memory/session'
import { BOARD, BOOK, CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

import { setassignedplayer } from '../boardrunner'

describe('boardrunner partial repl scope', () => {
  const boardaddr = 'addr_pscope'

  function makemainbook(): BOOK {
    return {
      id: 'main-pscope',
      name: 'main',
      timestamp: 0,
      activelist: ['p1'],
      pages: [],
      flags: { p1: { board: boardaddr } },
    }
  }

  beforeEach(() => {
    session.memoryresetbooks([makemainbook()])
    session.memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-pscope')
    session.memorywritefreeze(false)
    jest.spyOn(playermanagement, 'memoryreadplayers').mockReturnValue(['p1'])
    jest
      .spyOn(playermanagement, 'memoryreadplayerboard')
      .mockReturnValue({ id: boardaddr } as BOARD)
    setassignedplayer('p1')
    jest.clearAllMocks()
  })

  afterEach(() => {
    session.memoryresetbooks([])
    jest.restoreAllMocks()
  })

  it('updates owned boards and flags peers when assigned board changes', () => {
    hub.invoke(createmessage('ses_br_pscope', 'p1', 'vm', 'ready', undefined))
    jest.clearAllMocks()
    hub.invoke(
      createmessage(
        'ses_br_pscope',
        'p1',
        'vm',
        'boardrunner:ownedboard',
        boardaddr,
      ),
    )

    expect(
      partialscopes.streamreplpartialscopesOnOwnedBoardsChange,
    ).toHaveBeenCalled()
    const ownedarg = jest.mocked(
      partialscopes.streamreplpartialscopesOnOwnedBoardsChange,
    ).mock.calls[0][0]
    expect(ownedarg.has(boardaddr)).toBe(true)

    expect(
      partialscopes.streamreplpartialscopesOnGadgetFlagsPeersChange,
    ).toHaveBeenCalled()
    const mock = jest.mocked(
      partialscopes.streamreplpartialscopesOnGadgetFlagsPeersChange,
    )
    const call = mock.mock.calls.at(-1)
    const peerarg = call?.[0] as Set<string> | undefined
    expect(peerarg?.has('p1')).toBe(true)
    expect(peerarg?.has(memorytrackingflagsbagid(boardaddr))).toBe(true)
  })

  it('gates first tick until player/chip/tracking flags streams hydrate', () => {
    const chipbagid = createchipid('p1')
    const trackingbagid = memorytrackingflagsbagid(boardaddr)
    session.memoryresetbooks([
      {
        id: 'main-gate',
        name: 'main',
        timestamp: 0,
        activelist: ['p1'],
        pages: [
          {
            id: boardaddr,
            code: `@board ${boardaddr}\n`,
            stats: { type: CODE_PAGE_TYPE.BOARD },
            board: {
              id: boardaddr,
              name: boardaddr,
              terrain: [],
              objects: {
                p1: {
                  id: 'p1',
                  x: 1,
                  y: 1,
                  kind: '',
                  code: '',
                  char: 2,
                  color: 15,
                  bg: 0,
                  cycle: 1,
                },
              },
            },
          },
        ],
        flags: {
          p1: { board: boardaddr },
        },
      },
    ])
    session.memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-gate')

    hub.invoke(createmessage('ses_br_pscope', 'p1', 'vm', 'ready', undefined))
    hub.invoke(
      createmessage(
        'ses_br_pscope',
        'p1',
        'vm',
        'boardrunner:ownedboard',
        boardaddr,
      ),
    )

    hub.invoke(
      createmessage('ses_br_pscope', 'p1', 'vm', 'boardrunner:tick', 1),
    )
    expect(jest.mocked(runtime.memorytickmain)).not.toHaveBeenCalled()
    expect(jest.mocked(pilot.pilottick)).not.toHaveBeenCalled()

    hub.invoke(
      createmessage(
        'ses_br_pscope',
        'p1',
        'vm',
        `${flagsstream('p1')}:changed`,
        {
          streamid: flagsstream('p1'),
          document: { board: boardaddr },
        },
      ),
    )
    hub.invoke(
      createmessage(
        'ses_br_pscope',
        'p1',
        'vm',
        `${flagsstream(trackingbagid)}:changed`,
        {
          streamid: flagsstream(trackingbagid),
          document: { tick: 1 },
        },
      ),
    )
    hub.invoke(
      createmessage('ses_br_pscope', 'p1', 'vm', 'boardrunner:tick', 2),
    )
    expect(jest.mocked(runtime.memorytickmain)).not.toHaveBeenCalled()

    hub.invoke(
      createmessage(
        'ses_br_pscope',
        'p1',
        'vm',
        `${flagsstream(chipbagid)}:changed`,
        {
          streamid: flagsstream(chipbagid),
          document: { ec: 77, lb: [] },
        },
      ),
    )
    hub.invoke(
      createmessage('ses_br_pscope', 'p1', 'vm', 'boardrunner:tick', 3),
    )
    expect(jest.mocked(runtime.memorytickmain)).toHaveBeenCalledTimes(1)
    expect(jest.mocked(pilot.pilottick)).toHaveBeenCalledTimes(1)
  })
})
