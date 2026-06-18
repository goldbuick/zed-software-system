import {
  flushwanixtermscreenpending,
  readwanixtermscreencells,
  resetwanixtermscreenfortest,
  wanixtermscreenreset,
  wanixtermscreenresize,
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
})
