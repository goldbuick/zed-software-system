import { readxtermcellsfromterm } from 'zss/feature/wanix/wanixtermcells'
import { xtermcolortozss } from 'zss/feature/wanix/wanixtermcolormap'
import { COLOR } from 'zss/words/types'

const CM_PALETTE = 0x01000000

describe('wanixtermcolormap', () => {
  it('maps default fg/bg to white on black', () => {
    expect(xtermcolortozss(0, false)).toBe(COLOR.WHITE)
    expect(xtermcolortozss(0, true)).toBe(COLOR.BLACK)
  })

  it('maps palette indices to zss colors', () => {
    expect(xtermcolortozss(CM_PALETTE | 1, false)).toBe(COLOR.RED)
    expect(xtermcolortozss(CM_PALETTE | 4, true)).toBe(COLOR.DKBLUE)
  })
})

describe('readxtermcellsfromterm', () => {
  it('reads full xterm viewport rows', () => {
    const cells = [
      { ch: 'a', fg: 0, bg: 0 },
      { ch: 'b', fg: 0, bg: 0 },
    ]
    const line = {
      length: 2,
      translateToString: () => 'ab',
      getCell: (x: number) => ({
        getChars: () => cells[x]?.ch ?? ' ',
        getWidth: () => 1,
        getFgColor: () => cells[x]?.fg ?? 0,
        getBgColor: () => cells[x]?.bg ?? 0,
      }),
    }
    const snapshot = readxtermcellsfromterm({
      cols: 2,
      rows: 3,
      buffer: {
        active: {
          length: 3,
          cursorX: 1,
          cursorY: 0,
          getLine: (y: number) => (y === 0 ? line : undefined),
        },
      },
    })
    expect(snapshot).not.toBeNull()
    expect(snapshot?.rows).toBe(3)
    expect(snapshot?.char[0]).toBe('a'.charCodeAt(0))
    expect(snapshot?.char[1]).toBe('b'.charCodeAt(0))
    expect(snapshot?.cursorx).toBe(1)
    expect(snapshot?.cursory).toBe(0)
  })

  it('maps cursor on bottom viewport row to last mirror row', () => {
    const line = {
      length: 1,
      translateToString: () => '#',
      getCell: () => ({
        getChars: () => '#',
        getWidth: () => 1,
        getFgColor: () => 0,
        getBgColor: () => 0,
      }),
    }
    const snapshot = readxtermcellsfromterm({
      cols: 1,
      rows: 2,
      buffer: {
        active: {
          length: 2,
          cursorX: 0,
          cursorY: 1,
          getLine: (y: number) => (y < 1 ? line : line),
        },
      },
    })
    expect(snapshot?.cursory).toBe(1)
    expect(snapshot?.cursorvisible).toBe(true)
  })

  it('reads viewport from baseY after scroll', () => {
    const staleline = {
      length: 1,
      translateToString: () => 'X',
      getCell: () => ({
        getChars: () => 'X',
        getWidth: () => 1,
        getFgColor: () => 0,
        getBgColor: () => 0,
      }),
    }
    const promptline = {
      length: 2,
      translateToString: () => '~#',
      getCell: (x: number) => ({
        getChars: () => (x === 0 ? '~' : '#'),
        getWidth: () => 1,
        getFgColor: () => 0,
        getBgColor: () => 0,
      }),
    }
    const basey = 5
    const snapshot = readxtermcellsfromterm({
      cols: 2,
      rows: 3,
      buffer: {
        active: {
          length: 20,
          baseY: basey,
          cursorX: 1,
          cursorY: 1,
          getLine: (y: number) => {
            if (y === 0) {
              return staleline
            }
            if (y === basey + 1) {
              return promptline
            }
            return undefined
          },
        },
      },
    })
    expect(snapshot?.rows).toBe(3)
    expect(snapshot?.char[0]).toBe(' '.charCodeAt(0))
    expect(snapshot?.char[2]).toBe('~'.charCodeAt(0))
    expect(snapshot?.char[3]).toBe('#'.charCodeAt(0))
    expect(snapshot?.cursory).toBe(1)
    expect(snapshot?.cursorvisible).toBe(true)
  })
})
