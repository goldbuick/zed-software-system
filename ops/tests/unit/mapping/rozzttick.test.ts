import {
  CYCLE_DEFAULT,
  rozztadvancecurrenttick,
  rozzttickactive,
} from 'zss/mapping/tick'

describe('RoZZT currenttick cycle gate', () => {
  it('never runs cycle 0', () => {
    expect(rozzttickactive(0, 0, 0)).toBe(false)
    expect(rozzttickactive(5, 0, 2)).toBe(false)
    expect(rozzttickactive(1, -1, 0)).toBe(false)
  })

  it('phases same cycle by stat index', () => {
    expect(rozzttickactive(6, 3, 0)).toBe(true)
    expect(rozzttickactive(6, 3, 1)).toBe(false)
    expect(rozzttickactive(7, 3, 1)).toBe(true)
    expect(rozzttickactive(8, 3, 2)).toBe(true)
    expect(rozzttickactive(8, 3, 0)).toBe(false)
  })

  it('wraps 420 back to 1', () => {
    expect(rozztadvancecurrenttick(419)).toBe(420)
    expect(rozztadvancecurrenttick(420)).toBe(1)
    expect(rozztadvancecurrenttick(1)).toBe(2)
  })

  it('uses the default cycle of 3 in the same formula', () => {
    expect(rozzttickactive(0, CYCLE_DEFAULT, 0)).toBe(true)
    expect(rozzttickactive(1, CYCLE_DEFAULT, 0)).toBe(false)
    expect(rozzttickactive(1, CYCLE_DEFAULT, 1)).toBe(true)
  })
})
