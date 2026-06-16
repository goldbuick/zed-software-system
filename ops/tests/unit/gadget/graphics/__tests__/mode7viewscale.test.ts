import { VIEWSCALE } from 'zss/gadget/data/types'
import { mode7viewscalefromcameraz } from 'zss/gadget/graphics/mode7viewscale'

describe('mode7viewscalefromcameraz', () => {
  it('matches VIEWSCALE at canonical Z stops', () => {
    expect(mode7viewscalefromcameraz(-128)).toBeCloseTo(VIEWSCALE.NEAR, 6)
    expect(mode7viewscalefromcameraz(128)).toBeCloseTo(VIEWSCALE.MID, 6)
    expect(mode7viewscalefromcameraz(512)).toBeCloseTo(VIEWSCALE.FAR, 6)
  })

  it('interpolates between NEAR and MID Z', () => {
    const z = 0
    const t = (z - -128) / (128 - -128)
    const expected = VIEWSCALE.NEAR + t * (VIEWSCALE.MID - VIEWSCALE.NEAR)
    expect(mode7viewscalefromcameraz(z)).toBeCloseTo(expected, 6)
  })

  it('clamps Z outside [-128, 512] to scale at nearest stop', () => {
    expect(mode7viewscalefromcameraz(-500)).toBeCloseTo(VIEWSCALE.NEAR, 6)
    expect(mode7viewscalefromcameraz(900)).toBeCloseTo(VIEWSCALE.FAR, 6)
  })
})
