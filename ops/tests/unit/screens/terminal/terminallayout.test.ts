jest.mock('zss/screens/terminal/measurerowcache', () => ({
  measurerowcached: () => 1,
}))

import {
  readpinareaheight,
  readpinrowycoords,
  readsesslogrowycoords,
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

  it('places pins at top and reserves log zone below', () => {
    const layout = readterminallayout({
      pinlines: ['$WHITE a', '$WHITE b'],
      sessionlogs: [],
      maxwidth: 79,
      edge,
      editoropen: false,
    })
    expect(readpinrowycoords(layout.pinheights, layout.pinstarty)).toEqual([0, 1])
    expect(readpinareaheight(layout.pinheights)).toBe(2)
    expect(layout.logzonetop).toBe(2)
    expect(layout.logzonebottom).toBe(22)
    expect(layout.logzoneheight).toBe(21)
  })

  it('assigns session logs bottom-up inside log zone', () => {
    const layout = readterminallayout({
      pinlines: ['$WHITE pin'],
      sessionlogs: ['$WHITE log'],
      maxwidth: 79,
      edge,
      editoropen: false,
    })
    expect(readsesslogrowycoords(layout.sessionheights, layout.logzonebottom)).toEqual([
      22,
    ])
  })
})
