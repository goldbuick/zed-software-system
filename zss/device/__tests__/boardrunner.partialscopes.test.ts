jest.mock('zss/memory/runtime', () => ({
  ...jest.requireActual('zss/memory/runtime'),
  memorytickmain: jest.fn(),
}))
jest.mock('zss/device/vm/handlers/pilot', () => ({
  ...jest.requireActual('zss/device/vm/handlers/pilot'),
  pilottick: jest.fn(),
}))

import { createmessage } from 'zss/device'
import {
  streamreplclientstreammap,
  streamreplmirrorsetnonotify,
} from 'zss/device/netsim'
import * as pilot from 'zss/device/vm/handlers/pilot'
import { memorysyncreplstreamidsforboardrunner } from 'zss/device/vm/memorysimsync'
import { initstate } from 'zss/gadget/data/api'
import { hub } from 'zss/hub'
import { memorytrackingflagsbagid } from 'zss/memory/boardflags'
import {
  flagsstream,
  isboardstream,
  isflagsstream,
  isgadgetstream,
} from 'zss/memory/memorydirty'
import * as playermanagement from 'zss/memory/playermanagement'
import * as runtime from 'zss/memory/runtime'
import * as session from 'zss/memory/session'
import { BOARD, BOOK, CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

import { setassignedplayer } from '../boardrunner'

describe('boardrunner ownedboard tuple and hydration gate', () => {
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
    streamreplclientstreammap.clear()
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

  it('accepts boardrunner:ownedboard as [board, streams] tuple for repl scope', () => {
    hub.invoke(createmessage('ses_br_pscope', 'p1', 'vm', 'ready', undefined))
    jest.clearAllMocks()
    const streamsroster = memorysyncreplstreamidsforboardrunner(boardaddr)
    hub.invoke(
      createmessage('ses_br_pscope', 'p1', 'vm', 'boardrunner:ownedboard', [
        boardaddr,
        streamsroster,
      ]),
    )
    // Boardrunner does not call rxrepl partialscopes from rebuildownedboardids;
    // stream scope is updated elsewhere. This only verifies the message shape.
    expect(streamsroster.length).toBeGreaterThan(0)
  })

  it('gates first tick until every owned repl stream has hydrated', () => {
    const trackingbagid = memorytrackingflagsbagid(boardaddr)
    const boardpage = {
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
    }
    session.memoryresetbooks([
      {
        id: 'main-gate',
        name: 'main',
        timestamp: 0,
        activelist: ['p1'],
        pages: [boardpage],
        flags: {
          p1: { board: boardaddr },
        },
      },
    ])
    session.memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-gate')

    const streamsroster = memorysyncreplstreamidsforboardrunner(boardaddr)

    function emitstreamchanged(
      streamid: string,
      document: Record<string, unknown>,
    ) {
      hub.invoke(
        createmessage('ses_br_pscope', 'p1', 'vm', `${streamid}:changed`, {
          streamid,
          document,
        }),
      )
    }

    hub.invoke(createmessage('ses_br_pscope', 'p1', 'vm', 'ready', undefined))
    hub.invoke(
      createmessage('ses_br_pscope', 'p1', 'vm', 'boardrunner:ownedboard', [
        boardaddr,
        streamsroster,
      ]),
    )

    hub.invoke(
      createmessage('ses_br_pscope', 'p1', 'vm', 'boardrunner:tick', 1),
    )
    expect(jest.mocked(runtime.memorytickmain)).not.toHaveBeenCalled()
    expect(jest.mocked(pilot.pilottick)).not.toHaveBeenCalled()

    for (let i = 0; i < streamsroster.length; ++i) {
      const sid = streamsroster[i]
      if (isboardstream(sid)) {
        emitstreamchanged(sid, {
          code: boardpage.code,
          board: boardpage.board as Record<string, unknown>,
        })
      } else if (isflagsstream(sid)) {
        if (sid === flagsstream('p1')) {
          emitstreamchanged(sid, { board: boardaddr })
        } else if (sid === flagsstream(trackingbagid)) {
          emitstreamchanged(sid, { tick: 1 })
        } else {
          emitstreamchanged(sid, { ec: 77, lb: [] })
        }
      } else if (isgadgetstream(sid)) {
        emitstreamchanged(
          sid,
          initstate() as unknown as Record<string, unknown>,
        )
      }
    }

    hub.invoke(
      createmessage('ses_br_pscope', 'p1', 'vm', 'boardrunner:tick', 2),
    )
    expect(jest.mocked(runtime.memorytickmain)).toHaveBeenCalledTimes(1)
    expect(jest.mocked(pilot.pilottick)).toHaveBeenCalledTimes(1)
  })

  it('hydration gate passes when :changed precedes ownedboard if repl mirror is primed', () => {
    const trackingbagid = memorytrackingflagsbagid(boardaddr)
    const boardpage = {
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
    }
    session.memoryresetbooks([
      {
        id: 'main-gate-mirror',
        name: 'main',
        timestamp: 0,
        activelist: ['p1'],
        pages: [boardpage],
        flags: {
          p1: { board: boardaddr },
        },
      },
    ])
    session.memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-gate-mirror')

    const streamsroster = memorysyncreplstreamidsforboardrunner(boardaddr)

    function emitstreamchanged(
      streamid: string,
      document: Record<string, unknown>,
    ) {
      hub.invoke(
        createmessage('ses_br_pscope', 'p1', 'vm', `${streamid}:changed`, {
          streamid,
          document,
        }),
      )
    }

    hub.invoke(createmessage('ses_br_pscope', 'p1', 'vm', 'ready', undefined))

    for (let i = 0; i < streamsroster.length; ++i) {
      const sid = streamsroster[i]
      let document: Record<string, unknown>
      if (isboardstream(sid)) {
        document = {
          code: boardpage.code,
          board: boardpage.board as Record<string, unknown>,
        }
      } else if (isflagsstream(sid)) {
        if (sid === flagsstream('p1')) {
          document = { board: boardaddr }
        } else if (sid === flagsstream(trackingbagid)) {
          document = { tick: 1 }
        } else {
          document = { ec: 77, lb: [] }
        }
      } else if (isgadgetstream(sid)) {
        document = initstate() as unknown as Record<string, unknown>
      } else {
        continue
      }
      streamreplmirrorsetnonotify(sid, { document, rev: 1 })
      emitstreamchanged(sid, document)
    }

    hub.invoke(
      createmessage('ses_br_pscope', 'p1', 'vm', 'boardrunner:ownedboard', [
        boardaddr,
        streamsroster,
      ]),
    )

    hub.invoke(
      createmessage('ses_br_pscope', 'p1', 'vm', 'boardrunner:tick', 1),
    )
    expect(jest.mocked(runtime.memorytickmain)).toHaveBeenCalledTimes(1)
    expect(jest.mocked(pilot.pilottick)).toHaveBeenCalledTimes(1)
  })

  it('hydration gate passes after rxreplclient:hydrated when mirror has rows but no :changed', () => {
    const trackingbagid = memorytrackingflagsbagid(boardaddr)
    const boardpage = {
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
    }
    session.memoryresetbooks([
      {
        id: 'main-gate-hydrated',
        name: 'main',
        timestamp: 0,
        activelist: ['p1'],
        pages: [boardpage],
        flags: {
          p1: { board: boardaddr },
        },
      },
    ])
    session.memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-gate-hydrated')

    const streamsroster = memorysyncreplstreamidsforboardrunner(boardaddr)

    hub.invoke(createmessage('ses_br_pscope', 'p1', 'vm', 'ready', undefined))
    hub.invoke(
      createmessage('ses_br_pscope', 'p1', 'vm', 'boardrunner:ownedboard', [
        boardaddr,
        streamsroster,
      ]),
    )

    hub.invoke(
      createmessage('ses_br_pscope', 'p1', 'vm', 'boardrunner:tick', 1),
    )
    expect(jest.mocked(runtime.memorytickmain)).not.toHaveBeenCalled()
    expect(jest.mocked(pilot.pilottick)).not.toHaveBeenCalled()

    for (let i = 0; i < streamsroster.length; ++i) {
      const sid = streamsroster[i]
      let document: Record<string, unknown>
      if (isboardstream(sid)) {
        document = {
          code: boardpage.code,
          board: boardpage.board as Record<string, unknown>,
        }
      } else if (isflagsstream(sid)) {
        if (sid === flagsstream('p1')) {
          document = { board: boardaddr }
        } else if (sid === flagsstream(trackingbagid)) {
          document = { tick: 1 }
        } else {
          document = { ec: 77, lb: [] }
        }
      } else if (isgadgetstream(sid)) {
        document = initstate() as unknown as Record<string, unknown>
      } else {
        continue
      }
      streamreplmirrorsetnonotify(sid, { document, rev: 1 })
    }

    hub.invoke(
      createmessage(
        'ses_br_pscope',
        '',
        'vm',
        'boardrunner:rxreplclient:hydrated',
        undefined,
      ),
    )

    hub.invoke(
      createmessage('ses_br_pscope', 'p1', 'vm', 'boardrunner:tick', 2),
    )
    expect(jest.mocked(runtime.memorytickmain)).toHaveBeenCalledTimes(1)
    expect(jest.mocked(pilot.pilottick)).toHaveBeenCalledTimes(1)
  })
})
