jest.mock('zss/config', () => ({
  RUNTIME: {
    DRAW_CHAR_WIDTH: () => 8,
    DRAW_CHAR_HEIGHT: () => 16,
  },
}))

import { VIEWSCALE } from 'zss/gadget/data/types'
import { graphicsfocuspad } from 'zss/gadget/graphics/graphicsfocuspad'

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

  it('mode7 MID at ref 80×25 matches prior −10 cw horizontal and 5 ch vertical pads', () => {
    const draww = 8
    const drawh = 16
    const vw = 80 * draww
    const vh = 25 * drawh
    const { padleft, padright, padtop, padbottom } = graphicsfocuspad(
      'mode7',
      VIEWSCALE.MID,
      vw,
      vh,
    )
    expect(padleft).toBe(-10 * draww)
    expect(padright).toBe(-10 * draww)
    expect(padtop).toBe(5 * drawh)
    expect(padbottom).toBe(-5 * drawh)
  })
})
