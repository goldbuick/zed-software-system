jest.mock('zss/device/rxrepl/partialscopes', () => ({
  streamreplpartialscopesOnOwnedBoardsChange: jest.fn(),
  streamreplpartialscopesOnGadgetFlagsPeersChange: jest.fn(),
}))

import { createmessage } from 'zss/device'
import * as partialscopes from 'zss/device/rxrepl/partialscopes'
import { hub } from 'zss/hub'
import { memorytrackingflagsbagid } from 'zss/memory/boardchipflags'
import * as playermanagement from 'zss/memory/playermanagement'
import * as session from 'zss/memory/session'
import { BOARD, BOOK, MEMORY_LABEL } from 'zss/memory/types'

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

  it('updates owned boards and gadget/flags peers when assigned board changes', () => {
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
    const peers = jest.mocked(
      partialscopes.streamreplpartialscopesOnGadgetFlagsPeersChange,
    ).mock.calls[0][0]
    expect(peers.has('p1')).toBe(true)
    expect(peers.has(memorytrackingflagsbagid(boardaddr))).toBe(true)
  })
})
