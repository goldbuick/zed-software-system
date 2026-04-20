/*
pilottick is now owned by the boardrunner worker. It reads the elected
player's board + position, runs pathfinding, and synthesizes INPUT.MOVE_*
entries onto the local flags.inputqueue. The firmware consumes the queue
on the same worker during memorytickmain. These tests exercise the
pilottick -> inputqueue chain with memory module boundaries mocked so we
don't need a real board simulation.
*/
import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  handlepilotstart,
  handlepilotstop,
  pilottick,
} from 'zss/device/vm/handlers/pilot'
import { INPUT } from 'zss/gadget/data/types'
import * as boardaccess from 'zss/memory/boardaccess'
import * as flags from 'zss/memory/flags'
import * as playermanagement from 'zss/memory/playermanagement'
import * as session from 'zss/memory/session'
import * as spatialqueries from 'zss/memory/spatialqueries'
import { BOARD, BOOK, MEMORY_LABEL } from 'zss/memory/types'

function makemainbook(): BOOK {
  return {
    id: 'main-id',
    name: 'main',
    timestamp: 0,
    activelist: ['p1'],
    pages: [],
    flags: { p1: { board: 'boardA' } },
  }
}

function makefakeboard(): BOARD {
  return {
    id: 'boardA',
    name: 'boardA',
    terrain: [],
    objects: {
      p1: { id: 'p1', kind: 'player', x: 2, y: 2 },
    },
  } as unknown as BOARD
}

describe('worker pilottick', () => {
  const dev = { emit: jest.fn() } as unknown as DEVICE

  beforeEach(() => {
    session.memoryresetbooks([makemainbook()])
    session.memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    // Module-level `pilots` state in pilot.ts persists across tests — clear
    // any lingering pilot for p1 before each run.
    handlepilotstop({
      session: '',
      player: 'p1',
      id: 'reset',
      sender: 'user',
      target: 'pilotstop',
    })
  })

  afterEach(() => {
    handlepilotstop({
      session: '',
      player: 'p1',
      id: 'reset',
      sender: 'user',
      target: 'pilotstop',
    })
    session.memoryresetbooks([])
    jest.restoreAllMocks()
  })

  it('start + tick synthesizes INPUT.MOVE_RIGHT when target is east of self', () => {
    const board = makefakeboard()
    jest.spyOn(playermanagement, 'memoryreadplayerboard').mockReturnValue(board)
    jest
      .spyOn(boardaccess, 'memoryreadobject')
      .mockReturnValue(board.objects.p1)
    jest
      .spyOn(spatialqueries, 'memoryreadboardpath')
      .mockReturnValue({ x: 3, y: 2 })

    const startmsg: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'start',
      sender: 'user',
      target: 'pilotstart',
      data: { x: 4, y: 2 },
    }
    handlepilotstart(startmsg)

    // PILOT_TICK_INTERVAL = 2, so the first pilottick is a warm-up (no work).
    pilottick(dev)
    // Second tick does the actual pathfinding + queue push.
    pilottick(dev)

    const playerflags = flags.memoryreadflags('p1') as Record<
      string,
      unknown
    > & {
      inputqueue?: [INPUT, number][]
    }
    expect(playerflags.inputqueue).toEqual([[INPUT.MOVE_RIGHT, 0]])
  })

  it('stop clears pilot state so no further inputs are queued', () => {
    jest
      .spyOn(playermanagement, 'memoryreadplayerboard')
      .mockReturnValue(
        undefined as unknown as ReturnType<
          typeof playermanagement.memoryreadplayerboard
        >,
      )

    handlepilotstart({
      session: '',
      player: 'p1',
      id: 'start',
      sender: 'user',
      target: 'pilotstart',
      data: { x: 10, y: 10 },
    })
    handlepilotstop({
      session: '',
      player: 'p1',
      id: 'stop',
      sender: 'user',
      target: 'pilotstop',
    })

    pilottick(dev)
    pilottick(dev)

    const playerflags = flags.memoryreadflags('p1') as Record<
      string,
      unknown
    > & {
      inputqueue?: unknown
    }
    expect(playerflags.inputqueue ?? []).toEqual([])
  })
})
