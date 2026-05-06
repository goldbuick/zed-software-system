import {
  creategadgetid,
  createlayersid,
  createpid,
  createsynthid,
  createtrackingid,
} from 'zss/mapping/guid'

import { memorycollectboundaryidsforboard } from '../boundaryrouting'
import type { BOARD, BOOK } from '../types'

describe('memorycollectboundaryidsforboard', () => {
  it('collects synth, layers, and optional tracking flag boundaries when present', () => {
    const board: BOARD = {
      id: 'bd1',
      name: 'b',
      terrain: [],
      objects: {},
    }
    const book = {
      id: 'bk',
      name: 'main',
      timestamp: 0,
      activelist: [],
      pages: [],
      flags: {
        [createsynthid('bd1')]: 's1',
        [createlayersid('bd1')]: 'l1',
        [createtrackingid('bd1')]: 't1',
      },
    } as BOOK

    const ids = memorycollectboundaryidsforboard(book, board)
    expect([...ids].sort()).toEqual(['l1', 's1', 't1'].sort())
  })

  it('adds player flags and gadget owners for pids on the board', () => {
    const pid = createpid()
    const board: BOARD = {
      id: 'bd2',
      name: 'b',
      terrain: [],
      objects: {
        [pid]: { id: pid, x: 0, y: 0 } as BOARD['objects'][string],
      },
    }
    const book = {
      id: 'bk2',
      name: 'main',
      timestamp: 0,
      activelist: [],
      pages: [],
      flags: {
        [createsynthid('bd2')]: 'sx',
        [pid]: 'pf',
        [creategadgetid(pid)]: 'gf',
      },
    } as BOOK

    const ids = memorycollectboundaryidsforboard(book, board)
    expect(ids.has('sx')).toBe(true)
    expect(ids.has('pf')).toBe(true)
    expect(ids.has('gf')).toBe(true)
  })

  it('skips flag owners not present on book.flags', () => {
    const board: BOARD = {
      id: 'bd3',
      name: 'b',
      terrain: [],
      objects: {},
    }
    const book = {
      id: 'bk3',
      name: 'main',
      timestamp: 0,
      activelist: [],
      pages: [],
      flags: {},
    } as BOOK

    expect([...memorycollectboundaryidsforboard(book, board)]).toEqual([])
  })
})
