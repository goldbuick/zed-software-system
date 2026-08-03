import {
  computestatushintrect,
  computeterminalstatushintrect,
} from 'zss/screens/tape/autocompleteui'

describe('computestatushintrect', () => {
  it('places the strip on edge.bottom between corner insets', () => {
    const edge = { left: 0, right: 79, bottom: 24 }
    expect(computestatushintrect(edge)).toEqual({
      x: 1,
      y: 24,
      right: 78,
    })
  })
})

describe('computeterminalstatushintrect', () => {
  it('places the strip on the divider row above the input', () => {
    const edge = { left: 0, right: 79, bottom: 24 }
    expect(computeterminalstatushintrect(edge)).toEqual({
      x: 1,
      y: 23,
      right: 78,
    })
  })
})
