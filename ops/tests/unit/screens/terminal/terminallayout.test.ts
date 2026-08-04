jest.mock('zss/screens/terminal/measurerowcache', () => ({
  measurerowcached: () => 1,
}))

import {
  readnaturalpinstarty,
  readpinareaheight,
  readpinrowycoords,
  readsesslogrowycoords,
  readstickypinstarty,
  readterminallayout,
  type TextEdge,
} from 'zss/screens/terminal/terminallayout'

describe('readterminallayout', () => {
  const edge: TextEdge = {
    left: 0,
    right: 79,
    top: 0,
    bottom: 24,
    width: 80,
    height: 25,
  }

  it('places pins after session logs in the bottom-up list', () => {
    const layout = readterminallayout({
      pinlines: ['$WHITE a', '$WHITE b'],
      sessionlogs: ['$WHITE log'],
      maxwidth: 79,
      edge,
    })
    expect(layout.contentbottom).toBe(22)
    expect(layout.sessionstackbottom).toBe(22)
    expect(
      readsesslogrowycoords(layout.sessionheights, layout.sessionstackbottom),
    ).toEqual([22])
    // pin block continues upward after the session stack
    expect(layout.naturalpinstarty).toBe(20)
    expect(readpinrowycoords(layout.pinheights, layout.naturalpinstarty)).toEqual(
      [20, 21],
    )
    expect(readpinareaheight(layout.pinheights)).toBe(2)
    expect(layout.logzonetop).toBe(0)
    expect(layout.logzonebottom).toBe(22)
  })

  it('stacks pins alone above the input when there are no session logs', () => {
    const layout = readterminallayout({
      pinlines: ['$WHITE a', '$WHITE b'],
      sessionlogs: [],
      maxwidth: 79,
      edge,
    })
    expect(layout.naturalpinstarty).toBe(21)
    expect(readnaturalpinstarty(22, 0, 2)).toBe(21)
  })
})

describe('readstickypinstarty', () => {
  it('keeps natural Y when pins are already in the log zone', () => {
    expect(readstickypinstarty(20, 0, 0)).toBe(20)
  })

  it('clamps to log zone top when natural Y is above the viewport', () => {
    expect(readstickypinstarty(-4, 0, 0)).toBe(0)
    expect(readstickypinstarty(-4, 3, 0)).toBe(0)
    expect(readstickypinstarty(-4, 5, 0)).toBe(1)
  })

  it('scrolls with content once past the sticky edge', () => {
    expect(readstickypinstarty(0, 0, 0)).toBe(0)
    expect(readstickypinstarty(0, 4, 0)).toBe(4)
  })
})
