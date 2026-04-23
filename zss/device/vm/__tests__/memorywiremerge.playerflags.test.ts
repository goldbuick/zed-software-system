import { mergeplayerflagsstreamhydrate } from '../memorywiremerge'

describe('mergeplayerflagsstreamhydrate', () => {
  it('overlays wire keys without dropping local-only keys', () => {
    const bookflags: Record<string, Record<string, unknown>> = {
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
    const bookflags: Record<string, Record<string, unknown>> = {}
    mergeplayerflagsstreamhydrate(bookflags, 'pid1', { board: 'x' })
    expect(bookflags.pid1).toEqual({ board: 'x' })
  })
})
