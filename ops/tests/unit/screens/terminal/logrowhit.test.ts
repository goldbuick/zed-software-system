import {
  findterminalrowindexfromcoords,
  terminalycursorforrowy,
} from 'zss/screens/terminal/logrowhitcoords'

describe('terminalycursorforrowy', () => {
  const EDGE_BOTTOM = 24

  function tapeycursorfor(ycursor: number, scroll: number) {
    return EDGE_BOTTOM - ycursor + scroll
  }

  it('lands the tape cursor on the tapped draw row', () => {
    for (const scroll of [0, 3, 17]) {
      for (const rowy of [2, 10, 22]) {
        const ycursor = terminalycursorforrowy(EDGE_BOTTOM, scroll, rowy)
        expect(tapeycursorfor(ycursor, scroll)).toBe(rowy)
      }
    }
  })

  it('selects the tapped scrolled session row', () => {
    const scroll = 5
    const sessionycoords = [14, 16, 19]
    const sessionheights = [2, 3, 1]
    sessionycoords.forEach((sy, index) => {
      const ycursor = terminalycursorforrowy(EDGE_BOTTOM, scroll, sy + scroll)
      expect(
        findterminalrowindexfromcoords({
          tapeycursor: tapeycursorfor(ycursor, scroll),
          scroll,
          pinycoords: [],
          pinheights: [],
          sessionycoords,
          sessionheights,
          pinbandbottom: 0,
        }),
      ).toBe(index)
    })
  })

  it('selects the tapped sticky pin row', () => {
    const ycursor = terminalycursorforrowy(EDGE_BOTTOM, 8, 1)
    expect(
      findterminalrowindexfromcoords({
        tapeycursor: tapeycursorfor(ycursor, 8),
        scroll: 8,
        pinycoords: [0, 1],
        pinheights: [1, 1],
        sessionycoords: [-8],
        sessionheights: [1],
        pinbandbottom: 2,
      }),
    ).toBe(2)
  })
})

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
