import {
  boardrunneraccessfor,
  boardrunnerassign,
  boardrunnerassignmentvalid,
  boardrunnerboardforplayer,
  boardrunnerbudgetdec,
  boardrunnerclearaccess,
  boardrunnerelect,
  boardrunnereligibleforboard,
  boardrunnerevict,
  boardrunnerprunehydratedaccess,
  boardrunnertrackaccess,
} from 'zss/device/vm/boardrunnermanagement'
import {
  boardrunneraccess,
  boardrunneracks,
  boardrunnerblocked,
  boardrunners,
  playerrunners,
} from 'zss/device/vm/state'
import {
  memoryboundariesclear,
  memoryboundaryset,
} from 'zss/memory/boundaries'
import * as array from 'zss/mapping/array'
import { TICK_FPS } from 'zss/mapping/tick'
import * as boardaccess from 'zss/memory/boardaccess'
import * as boards from 'zss/memory/boards'
import type { BOARD } from 'zss/memory/types'

jest.mock('zss/memory/boards', () => ({
  memoryreadboardbyaddress: jest.fn(),
}))

jest.mock('zss/memory/boardaccess', () => ({
  memoryreadplayersonboard: jest.fn(),
}))

const TICK_BUDGET = Math.round(TICK_FPS * 2)

function stubboard(id: string, pids: string[]): BOARD {
  const objects: BOARD['objects'] = {}
  for (const pid of pids) {
    objects[pid] = {}
  }
  return { id, name: 'test', terrain: [], objects }
}

function clearboardrunnerstate(boardids: string[], pids: string[]) {
  for (const boardidlocal of boardids) {
    delete boardrunners[boardidlocal]
    delete boardrunneraccess[boardidlocal]
  }
  for (const pid of pids) {
    delete playerrunners[pid]
    delete boardrunneracks[pid]
    delete boardrunnerblocked[pid]
  }
}

describe('boardrunnermanagement', () => {
  const boardid = 'board_test'
  const boardid2 = 'board_test_b'
  const pid1 = 'pid_0000_aaaaaaaaaaaaaaaa'
  const pid2 = 'pid_1111_bbbbbbbbbbbbbbbb'

  afterEach(() => {
    clearboardrunnerstate([boardid, boardid2], [pid1, pid2])
    jest.mocked(boards.memoryreadboardbyaddress).mockReset()
    jest.mocked(boardaccess.memoryreadplayersonboard).mockReset()
    jest.restoreAllMocks()
  })

  describe('boardrunnereligibleforboard', () => {
    it('returns players on board that are not blocked', () => {
      const board = stubboard(boardid, [pid1, pid2])
      jest.mocked(boards.memoryreadboardbyaddress).mockReturnValue(board)
      jest
        .mocked(boardaccess.memoryreadplayersonboard)
        .mockReturnValue([pid1, pid2])
      boardrunnerblocked[pid1] = true
      expect(boardrunnereligibleforboard(boardid)).toEqual([pid2])
    })

    it('returns empty when board is missing', () => {
      jest.mocked(boards.memoryreadboardbyaddress).mockReturnValue(undefined)
      jest.mocked(boardaccess.memoryreadplayersonboard).mockReturnValue([])
      expect(boardrunnereligibleforboard(boardid)).toEqual([])
    })
  })

  describe('boardrunnerassignmentvalid', () => {
    it('is true when runner matches, is on board, and not blocked', () => {
      const board = stubboard(boardid, [pid1])
      jest.mocked(boards.memoryreadboardbyaddress).mockReturnValue(board)
      jest.mocked(boardaccess.memoryreadplayersonboard).mockReturnValue([pid1])
      boardrunners[boardid] = pid1
      expect(boardrunnerassignmentvalid(boardid)).toBe(true)
    })

    it('is false when runner left the board', () => {
      const board = stubboard(boardid, [])
      jest.mocked(boards.memoryreadboardbyaddress).mockReturnValue(board)
      jest.mocked(boardaccess.memoryreadplayersonboard).mockReturnValue([])
      boardrunners[boardid] = pid1
      expect(boardrunnerassignmentvalid(boardid)).toBe(false)
    })

    it('is false when runner is blocked', () => {
      const board = stubboard(boardid, [pid1])
      jest.mocked(boards.memoryreadboardbyaddress).mockReturnValue(board)
      jest.mocked(boardaccess.memoryreadplayersonboard).mockReturnValue([pid1])
      boardrunners[boardid] = pid1
      boardrunnerblocked[pid1] = true
      expect(boardrunnerassignmentvalid(boardid)).toBe(false)
    })
  })

  describe('boardrunnerevict', () => {
    it('returns early when no runner is assigned', () => {
      boardrunnerevict(boardid)
      expect(boardrunners[boardid]).toBeUndefined()
    })

    it('clears runner, playerrunners, and ack for the board', () => {
      boardrunnerassign(boardid, pid1)
      boardrunneracks[pid1] = 10
      boardrunnerevict(boardid)
      expect(boardrunners[boardid]).toBeUndefined()
      expect(playerrunners[pid1]).toBeUndefined()
      expect(boardrunneracks[pid1]).toBeUndefined()
    })
  })

  describe('playerrunners', () => {
    it('boardrunnerelect sets playerrunners for elected player', () => {
      const board = stubboard(boardid, [pid1, pid2])
      jest.mocked(boards.memoryreadboardbyaddress).mockReturnValue(board)
      jest
        .mocked(boardaccess.memoryreadplayersonboard)
        .mockReturnValue([pid1, pid2])
      jest
        .spyOn(array, 'pick')
        .mockImplementation(((...args: string[]) => args.flat()[0]) as never)
      boardrunnerelect(boardid)
      expect(playerrunners[pid1]).toBe(boardid)
      expect(boardrunnerboardforplayer(pid1)).toBe(boardid)
    })

    it('reassigning player to new board clears old boardrunners entry', () => {
      boardrunnerassign(boardid, pid1)
      boardrunnerassign(boardid2, pid1)
      expect(playerrunners[pid1]).toBe(boardid2)
      expect(boardrunners[boardid2]).toBe(pid1)
      expect(boardrunners[boardid]).toBeUndefined()
    })
  })

  describe('boardrunnerelect', () => {
    it('returns undefined when nobody eligible', () => {
      jest.mocked(boards.memoryreadboardbyaddress).mockReturnValue(undefined)
      jest.mocked(boardaccess.memoryreadplayersonboard).mockReturnValue([])
      expect(boardrunnerelect(boardid)).toBeUndefined()
      expect(boardrunners[boardid]).toBeUndefined()
    })

    it('picks, assigns runner, and sets ack budget', () => {
      const board = stubboard(boardid, [pid1, pid2])
      jest.mocked(boards.memoryreadboardbyaddress).mockReturnValue(board)
      jest
        .mocked(boardaccess.memoryreadplayersonboard)
        .mockReturnValue([pid1, pid2])

      jest
        .spyOn(array, 'pick')
        .mockImplementation(((...args: string[]) => args.flat()[0]) as never)
      const elected = boardrunnerelect(boardid)
      expect(elected).toBe(pid1)
      expect(boardrunners[boardid]).toBe(pid1)
      expect(playerrunners[pid1]).toBe(boardid)
      expect(boardrunneracks[pid1]).toBe(TICK_BUDGET)
      expect(boardrunnerblocked[pid1]).toBe(false)
    })
  })

  describe('boardrunneraccess', () => {
    beforeEach(() => {
      memoryboundariesclear()
      boardrunnerclearaccess(boardid)
    })

    it('boardrunnertrackaccess dedupes and boardrunneraccessfor returns ids', () => {
      boardrunnertrackaccess(boardid, 'board-b')
      boardrunnertrackaccess(boardid, 'board-b')
      expect(boardrunneraccessfor(boardid)).toEqual(['board-b'])
    })

    it('boardrunnerprunehydratedaccess removes hydrated pending ids', () => {
      boardrunnertrackaccess(boardid, 'board-b')
      memoryboundaryset('board-b', { board: { id: 'board-b' } })
      boardrunnerprunehydratedaccess(boardid)
      expect(boardrunneraccessfor(boardid)).toEqual([])
    })
  })

  describe('boardrunnerbudgetdec', () => {
    it('initializes ack and decrements once', () => {
      expect(boardrunnerbudgetdec(pid1)).toBe(false)
      expect(boardrunneracks[pid1]).toBe(TICK_BUDGET - 1)
    })

    it('returns false when still budget after decrement', () => {
      boardrunneracks[pid1] = 2
      expect(boardrunnerbudgetdec(pid1)).toBe(false)
      expect(boardrunneracks[pid1]).toBe(1)
    })

    it('returns true when budget drops below 1', () => {
      boardrunneracks[pid1] = 1
      expect(boardrunnerbudgetdec(pid1)).toBe(true)
      expect(boardrunneracks[pid1]).toBe(0)
    })

    it('does not evict runner or toggle blocked by itself', () => {
      boardrunners[boardid] = pid1
      boardrunneracks[pid1] = 1
      expect(boardrunnerbudgetdec(pid1)).toBe(true)
      expect(boardrunners[boardid]).toBe(pid1)
      expect(boardrunnerblocked[pid1]).toBeUndefined()
    })
  })
})
