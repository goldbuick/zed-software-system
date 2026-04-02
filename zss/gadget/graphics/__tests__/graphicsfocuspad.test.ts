jest.mock('zss/config', () => ({
  RUNTIME: {
    DRAW_CHAR_WIDTH: () => 8,
    DRAW_CHAR_HEIGHT: () => 16,
  },
}))

import { VIEWSCALE } from 'zss/gadget/data/types'
import { graphicsfocuspad } from 'zss/gadget/graphics/graphicsfocuspad'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

describe('graphicsfocuspad', () => {
  it('mode7 MID keeps padleft/halfw and padtop/halfh invariant when view size scales', () => {
    const draww = 8
    const drawh = 16
    const rows = 25
    const h = rows * drawh
    const vw1 = 80 * draww
    const vw2 = 160 * draww
    const p1 = graphicsfocuspad('mode7', VIEWSCALE.MID, vw1, h)
    const p2 = graphicsfocuspad('mode7', VIEWSCALE.MID, vw2, h)
    const ndcx1 = p1.padleft / (vw1 * 0.5)
    const ndcx2 = p2.padleft / (vw2 * 0.5)
    expect(ndcx1).toBeCloseTo(ndcx2, 10)
    const ndcy1 = p1.padtop / (h * 0.5)
    const ndcy2 = p2.padtop / (h * 0.5)
    expect(ndcy1).toBeCloseTo(ndcy2, 10)
  })

  it('mode7 MID at ref BOARD_WIDTH×BOARD_HEIGHT matches NDC × half extents', () => {
    const draww = 8
    const drawh = 16
    const vw = BOARD_WIDTH * draww
    const vh = BOARD_HEIGHT * drawh
    const { padleft, padright, padtop, padbottom } = graphicsfocuspad(
      'mode7',
      VIEWSCALE.MID,
      vw,
      vh,
    )
    expect(padleft).toBe(-8 * draww)
    expect(padright).toBe(-8 * draww)
    expect(padtop).toBe(-5 * drawh)
    expect(padbottom).toBe(-1 * drawh)
  })

  it('iso MID keeps padleft/halfw and padbottom/halfh invariant when view width scales', () => {
    const draww = 8
    const drawh = 16
    const rows = BOARD_HEIGHT
    const h = rows * drawh
    const vw1 = BOARD_WIDTH * draww
    const vw2 = BOARD_WIDTH * 2 * draww
    const p1 = graphicsfocuspad('iso', VIEWSCALE.MID, vw1, h)
    const p2 = graphicsfocuspad('iso', VIEWSCALE.MID, vw2, h)
    expect(p1.padleft / (vw1 * 0.5)).toBeCloseTo(p2.padleft / (vw2 * 0.5), 10)
    expect(p1.padbottom / (h * 0.5)).toBeCloseTo(p2.padbottom / (h * 0.5), 10)
  })

  it('iso NEAR keeps horizontal and bottom NDC invariant when view width scales', () => {
    const draww = 8
    const drawh = 16
    const h = BOARD_HEIGHT * drawh
    const vw1 = BOARD_WIDTH * draww
    const vw2 = BOARD_WIDTH * 3 * draww
    const p1 = graphicsfocuspad('iso', VIEWSCALE.NEAR, vw1, h)
    const p2 = graphicsfocuspad('iso', VIEWSCALE.NEAR, vw2, h)
    expect(p1.padleft / (vw1 * 0.5)).toBeCloseTo(p2.padleft / (vw2 * 0.5), 10)
    expect(p1.padbottom / (h * 0.5)).toBeCloseTo(p2.padbottom / (h * 0.5), 10)
  })

  it('iso MID at ref BOARD_WIDTH×BOARD_HEIGHT matches NDC × half extents', () => {
    const draww = 8
    const drawh = 16
    const vw = BOARD_WIDTH * draww
    const vh = BOARD_HEIGHT * drawh
    const halfw = vw * 0.5
    const halfh = vh * 0.5
    const { padleft, padright, padtop, padbottom } = graphicsfocuspad(
      'iso',
      VIEWSCALE.MID,
      vw,
      vh,
    )
    expect(padleft).toBeCloseTo((-0.5 / (BOARD_WIDTH * 0.5)) * halfw, 10)
    expect(padright).toBeCloseTo((-0.5 / (BOARD_WIDTH * 0.5)) * halfw, 10)
    expect(padtop).toBe(0)
    expect(padbottom).toBeCloseTo((-1.5 / (BOARD_HEIGHT * 0.5)) * halfh, 10)
  })
})
