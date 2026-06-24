import {
  readwanixtermscreencells,
  resetwanixtermscreenfortest,
  wanixtermscreenechochar,
  wanixtermscreenecholine,
  wanixtermscreenreset,
  wanixtermscreenresize,
  wanixtermscreensync,
} from 'zss/feature/wanix/wanixtermscreen'

describe('wanixtermscreen', () => {
  beforeEach(() => {
    resetwanixtermscreenfortest()
    wanixtermscreenresize(10, 3)
  })

  it('echoes printable text and advances cursor', () => {
    wanixtermscreenechochar('h')
    wanixtermscreenechochar('i')
    const cells = readwanixtermscreencells()
    expect(cells.char[0]).toBe('h'.charCodeAt(0))
    expect(cells.char[1]).toBe('i'.charCodeAt(0))
    expect(cells.cursorx).toBe(2)
    expect(cells.cursory).toBe(0)
  })

  it('wraps on echoline newline', () => {
    wanixtermscreenecholine('a')
    wanixtermscreenechochar('b')
    const cells = readwanixtermscreencells()
    expect(cells.char[0]).toBe('a'.charCodeAt(0))
    expect(cells.char[10]).toBe('b'.charCodeAt(0))
    expect(cells.cursorx).toBe(1)
    expect(cells.cursory).toBe(1)
  })

  it('clears on reset', () => {
    wanixtermscreenechochar('hello')
    wanixtermscreenreset()
    const cells = readwanixtermscreencells()
    expect(cells.char[0]).toBe(32)
    expect(cells.cursorx).toBe(0)
    expect(cells.cursory).toBe(0)
  })

  it('echoes printable text after resize', () => {
    resetwanixtermscreenfortest()
    wanixtermscreenresize(20, 3)
    wanixtermscreenecholine('boot banner')
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
