import { memorylistboardelementsbyidnameorpts } from 'zss/memory/spatialqueries'
import { BOARD, BOARD_ELEMENT } from 'zss/memory/types'

describe('memorylistboardelementsbyidnameorpts', () => {
  const MIXED_ID = 'sid_hd0VuNrSi0Cg'
  const object: BOARD_ELEMENT = {
    id: MIXED_ID,
    name: 'mixbank2',
    x: 3,
    y: 4,
    kind: 'object',
  }

  function makeboard(): BOARD {
    return {
      id: 'testboard',
      terrain: [],
      objects: {
        [MIXED_ID]: object,
      },
    } as BOARD
  }

  it('finds object by exact-case id', () => {
    const board = makeboard()
    expect(memorylistboardelementsbyidnameorpts(board, [MIXED_ID])).toEqual([
      object,
    ])
  })
})
