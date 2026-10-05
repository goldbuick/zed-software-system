import {
  memorycreateboard,
  memoryexportboard,
  memoryimportboard,
} from 'zss/memory/boardlifecycle'

describe('board currenttick save', () => {
  it('roundtrips currenttick on wire and json export', () => {
    const board = memorycreateboard()
    board.currenttick = 17

    const wire = memoryimportboard(memoryexportboard(board))
    expect(wire?.currenttick).toBe(17)

    const json = memoryimportboard(
      memoryexportboard(board, { format: 'json' }),
      { format: 'json' },
    )
    expect(json?.currenttick).toBe(17)
  })

  it('leaves currenttick unset when the save has none', () => {
    const restored = memoryimportboard(memoryexportboard(memorycreateboard()))
    expect(restored?.currenttick).toBeUndefined()
  })
})
