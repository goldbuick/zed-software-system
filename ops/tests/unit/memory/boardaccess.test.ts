import {
  memoryreadelementbyidorindex,
  memoryreadobject,
} from 'zss/memory/boardaccess'
import { BOARD, BOARD_ELEMENT, BOARD_WIDTH } from 'zss/memory/types'
import { NAME } from 'zss/words/types'

describe('memoryreadelementbyidorindex', () => {
  const MIXED_ID = 'sid_hd0VuNrSi0Cg'
  const object: BOARD_ELEMENT = {
    id: MIXED_ID,
    x: 3,
    y: 4,
    kind: 'object',
  }
  const terraincell: BOARD_ELEMENT = {
    x: 1,
    y: 0,
    kind: 'fake',
    char: 178,
  }

  function makeboard(): BOARD {
    const terrain: BOARD_ELEMENT[] = []
    terrain[1] = terraincell
    return {
      id: 'testboard',
      terrain,
      objects: {
        [MIXED_ID]: object,
      },
    } as BOARD
  }

  it('finds object by exact-case id', () => {
    const board = makeboard()
    expect(memoryreadelementbyidorindex(board, MIXED_ID)).toBe(object)
    expect(memoryreadobject(board, MIXED_ID)).toBe(object)
  })

  it('finds object when id is NAME-folded like inspect chips', () => {
    const board = makeboard()
    const folded = NAME(MIXED_ID)
    expect(folded).not.toBe(MIXED_ID)
    expect(memoryreadobject(board, folded)).toBeUndefined()
    expect(memoryreadelementbyidorindex(board, folded)).toBe(object)
  })

  it('still resolves terrain by numeric board index', () => {
    const board = makeboard()
    expect(memoryreadelementbyidorindex(board, '1')).toBe(terraincell)
    expect(memoryreadelementbyidorindex(board, String(1))).toBe(terraincell)
    // index 0 empty -> undefined terrain slot
    expect(memoryreadelementbyidorindex(board, '0')).toBeUndefined()
    expect(BOARD_WIDTH).toBeGreaterThan(1)
  })
})
