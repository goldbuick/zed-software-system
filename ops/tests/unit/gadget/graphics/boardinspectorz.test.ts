import { RUNTIME } from 'zss/config'
import { createsprites } from 'zss/gadget/data/types'
import {
  BOARD_INSPECTOR_Z_CLEARANCE,
  BOARD_INSPECTOR_Z_FPV,
  boardinspectorzfromgadgetstacks,
} from 'zss/gadget/graphics/boardinspectorz'
import { maptolayerz } from 'zss/gadget/graphics/layerz'

describe('boardinspectorzfromgadgetstacks', () => {
  const drawh = RUNTIME.DRAW_CHAR_HEIGHT()

  it('returns clearance when stacks are empty', () => {
    expect(boardinspectorzfromgadgetstacks('iso', [], [], [])).toBe(
      BOARD_INSPECTOR_Z_CLEARANCE,
    )
  })

  it('returns floor hug for empty fpv stacks', () => {
    expect(boardinspectorzfromgadgetstacks('fpv', [], [], [])).toBe(
      BOARD_INSPECTOR_Z_FPV,
    )
  })

  it('clears iso over sprites with drawheight + 1 boost', () => {
    const over = [createsprites('o', 0)]
    const z = boardinspectorzfromgadgetstacks('iso', [], over, [])
    const expected =
      maptolayerz(over[0], 'iso') + drawh + 1 + BOARD_INSPECTOR_Z_CLEARANCE
    expect(z).toBe(expected)
  })

  it('clears mode7 over sprites with drawheight * 1.75 boost', () => {
    const over = [createsprites('o', 0)]
    const z = boardinspectorzfromgadgetstacks('mode7', [], over, [])
    const expected =
      maptolayerz(over[0], 'mode7') + drawh * 1.75 + BOARD_INSPECTOR_Z_CLEARANCE
    expect(z).toBe(expected)
  })

  it('fpv ignores exit preview layers and hugs the floor', () => {
    const exitlayer = createsprites('e', 0)
    const z = boardinspectorzfromgadgetstacks('fpv', [], [], [[exitlayer]])
    expect(z).toBe(BOARD_INSPECTOR_Z_FPV)
  })
})
