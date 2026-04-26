jest.mock('zss/device/vm/handlers/panelchipdispatch', () => ({
  ...jest.requireActual<
    typeof import('zss/device/vm/handlers/panelchipdispatch')
  >('zss/device/vm/handlers/panelchipdispatch'),
  dispatchpanelchipmessage: jest.fn(),
}))

import { createmessage } from 'zss/device'
import * as panelchip from 'zss/device/vm/handlers/panelchipdispatch'
import { hub } from 'zss/hub'
import * as playermanagement from 'zss/memory/playermanagement'
import * as session from 'zss/memory/session'
import { BOARD, BOOK, MEMORY_LABEL } from 'zss/memory/types'

import { setassignedplayer } from '../boardrunner'

describe('boardrunner panel chip messages', () => {
  const boardaddr = 'addr_panel_br'
  const sessionid = 'ses_br_panel'

  function makemainbook(): BOOK {
    return {
      id: 'main-panel-br',
      name: 'main',
      timestamp: 0,
      activelist: ['p1'],
      pages: [],
      flags: { p1: { board: boardaddr } },
    }
  }

  beforeEach(() => {
    session.memoryresetbooks([makemainbook()])
    session.memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-panel-br')
    session.memorywritefreeze(false)
    jest.spyOn(playermanagement, 'memoryreadplayers').mockReturnValue(['p1'])
    jest
      .spyOn(playermanagement, 'memoryreadplayerboard')
      .mockReturnValue({ id: boardaddr } as BOARD)
    setassignedplayer('p1')
    jest.clearAllMocks()
    hub.invoke(createmessage(sessionid, 'p1', 'vm', 'ready', undefined))
    hub.invoke(
      createmessage(sessionid, 'p1', 'vm', 'boardrunner:ownedboard', boardaddr),
    )
    jest.mocked(panelchip.dispatchpanelchipmessage).mockClear()
  })

  afterEach(() => {
    session.memoryresetbooks([])
    jest.restoreAllMocks()
  })

  it('dispatches bookmarkscroll when sender is on an owned board', () => {
    hub.invoke(
      createmessage(
        sessionid,
        'p1',
        'vm',
        'boardrunner:bookmarkscroll:bookmarkurl',
        ['https://x.example'],
      ),
    )
    expect(panelchip.dispatchpanelchipmessage).toHaveBeenCalledTimes(1)
    expect(panelchip.dispatchpanelchipmessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        player: 'p1',
        target: 'bookmarkscroll:bookmarkurl',
        data: ['https://x.example'],
      }),
      { target: 'bookmarkscroll', path: 'bookmarkurl' },
    )
  })

  it('no-ops when sender current board is not owned by this worker', () => {
    jest
      .spyOn(playermanagement, 'memoryreadplayerboard')
      .mockReturnValue({ id: 'other-board' } as BOARD)
    hub.invoke(
      createmessage(
        sessionid,
        'p1',
        'vm',
        'boardrunner:bookmarkscroll:bookmarkurl',
        [],
      ),
    )
    expect(panelchip.dispatchpanelchipmessage).not.toHaveBeenCalled()
  })
})
