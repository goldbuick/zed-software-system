import type { WanixTermTileBuffer } from 'zss/device/wanixclient/state'
import {
  readwanixtermscrollstate,
  scrollwanixtermby,
  scrollwanixtermto,
} from 'zss/device/wanixclient/wanixtermscroll'

function makebuffer(
  rows: number,
  scrollbackrows = 0,
  cursory = 0,
): WanixTermTileBuffer {
  const cols = 10
  return {
    cols,
    rows,
    char: new Array(cols * rows).fill(32),
    color: new Array(cols * rows).fill(15),
    bg: new Array(cols * rows).fill(0),
    cursorx: 0,
    cursory,
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
  it('computes live viewport at offset zero anchored on cursor', () => {
    // cursor at bottom of 3-row viewport → same as totallines-based live end
    const buffer = makebuffer(3, 2, 2)
    const state = readwanixtermscrollstate(buffer, 2, 0)
    expect(state).toEqual({
      totallines: 5,
      maxoffset: 3,
      startline: 3,
      atliveline: true,
      clampedoffset: 0,
    })
  })

  it('keeps short task stdout visible when cursor is near the top', () => {
    // alpha.wasm: "Alpha run\\n" on an 80x24 grid → cursory 1; panel ~20 rows
    const buffer = makebuffer(24, 0, 1)
    const state = readwanixtermscrollstate(buffer, 20, 0)
    expect(state.startline).toBe(0)
    expect(state.atliveline).toBe(true)
    expect(state.maxoffset).toBe(0)
  })

  it('computes scrolled-back viewport', () => {
    const buffer = makebuffer(3, 2, 2)
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
