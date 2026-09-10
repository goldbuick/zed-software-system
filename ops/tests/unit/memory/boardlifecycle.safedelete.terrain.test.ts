import {
  memorycreateboard,
  memorysafedeleteelement,
  memorywriteterrain,
} from 'zss/memory/boardlifecycle'
import { memoryreadelement } from 'zss/memory/boardaccess'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorylistboardptsbyempty } from 'zss/memory/spatialqueries'
import { BOARD_WIDTH } from 'zss/memory/types'

describe('memorysafedeleteelement terrain', () => {
  it('clears the terrain slot to undefined instead of a kindless stub', () => {
    const board = memorycreateboard()
    board.id = 'board_safedelete_terrain'
    const pt = { x: 3, y: 2 }
    const written = memorywriteterrain(board, {
      ...pt,
      kind: 'blinkew',
      color: 15,
    })
    expect(written?.kind).toBe('blinkew')
    memoryensureboardready(board)

    const index = pt.x + pt.y * BOARD_WIDTH
    expect(board.terrain[index]?.kind).toBe('blinkew')

    const ok = memorysafedeleteelement(board, board.terrain[index], 1)
    expect(ok).toBe(true)
    expect(board.terrain[index]).toBeUndefined()
    expect(memoryreadelement(board, pt)).toBeUndefined()
    expect(
      memorylistboardptsbyempty(board).some((p) => p.x === pt.x && p.y === pt.y),
    ).toBe(true)
  })
})
