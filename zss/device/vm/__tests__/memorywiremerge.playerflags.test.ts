import { creategadgetmemid, createsynthmemid } from 'zss/memory/flagmemids'
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

  it('preserves pid_*_gadget when memory flags omit it but player is on activelist', () => {
    const pid = 'pid_1_gg'
    const gid = creategadgetmemid(pid)
    const existing: Record<string, BOOK_FLAGS> = {
      [pid]: { board: 'b1' },
      [gid]: { id: 'g', board: 'b1', boardname: 'x' } as unknown as BOOK_FLAGS,
    }
    const next = mergeflagspreservingvolatile(
      existing,
      { [pid]: { board: 'b2' } },
      [pid],
    )
    expect((next[gid] as unknown as { id: string }).id).toBe('g')
  })

  it('authoritative merge drops board_synth when omitted from incoming', () => {
    const brd = 'brd_1_synthm'
    const pid = 'pid_1_synthm'
    const sid = createsynthmemid(brd)
    const existing: Record<string, BOOK_FLAGS> = {
      [pid]: { board: brd } as unknown as BOOK_FLAGS,
      [sid]: { play: [] } as unknown as BOOK_FLAGS,
    }
    const next = mergeflagspreservingvolatile(
      existing,
      { [pid]: { board: brd, hp: 1 } } as Record<
        string,
        Record<string, unknown>
      >,
      [pid],
      { kind: 'authoritative' },
    )
    expect(next[sid]).toBeUndefined()
  })

  it('worker merge keeps board_synth when assigned board matches and incoming omits it', () => {
    const brd = 'brd_2_synthm'
    const pid = 'pid_2_synthm'
    const sid = createsynthmemid(brd)
    const existing: Record<string, BOOK_FLAGS> = {
      [pid]: { board: brd } as unknown as BOOK_FLAGS,
      [sid]: { play: [['x', 1]] } as unknown as BOOK_FLAGS,
    }
    const next = mergeflagspreservingvolatile(
      existing,
      { [pid]: { board: brd, hp: 2 } } as Record<
        string,
        Record<string, unknown>
      >,
      [pid],
      { kind: 'worker', preservesynthforboard: brd },
    )
    expect((next[sid] as unknown as { play: unknown }).play).toEqual([['x', 1]])
  })
})
