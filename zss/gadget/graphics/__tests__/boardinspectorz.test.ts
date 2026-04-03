import { RUNTIME } from 'zss/config'
import { createsprites } from 'zss/gadget/data/types'
import {
  BOARD_INSPECTOR_Z_BUFFER,
  boardinspectorzfromgadgetstacks,
} from 'zss/gadget/graphics/boardinspectorz'
import { maptolayerz } from 'zss/gadget/graphics/layerz'

describe('boardinspectorzfromgadgetstacks', () => {
  const drawh = RUNTIME.DRAW_CHAR_HEIGHT()

  it('returns buffer when stacks are empty', () => {
    expect(boardinspectorzfromgadgetstacks('iso', [], [], [])).toBe(
      BOARD_INSPECTOR_Z_BUFFER,
    )
  })

  it('clears iso over sprites with drawheight + 1 boost', () => {
    const over = [createsprites('o', 0)]
    const z = boardinspectorzfromgadgetstacks('iso', [], over, [])
    const expected =
      maptolayerz(over[0], 'iso') + drawh + 1 + BOARD_INSPECTOR_Z_BUFFER
    expect(z).toBe(expected)
  })

  it('includes exit preview layers', () => {
    const exitlayer = createsprites('e', 0)
    const z = boardinspectorzfromgadgetstacks('fpv', [], [], [[exitlayer]])
    expect(z).toBe(maptolayerz(exitlayer, 'fpv') + BOARD_INSPECTOR_Z_BUFFER)
  })
})
