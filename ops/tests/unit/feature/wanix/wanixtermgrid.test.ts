import { readwanixtermgridsize } from 'zss/feature/wanix/wanixtermgrid'

describe('readwanixtermgridsize', () => {
  it('maps edge width and height to cols and rows', () => {
    expect(readwanixtermgridsize({ width: 80, height: 24 })).toEqual({
      cols: 80,
      rows: 24,
    })
  })

  it('clamps zero and negative dimensions to 1', () => {
    expect(readwanixtermgridsize({ width: 0, height: -3 })).toEqual({
      cols: 1,
      rows: 1,
    })
  })
})
