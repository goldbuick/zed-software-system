import { findterminalrowindexfromcoords } from 'zss/screens/terminal/logrowhitcoords'

describe('findterminalrowindexfromcoords', () => {
  it('returns sessioncount + pin index on sticky pin row', () => {
    const index = findterminalrowindexfromcoords({
      tapeycursor: 0,
      scroll: 0,
      pinycoords: [0],
      pinheights: [1],
      sessionycoords: [22],
      sessionheights: [1],
      pinbandbottom: 1,
    })
    expect(index).toBe(1)
  })

  it('pin band wins over overlapped session row', () => {
    const index = findterminalrowindexfromcoords({
      tapeycursor: 0,
      scroll: 8,
      pinycoords: [0],
      pinheights: [1],
      sessionycoords: [-8],
      sessionheights: [1],
      pinbandbottom: 1,
    })
    expect(index).toBe(1)
  })

  it('returns session index for session log rows below the pin band', () => {
    const index = findterminalrowindexfromcoords({
      tapeycursor: 22,
      scroll: 0,
      pinycoords: [0],
      pinheights: [1],
      sessionycoords: [22],
      sessionheights: [1],
      pinbandbottom: 1,
    })
    expect(index).toBe(0)
  })

  it('skips session rows clipped under the sticky pin band', () => {
    const index = findterminalrowindexfromcoords({
      tapeycursor: 0,
      scroll: 0,
      pinycoords: [0],
      pinheights: [1],
      sessionycoords: [0],
      sessionheights: [1],
      pinbandbottom: 1,
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
      pinbandbottom: 1,
    })
    expect(index).toBeUndefined()
  })
})
