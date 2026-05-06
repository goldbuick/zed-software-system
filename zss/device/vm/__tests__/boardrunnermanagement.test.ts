import * as array from 'zss/mapping/array'
import {
  boardrunnerassignmentvalid,
  boardrunnerbudgetdec,
  boardrunnereligibleforboard,
  boardrunnerelect,
  boardrunnerevict,
} from 'zss/device/vm/boardrunnermanagement'
import {
  boardrunneracks,
  boardrunnerblocked,
  boardrunners,
} from 'zss/device/vm/state'
import type { BOARD } from 'zss/memory/types'

function stubboard(id: string, pids: string[]): BOARD {
  const objects: BOARD['objects'] = {}
  for (const pid of pids) {
    objects[pid] = {}
  }
  return { id, terrain: [], objects }
}

function clearboardrunnerstate(boardidlocal: string, pids: string[]) {
  delete boardrunners[boardidlocal]
  for (const pid of pids) {
    delete boardrunneracks[pid]
    delete boardrunnerblocked[pid]
  }
}

describe('boardrunnermanagement', () => {
  const boardid = 'board_test'
  const pid1 = 'pid_0000_aaaaaaaaaaaaaaaa'
  const pid2 = 'pid_1111_bbbbbbbbbbbbbbbb'

  afterEach(() => {
    clearboardrunnerstate(boardid, [pid1, pid2])
    jest.restoreAllMocks()
  })

  describe('boardrunnereligibleforboard', () => {
    it('returns players on board that are not blocked', () => {
      const board = stubboard(boardid, [pid1, pid2])
      boardrunnerblocked[pid1] = true
      expect(boardrunnereligibleforboard(board)).toEqual([pid2])
    })

    it('returns empty for missing board', () => {
      expect(boardrunnereligibleforboard(undefined)).toEqual([])
    })
  })

  describe('boardrunnerassignmentvalid', () => {
    it('is true when runner matches, is on board, and not blocked', () => {
      const board = stubboard(boardid, [pid1])
      boardrunners[boardid] = pid1
      expect(boardrunnerassignmentvalid(board, pid1)).toBe(true)
    })

    it('is false when player is not the mapped runner', () => {
      const board = stubboard(boardid, [pid1])
      boardrunners[boardid] = pid1
      expect(boardrunnerassignmentvalid(board, pid2)).toBe(false)
    })

    it('is false when runner left the board', () => {
      const board = stubboard(boardid, [])
      boardrunners[boardid] = pid1
      expect(boardrunnerassignmentvalid(board, pid1)).toBe(false)
    })

    it('is false when runner is blocked', () => {
      const board = stubboard(boardid, [pid1])
      boardrunners[boardid] = pid1
      boardrunnerblocked[pid1] = true
      expect(boardrunnerassignmentvalid(board, pid1)).toBe(false)
    })
  })

  describe('boardrunnerevict', () => {
    it('does nothing when runnerid does not match stored', () => {
      boardrunners[boardid] = pid1
      boardrunneracks[pid1] = 10
      boardrunnerevict(boardid, pid2)
      expect(boardrunners[boardid]).toBe(pid1)
      expect(boardrunneracks[pid1]).toBe(10)
    })

    it('clears runner and ack when runnerid matches', () => {
      boardrunners[boardid] = pid1
      boardrunneracks[pid1] = 10
      boardrunnerevict(boardid, pid1)
      expect(boardrunners[boardid]).toBeUndefined()
      expect(boardrunneracks[pid1]).toBeUndefined()
    })

    it('clears stored runner when runnerid omitted', () => {
      boardrunners[boardid] = pid1
      boardrunneracks[pid1] = 3
      boardrunnerevict(boardid)
      expect(boardrunners[boardid]).toBeUndefined()
      expect(boardrunneracks[pid1]).toBeUndefined()
    })

    it('sets blocked when setblocked true', () => {
      boardrunners[boardid] = pid1
      boardrunneracks[pid1] = 5
      boardrunnerevict(boardid, pid1, { setblocked: true })
      expect(boardrunnerblocked[pid1]).toBe(true)
    })
  })

  describe('boardrunnerelect', () => {
    it('returns undefined when nobody eligible', () => {
      expect(boardrunnerelect(boardid, [], 99)).toBeUndefined()
      expect(boardrunners[boardid]).toBeUndefined()
    })

    it('picks, assigns runner, and sets ack budget', () => {
      jest.spyOn(array, 'pick').mockImplementation(((...args: string[]) =>
        args.flat()[0]) as never)
      const elected = boardrunnerelect(boardid, [pid1, pid2], 7)
      expect(elected).toBe(pid1)
      expect(boardrunners[boardid]).toBe(pid1)
      expect(boardrunneracks[pid1]).toBe(7)
    })
  })

  describe('boardrunnerbudgetdec', () => {
    it('is no-op without a runner', () => {
      expect(boardrunnerbudgetdec(boardid)).toBe(false)
    })

    it('is no-op when ack is missing', () => {
      boardrunners[boardid] = pid1
      expect(boardrunnerbudgetdec(boardid)).toBe(false)
    })

    it('decrements ack and returns false when still >= 1', () => {
      boardrunners[boardid] = pid1
      boardrunneracks[pid1] = 2
      expect(boardrunnerbudgetdec(boardid)).toBe(false)
      expect(boardrunneracks[pid1]).toBe(1)
    })

    it('evicts with block when exhausted', () => {
      boardrunners[boardid] = pid1
      boardrunneracks[pid1] = 1
      expect(boardrunnerbudgetdec(boardid)).toBe(true)
      expect(boardrunners[boardid]).toBeUndefined()
      expect(boardrunneracks[pid1]).toBeUndefined()
      expect(boardrunnerblocked[pid1]).toBe(true)
    })
  })
})
