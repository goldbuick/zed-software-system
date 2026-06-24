import {
  flushwanixtermscreenpending,
  readwanixtermscreencells,
  resetwanixtermscreenfortest,
  wanixtermscreenreset,
  wanixtermscreenresize,
  wanixtermscreensync,
  wanixtermscreenwrite,
} from 'zss/feature/wanix/wanixtermscreen'

describe('wanixtermscreen', () => {
  beforeEach(() => {
    resetwanixtermscreenfortest()
    wanixtermscreenresize(10, 3)
  })

  it('writes printable text and advances cursor', () => {
    wanixtermscreenwrite('hi')
    flushwanixtermscreenpending()
    const cells = readwanixtermscreencells()
    expect(cells.char[0]).toBe('h'.charCodeAt(0))
    expect(cells.char[1]).toBe('i'.charCodeAt(0))
    expect(cells.cursorx).toBe(2)
    expect(cells.cursory).toBe(0)
  })

  it('wraps on newline', () => {
    wanixtermscreenwrite('a\nb')
    flushwanixtermscreenpending()
    const cells = readwanixtermscreencells()
    expect(cells.char[0]).toBe('a'.charCodeAt(0))
    expect(cells.char[10]).toBe('b'.charCodeAt(0))
    expect(cells.cursorx).toBe(1)
    expect(cells.cursory).toBe(1)
  })

  it('clears on reset', () => {
    wanixtermscreenwrite('hello')
    flushwanixtermscreenpending()
    wanixtermscreenreset()
    const cells = readwanixtermscreencells()
    expect(cells.char[0]).toBe(32)
    expect(cells.cursorx).toBe(0)
    expect(cells.cursory).toBe(0)
  })

  it('coalesces multiple writes into one flush', () => {
    wanixtermscreenwrite('a')
    wanixtermscreenwrite('b')
    flushwanixtermscreenpending()
    const cells = readwanixtermscreencells()
    expect(cells.char[0]).toBe('a'.charCodeAt(0))
    expect(cells.char[1]).toBe('b'.charCodeAt(0))
  })

  it('writes printable text after resize', () => {
    resetwanixtermscreenfortest()
    wanixtermscreenresize(20, 3)
    wanixtermscreenwrite('boot banner')
    flushwanixtermscreenpending()
    const cells = readwanixtermscreencells()
    expect(cells.char[0]).toBe('b'.charCodeAt(0))
    expect(cells.char[4]).toBe(' '.charCodeAt(0))
  })

  it('syncs mirrored cells and reserves the bottom row', () => {
    resetwanixtermscreenfortest()
    wanixtermscreenresize(4, 3)
    wanixtermscreensync({
      cols: 4,
      rows: 2,
      char: [
        'a'.charCodeAt(0),
        'b'.charCodeAt(0),
        32,
        32,
        'c'.charCodeAt(0),
        32,
        32,
        32,
      ],
      color: new Array(8).fill(1),
      bg: new Array(8).fill(0),
      cursorx: 1,
      cursory: 0,
      cursorvisible: true,
    })
    const cells = readwanixtermscreencells()
    expect(cells.char[0]).toBe('a'.charCodeAt(0))
    expect(cells.char[4]).toBe('c'.charCodeAt(0))
    expect(cells.cursorx).toBe(1)
    expect(cells.cursorvisible).toBe(true)
  })

  it('clamps cursor above the hint row on sync', () => {
    resetwanixtermscreenfortest()
    wanixtermscreenresize(4, 3)
    wanixtermscreensync({
      cols: 4,
      rows: 2,
      char: new Array(8).fill(32),
      color: new Array(8).fill(1),
      bg: new Array(8).fill(0),
      cursorx: 0,
      cursory: 5,
      cursorvisible: true,
    })
    const cells = readwanixtermscreencells()
    expect(cells.cursory).toBe(1)
    expect(cells.cursorvisible).toBe(true)
  })
})
