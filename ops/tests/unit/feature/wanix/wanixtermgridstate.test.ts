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

  it('resets on resize', () => {
    const grid = createwanixtermgrid(10, 3)
    wanixtermgridwritebytes(grid, new TextEncoder().encode('x'))
    const next = wanixtermgridresize(grid, 20, 4)
    const snapshot = readwanixtermgridsnapshot(next)
    expect(snapshot.cols).toBe(20)
    expect(snapshot.rows).toBe(4)
    expect(snapshot.char.every((ch) => ch === 32)).toBe(true)
  })

  it('digest changes when cells change', () => {
    const grid = createwanixtermgrid(10, 2)
    const before = readwanixtermgridsnapshot(grid)
    wanixtermgridwritebytes(grid, new TextEncoder().encode('!'))
    const after = readwanixtermgridsnapshot(grid)
    expect(digestwanixtermcells(before)).not.toBe(digestwanixtermcells(after))
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
