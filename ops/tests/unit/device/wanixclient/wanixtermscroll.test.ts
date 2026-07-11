import type { WanixTermTileBuffer } from 'zss/device/wanixclient/wanixtermbuffer'
import {
  readwanixtermscrollstate,
  scrollwanixtermby,
  scrollwanixtermto,
} from 'zss/device/wanixclient/wanixtermscroll'

function makebuffer(rows: number, scrollbackrows = 0): WanixTermTileBuffer {
  const cols = 10
  return {
    cols,
    rows,
    char: new Array(cols * rows).fill(32),
    color: new Array(cols * rows).fill(15),
    bg: new Array(cols * rows).fill(0),
    cursorx: 0,
    cursory: 0,
    cursorvisible: true,
    scrollbackrows,
    scrollbackchar: new Array(scrollbackrows * cols).fill(32),
    scrollbackcolor: new Array(scrollbackrows * cols).fill(15),
    scrollbackbg: new Array(scrollbackrows * cols).fill(0),
    bracketedpaste: false,
    altactive: false,
    digest: '',
    version: 1,
  }
}

describe('wanixtermscroll', () => {
  it('computes live viewport at offset zero', () => {
    const buffer = makebuffer(3, 2)
    const state = readwanixtermscrollstate(buffer, 2, 0)
    expect(state).toEqual({
      totallines: 5,
      maxoffset: 3,
      startline: 3,
      atliveline: true,
      clampedoffset: 0,
    })
  })

  it('computes scrolled-back viewport', () => {
    const buffer = makebuffer(3, 2)
    const state = readwanixtermscrollstate(buffer, 2, 1)
    expect(state.startline).toBe(2)
    expect(state.atliveline).toBe(false)
    expect(state.clampedoffset).toBe(1)
  })

  it('clamps scroll offset by delta and max', () => {
    expect(scrollwanixtermby(1, 2, 3)).toBe(3)
    expect(scrollwanixtermby(2, -5, 3)).toBe(0)
  })

  it('jumps to top and live targets', () => {
    expect(scrollwanixtermto(0, 'top', 5)).toBe(5)
    expect(scrollwanixtermto(5, 'live', 5)).toBe(0)
  })
})
