import { readxtermcellsfromterm } from 'zss/feature/wanix/wanixtermcells'
import {
  xtermcellcolortozss,
  xtermcolortozss,
} from 'zss/feature/wanix/wanixtermcolormap'
import { COLOR } from 'zss/words/types'

const CM_P16 = 0x01000000
const CM_PALETTE = CM_P16

describe('wanixtermcolormap', () => {
  it('maps default fg/bg to white on black', () => {
    expect(xtermcolortozss(0, false)).toBe(COLOR.WHITE)
    expect(xtermcolortozss(0, true)).toBe(COLOR.BLACK)
    expect(xtermcellcolortozss(0, 0, false)).toBe(COLOR.WHITE)
    expect(xtermcellcolortozss(0, 0, true)).toBe(COLOR.BLACK)
  })

  it('maps legacy combined palette indices to zss colors', () => {
    expect(xtermcolortozss(CM_PALETTE | 1, false)).toBe(COLOR.RED)
    expect(xtermcolortozss(CM_PALETTE | 4, true)).toBe(COLOR.DKBLUE)
  })

  it('maps xterm mode+index P16 palette to zss colors', () => {
    expect(xtermcellcolortozss(CM_P16, 1, false)).toBe(COLOR.RED)
    expect(xtermcellcolortozss(CM_P16, 4, true)).toBe(COLOR.DKBLUE)
  })

  it('falls back to default for P256/RGB modes', () => {
    expect(xtermcellcolortozss(0x02000000, 196, false)).toBe(COLOR.WHITE)
    expect(xtermcellcolortozss(0x03000000, 0xff0000, false)).toBe(COLOR.WHITE)
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

  it('maps xterm palette fg/bg via getFgColorMode API', () => {
    const line = {
      length: 1,
      translateToString: () => 'd',
      getCell: () => ({
        getChars: () => 'd',
        getWidth: () => 1,
        getFgColorMode: () => CM_P16,
        getFgColor: () => 4,
        getBgColorMode: () => CM_P16,
        getBgColor: () => 2,
      }),
    }
    const snapshot = readxtermcellsfromterm({
      cols: 1,
      rows: 1,
      buffer: {
        active: {
          length: 1,
          cursorX: 0,
          cursorY: 0,
          getLine: () => line,
        },
      },
    })
    expect(snapshot?.color[0]).toBe(COLOR.BLUE)
    expect(snapshot?.bg[0]).toBe(COLOR.DKGREEN)
  })

  it('calls getFgColorMode on cell so xterm class methods keep this', () => {
    function makecell(fgmode: number, fg: number) {
      return {
        getChars: () => 'x',
        getWidth: () => 1,
        fgmode,
        fg,
        getFgColorMode() {
          return this.fgmode
        },
        getFgColor() {
          return this.fg
        },
        getBgColorMode() {
          return 0
        },
        getBgColor() {
          return 0
        },
      }
    }
    const line = {
      length: 1,
      translateToString: () => 'x',
      getCell: () => makecell(CM_P16, 1),
    }
    const snapshot = readxtermcellsfromterm({
      cols: 1,
      rows: 1,
      buffer: {
        active: {
          length: 1,
          cursorX: 0,
          cursorY: 0,
          getLine: () => line,
        },
      },
    })
    expect(snapshot?.color[0]).toBe(COLOR.RED)
  })

  it('maps legacy combined palette when mode API is absent', () => {
    const fgblue = CM_PALETTE | 4
    const bggreen = CM_PALETTE | 2
    const line = {
      length: 1,
      translateToString: () => 'd',
      getCell: () => ({
        getChars: () => 'd',
        getWidth: () => 1,
        getFgColor: () => fgblue,
        getBgColor: () => bggreen,
      }),
    }
    const snapshot = readxtermcellsfromterm({
      cols: 1,
      rows: 1,
      buffer: {
        active: {
          length: 1,
          cursorX: 0,
          cursorY: 0,
          getLine: () => line,
        },
      },
    })
    expect(snapshot?.color[0]).toBe(COLOR.BLUE)
    expect(snapshot?.bg[0]).toBe(COLOR.DKGREEN)
  })

  it('reads printf-style multi-color row via P16 mode API', () => {
    const specs = [
      { ch: 'r', fg: 1, bg: 0 },
      { ch: 'e', fg: 1, bg: 0 },
      { ch: 'd', fg: 1, bg: 0 },
      { ch: ' ', fg: 0, bg: 0 },
      { ch: 'g', fg: 2, bg: 0 },
      { ch: 'r', fg: 2, bg: 0 },
      { ch: 'e', fg: 2, bg: 0 },
      { ch: 'e', fg: 2, bg: 0 },
      { ch: 'n', fg: 2, bg: 0 },
      { ch: ' ', fg: 0, bg: 0 },
      { ch: 'b', fg: 4, bg: 0 },
      { ch: 'l', fg: 4, bg: 0 },
      { ch: 'u', fg: 4, bg: 0 },
      { ch: 'e', fg: 4, bg: 0 },
      { ch: ' ', fg: 0, bg: 0 },
      { ch: 'y', fg: 0, bg: 3 },
      { ch: 'e', fg: 0, bg: 3 },
      { ch: 'l', fg: 0, bg: 3 },
      { ch: 'l', fg: 0, bg: 3 },
      { ch: 'o', fg: 0, bg: 3 },
      { ch: 'w', fg: 0, bg: 3 },
    ]
    const line = {
      length: specs.length,
      translateToString: () => specs.map((s) => s.ch).join(''),
      getCell: (x: number) => {
        const spec = specs[x]
        if (!spec) {
          return undefined
        }
        return {
          getChars: () => spec.ch,
          getWidth: () => 1,
          getFgColorMode: () => CM_P16,
          getFgColor: () => spec.fg,
          getBgColorMode: () => CM_P16,
          getBgColor: () => spec.bg,
        }
      },
    }
    const snapshot = readxtermcellsfromterm({
      cols: specs.length,
      rows: 1,
      buffer: {
        active: {
          length: 1,
          cursorX: 0,
          cursorY: 0,
          getLine: () => line,
        },
      },
    })
    expect(snapshot).not.toBeNull()
    expect(new Set(snapshot?.color).size).toBeGreaterThan(1)
    expect(new Set(snapshot?.bg).size).toBeGreaterThan(1)
    expect(snapshot?.color[0]).toBe(COLOR.RED)
    expect(snapshot?.color[4]).toBe(COLOR.GREEN)
    expect(snapshot?.color[10]).toBe(COLOR.BLUE)
    expect(snapshot?.bg[15]).toBe(COLOR.DKYELLOW)
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
