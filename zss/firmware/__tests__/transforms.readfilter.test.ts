import { readtransformfilter } from 'zss/firmware/transforms'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

describe('readtransformfilter', () => {
  it('parses x1,y1,x2,y2 as one word (batch / page area style)', () => {
    const words = ['90', '0,0,3,2', 'terrain']
    const { targetset, pt1, pt2 } = readtransformfilter(words, 1)
    expect(targetset).toBe('terrain')
    expect(pt1).toEqual({ x: 0, y: 0 })
    expect(pt2).toEqual({ x: 3, y: 2 })
  })

  it('does not treat comma string as parseFloat(0) corner case', () => {
    const words = ['0,0,5,5']
    const { pt1, pt2 } = readtransformfilter(words, 0)
    expect(pt1).toEqual({ x: 0, y: 0 })
    expect(pt2).toEqual({ x: 5, y: 5 })
  })

  it('defaults to full board when no region given', () => {
    const words: (string | number)[] = ['terrain']
    const { pt1, pt2 } = readtransformfilter(words, 0)
    expect(pt1).toEqual({ x: 0, y: 0 })
    expect(pt2).toEqual({ x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 })
  })

  it('still accepts four separate numeric args x1 y1 x2 y2', () => {
    const words = [0, 1, 4, 5]
    const { pt1, pt2 } = readtransformfilter(words, 0)
    expect(pt1).toEqual({ x: 0, y: 1 })
    expect(pt2).toEqual({ x: 4, y: 5 })
  })
})
