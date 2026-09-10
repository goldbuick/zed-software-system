import { READ_LAYER, memoryreadelement } from 'zss/memory/boardaccess'
import { BOARD, BOARD_ELEMENT, BOARD_WIDTH } from 'zss/memory/types'

describe('memoryreadelement', () => {
  const OBJECT_ID = 'sid_hd0VuNrSi0Cg'
  const object: BOARD_ELEMENT = {
    id: OBJECT_ID,
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
        [OBJECT_ID]: object,
      },
    } as BOARD
  }

  it('finds object by exact id', () => {
    const board = makeboard()
    expect(memoryreadelement(board, OBJECT_ID, READ_LAYER.ANY)).toBe(object)
    expect(memoryreadelement(board, OBJECT_ID, READ_LAYER.OBJECT)).toBe(object)
  })

  it('resolves terrain by numeric board index', () => {
    const board = makeboard()
    expect(memoryreadelement(board, '1', READ_LAYER.ANY)).toBe(terraincell)
    expect(memoryreadelement(board, String(1), READ_LAYER.ANY)).toBe(
      terraincell,
    )
    // index 0 empty -> undefined terrain slot
    expect(memoryreadelement(board, '0', READ_LAYER.ANY)).toBeUndefined()
    expect(BOARD_WIDTH).toBeGreaterThan(1)
  })
})
