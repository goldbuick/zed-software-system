import {
  fullboardrect,
  normalizerect,
  parserectfromnumbers,
  parserectoneword,
  recttargetpts,
} from 'zss/words/rect'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

describe('rect helpers', () => {
  it('normalizes swapped corners', () => {
    expect(normalizerect(5, 4, 1, 2)).toEqual({
      pt1: { x: 1, y: 2 },
      pt2: { x: 5, y: 4 },
    })
  })

  it('parses one-word x1,y1,x2,y2', () => {
    expect(parserectoneword('0,0,5,5')).toEqual({
      pt1: { x: 0, y: 0 },
      pt2: { x: 5, y: 5 },
    })
    expect(parserectoneword(' 10 , 5 , 20 , 12 ')).toEqual({
      pt1: { x: 10, y: 5 },
      pt2: { x: 20, y: 12 },
    })
  })

  it('rejects non-rect strings', () => {
    expect(parserectoneword('0,0')).toBeUndefined()
    expect(parserectoneword('slime')).toBeUndefined()
    expect(parserectoneword(3)).toBeUndefined()
  })

  it('parses four numbers and advances index', () => {
    const words = [10, 5, 20, 12, 'slime']
    expect(parserectfromnumbers(words, 0)).toEqual({
      rect: { pt1: { x: 10, y: 5 }, pt2: { x: 20, y: 12 } },
      next: 4,
    })
  })

  it('parses two numbers as a single cell', () => {
    expect(parserectfromnumbers([3, 7, 'all'], 0)).toEqual({
      rect: { pt1: { x: 3, y: 7 }, pt2: { x: 3, y: 7 } },
      next: 2,
    })
  })

  it('fills in-board target pts for a small AABB', () => {
    expect(recttargetpts({ x: 1, y: 1 }, { x: 2, y: 2 })).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ])
  })

  it('fullboardrect matches board size', () => {
    expect(fullboardrect()).toEqual({
      pt1: { x: 0, y: 0 },
      pt2: { x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 },
    })
  })
})
