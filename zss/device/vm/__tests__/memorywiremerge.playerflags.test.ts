import { BOOK_FLAGS } from 'zss/memory/types'

import {
  mergeflagspreservingvolatile,
  mergeplayerflagsstreamhydrate,
} from '../memorywiremerge'

describe('mergeplayerflagsstreamhydrate', () => {
  it('overlays wire keys without dropping local-only keys', () => {
    const bookflags: Record<string, BOOK_FLAGS> = {
      pid1: {
        board: 'b1',
        health: 100,
        energized: 1,
      },
    }
    mergeplayerflagsstreamhydrate(bookflags, 'pid1', {
      board: 'b2',
      deaths: 2,
    })
    expect(bookflags.pid1).toEqual({
      board: 'b2',
      health: 100,
      energized: 1,
      deaths: 2,
    })
  })

  it('creates row when missing', () => {
    const bookflags: Record<string, BOOK_FLAGS> = {}
    mergeplayerflagsstreamhydrate(bookflags, 'pid1', { board: 'x' })
    expect(bookflags.pid1).toEqual({ board: 'x' })
  })
})

describe('mergeflagspreservingvolatile', () => {
  it('preserves pid_*_chip when memory flags omit chip but player is on activelist', () => {
    const pid = 'pid_1_abcd'
    const chipid = `${pid}_chip`
    const existing: Record<string, BOOK_FLAGS> = {
      [pid]: { board: 'b1' },
      [chipid]: { ec: 9, lb: [] } as unknown as BOOK_FLAGS,
    }
    const next = mergeflagspreservingvolatile(
      existing,
      { [pid]: { board: 'b2' } },
      [pid],
    )
    expect((next[chipid] as unknown as { ec: number }).ec).toBe(9)
    expect((next[pid] as unknown as { board: string }).board).toBe('b2')
  })

  it('still drops pid_*_chip when stem player is not on activelist', () => {
    const pid = 'pid_2_efgh'
    const chipid = `${pid}_chip`
    const existing: Record<string, BOOK_FLAGS> = {
      [pid]: { board: 'b1' },
      [chipid]: { ec: 1 } as unknown as BOOK_FLAGS,
    }
    const next = mergeflagspreservingvolatile(
      existing,
      { [pid]: { board: 'b2' } },
      [],
    )
    expect(next[chipid]).toBeUndefined()
  })
})
