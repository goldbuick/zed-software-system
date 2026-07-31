import { createtiles } from 'zss/gadget/data/types'
import { BOARD_WIDTH } from 'zss/memory/types'
import { readboardsolidmask } from 'zss/screens/inspector/boardsolidmask'
import { COLLISION } from 'zss/words/types'

describe('readboardsolidmask', () => {
  it('returns all false when layers missing', () => {
    const mask = readboardsolidmask(undefined)
    expect(mask.every((v) => v === false)).toBe(true)
  })

  it('marks ISSOLID cells from TILES props', () => {
    const tiles = createtiles('p', 0, BOARD_WIDTH, 2)
    tiles.props[3] = COLLISION.ISSOLID as number
    tiles.props[BOARD_WIDTH + 1] = COLLISION.ISSOLID as number
    const mask = readboardsolidmask([tiles])
    expect(mask[3]).toBe(true)
    expect(mask[BOARD_WIDTH + 1]).toBe(true)
    expect(mask[0]).toBe(false)
  })
})
