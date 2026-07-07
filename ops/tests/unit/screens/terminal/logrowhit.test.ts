import { findterminalrowindexfromcoords } from 'zss/screens/terminal/logrowhitcoords'

describe('findterminalrowindexfromcoords', () => {
  it('returns pin index when cursor is on a fixed top pin row', () => {
    const index = findterminalrowindexfromcoords({
      tapeycursor: 0,
      scroll: 0,
      pinycoords: [0],
      pinheights: [1],
      sessionycoords: [],
      sessionheights: [],
    })
    expect(index).toBe(0)
  })

  it('pin hit-test is unaffected by scroll', () => {
    const index = findterminalrowindexfromcoords({
      tapeycursor: 0,
      scroll: 8,
      pinycoords: [0],
      pinheights: [1],
      sessionycoords: [22],
      sessionheights: [1],
    })
    expect(index).toBe(0)
  })

  it('returns pincount + session index for session log rows', () => {
    const index = findterminalrowindexfromcoords({
      tapeycursor: 22,
      scroll: 0,
      pinycoords: [0],
      pinheights: [1],
      sessionycoords: [22],
      sessionheights: [1],
    })
    expect(index).toBe(1)
  })

  it('returns undefined when cursor is not on a row', () => {
    const index = findterminalrowindexfromcoords({
      tapeycursor: 10,
      scroll: 0,
      pinycoords: [0],
      pinheights: [1],
      sessionycoords: [],
      sessionheights: [],
    })
    expect(index).toBeUndefined()
  })
})
