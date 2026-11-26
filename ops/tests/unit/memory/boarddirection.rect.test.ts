import { memoryevaldir } from 'zss/memory/boarddirection'
import { memorycreateboard } from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { BOARD_ELEMENT } from 'zss/memory/types'

describe('memoryevaldir DIR.INRECT', () => {
  it('fills targets with every in-board cell of the AABB', () => {
    const board = memorycreateboard()
    memoryensureboardready(board)
    const self: BOARD_ELEMENT = { id: 'sid_self', x: 0, y: 0, kind: 'object' }
    const result = memoryevaldir(
      board,
      self,
      '',
      ['INRECT', 1, 1, 2, 2] as any,
      { x: 0, y: 0 },
    )
    expect(result.destpt).toEqual({ x: 1, y: 1 })
    expect(result.targets).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ])
  })

  it('normalizes inverted corners before filling targets', () => {
    const board = memorycreateboard()
    memoryensureboardready(board)
    const self: BOARD_ELEMENT = { id: 'sid_self', x: 0, y: 0, kind: 'object' }
    const result = memoryevaldir(
      board,
      self,
      '',
      ['INRECT', 2, 2, 1, 1] as any,
      { x: 0, y: 0 },
    )
    expect(result.destpt).toEqual({ x: 1, y: 1 })
    expect(result.targets).toHaveLength(4)
  })

  it('evaluates INRECT with no element (CLI / #change)', () => {
    const board = memorycreateboard()
    memoryensureboardready(board)
    const result = memoryevaldir(
      board,
      undefined,
      '',
      ['INRECT', 1, 1, 2, 2] as any,
      { x: 0, y: 0 },
    )
    expect(result.targets).toHaveLength(4)
    expect(result.destpt).toEqual({ x: 1, y: 1 })
  })
})
