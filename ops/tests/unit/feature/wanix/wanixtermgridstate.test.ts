import {
  createwanixtermgrid,
  digestwanixtermcells,
  readwanixtermgridpreview,
  readwanixtermgridsnapshot,
  wanixtermgridresize,
  wanixtermgridwritebytes,
} from 'zss/feature/wanix/wanixtermgridstate'
import { COLOR } from 'zss/words/types'

describe('wanixtermgridstate', () => {
  it('writes plain text into the grid', () => {
    const grid = createwanixtermgrid(40, 5)
    wanixtermgridwritebytes(grid, new TextEncoder().encode('Hello'))
    const snapshot = readwanixtermgridsnapshot(grid)
    expect(String.fromCharCode(snapshot.char[0])).toBe('H')
    expect(snapshot.color[0]).toBe(COLOR.WHITE)
    expect(snapshot.bg[0]).toBe(COLOR.BLACK)
  })

  it('handles newline and carriage return', () => {
    const grid = createwanixtermgrid(10, 3)
    wanixtermgridwritebytes(grid, new TextEncoder().encode('ab\r\nc'))
    const snapshot = readwanixtermgridsnapshot(grid)
    expect(String.fromCharCode(snapshot.char[10])).toBe('c')
    expect(snapshot.cursory).toBe(1)
  })

  it('reflows content on resize instead of clearing', () => {
    const grid = createwanixtermgrid(10, 3)
    wanixtermgridwritebytes(grid, new TextEncoder().encode('hello'))
    const next = wanixtermgridresize(grid, 20, 4)
    const snapshot = readwanixtermgridsnapshot(next)
    expect(snapshot.cols).toBe(20)
    expect(snapshot.rows).toBe(4)
    expect(String.fromCharCode(snapshot.char[0])).toBe('h')
    expect(String.fromCharCode(snapshot.char[4])).toBe('o')
  })

  it('rewraps long lines when columns shrink', () => {
    const grid = createwanixtermgrid(10, 3)
    wanixtermgridwritebytes(grid, new TextEncoder().encode('abcdefghij'))
    const next = wanixtermgridresize(grid, 5, 3)
    const snapshot = readwanixtermgridsnapshot(next)
    expect(String.fromCharCode(snapshot.char[0])).toBe('a')
    expect(String.fromCharCode(snapshot.char[4])).toBe('e')
    expect(String.fromCharCode(snapshot.char[5])).toBe('f')
    expect(next.wrapped[1]).toBe(true)
  })

  it('rejoins wrapped rows when columns grow', () => {
    const grid = createwanixtermgrid(5, 3)
    wanixtermgridwritebytes(grid, new TextEncoder().encode('abcdefghij'))
    const next = wanixtermgridresize(grid, 10, 3)
    const snapshot = readwanixtermgridsnapshot(next)
    expect(String.fromCharCode(snapshot.char[0])).toBe('a')
    expect(String.fromCharCode(snapshot.char[9])).toBe('j')
    expect(next.wrapped[1]).toBe(false)
  })

  it('preserves scrollback across resize when rows stay tight', () => {
    const grid = createwanixtermgrid(4, 2)
    wanixtermgridwritebytes(grid, new TextEncoder().encode('aa\nbb\ncc'))
    const next = wanixtermgridresize(grid, 6, 2)
    const snapshot = readwanixtermgridsnapshot(next)
    expect(snapshot.scrollbackrows).toBe(1)
    expect(String.fromCharCode(snapshot.scrollbackchar[0] ?? 0)).toBe('a')
    expect(String.fromCharCode(snapshot.char[0] ?? 0)).toBe('b')
    expect(String.fromCharCode(snapshot.char[6] ?? 0)).toBe('c')
  })

  it('digest changes when cells change', () => {
    const grid = createwanixtermgrid(10, 2)
    const before = readwanixtermgridsnapshot(grid)
    wanixtermgridwritebytes(grid, new TextEncoder().encode('!'))
    const after = readwanixtermgridsnapshot(grid)
    expect(digestwanixtermcells(before)).not.toBe(digestwanixtermcells(after))
  })

  it('applies red foreground from SGR', () => {
    const grid = createwanixtermgrid(10, 2)
    wanixtermgridwritebytes(grid, new TextEncoder().encode('\x1b[31mred'))
    const snapshot = readwanixtermgridsnapshot(grid)
    expect(snapshot.color[0]).toBe(COLOR.DKRED)
    expect(snapshot.color[1]).toBe(COLOR.DKRED)
    expect(snapshot.color[2]).toBe(COLOR.DKRED)
  })

  it('applies blink foreground from SGR', () => {
    const grid = createwanixtermgrid(10, 2)
    wanixtermgridwritebytes(
      grid,
      new TextEncoder().encode('\x1b[32m\x1b[5mblink'),
    )
    const snapshot = readwanixtermgridsnapshot(grid)
    expect(snapshot.color[0]).toBe(COLOR.BLDKGREEN)
    expect(snapshot.color[4]).toBe(COLOR.BLDKGREEN)
  })

  it('clears blink with SGR 25', () => {
    const grid = createwanixtermgrid(10, 2)
    wanixtermgridwritebytes(
      grid,
      new TextEncoder().encode('\x1b[32m\x1b[5mab\x1b[25mcd'),
    )
    const snapshot = readwanixtermgridsnapshot(grid)
    expect(snapshot.color[0]).toBe(COLOR.BLDKGREEN)
    expect(snapshot.color[3]).toBe(COLOR.DKGREEN)
  })

  it('captures scrollback when the viewport scrolls', () => {
    const grid = createwanixtermgrid(4, 2)
    wanixtermgridwritebytes(grid, new TextEncoder().encode('aa\nbb\ncc'))
    const snapshot = readwanixtermgridsnapshot(grid)
    expect(snapshot.scrollbackrows).toBe(1)
    expect(String.fromCharCode(snapshot.scrollbackchar[0] ?? 0)).toBe('a')
    expect(String.fromCharCode(snapshot.char[0] ?? 0)).toBe('b')
    expect(String.fromCharCode(snapshot.char[4] ?? 0)).toBe('c')
  })

  it('enters alt screen and clears visible grid and scrollback', () => {
    const grid = createwanixtermgrid(10, 3)
    wanixtermgridwritebytes(grid, new TextEncoder().encode('shell\nline'))
    wanixtermgridwritebytes(grid, new TextEncoder().encode('\x1b[?1049h'))
    const snapshot = readwanixtermgridsnapshot(grid)
    expect(grid.altactive).toBe(true)
    expect(snapshot.scrollbackrows).toBe(0)
    expect(snapshot.char.every((ch) => ch === 32)).toBe(true)
  })

  it('exits alt screen and restores prior normal content', () => {
    const grid = createwanixtermgrid(10, 3)
    wanixtermgridwritebytes(grid, new TextEncoder().encode('saved'))
    wanixtermgridwritebytes(grid, new TextEncoder().encode('\x1b[?1049h'))
    wanixtermgridwritebytes(grid, new TextEncoder().encode('altonly'))
    wanixtermgridwritebytes(grid, new TextEncoder().encode('\x1b[?1049l'))
    const snapshot = readwanixtermgridsnapshot(grid)
    expect(grid.altactive).toBe(false)
    expect(String.fromCharCode(snapshot.char[0])).toBe('s')
    expect(String.fromCharCode(snapshot.char[4])).toBe('d')
  })

  it('builds a readable preview', () => {
    const grid = createwanixtermgrid(20, 2)
    wanixtermgridwritebytes(
      grid,
      new TextEncoder().encode('Hello from wanix!'),
    )
    const snapshot = readwanixtermgridsnapshot(grid)
    expect(readwanixtermgridpreview(snapshot)).toContain('Hello from wanix!')
  })
})
