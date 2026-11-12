import {
  PORTRAIT_TOUCH_DOCK_ROWS,
  readtouchscreenlayout,
} from 'zss/screens/touchui/layout'

const BASE = {
  saferows: 40,
  showtouchcontrols: true,
}

describe('readtouchscreenlayout', () => {
  it('leaves desktop frames untouched', () => {
    expect(
      readtouchscreenlayout({
        ...BASE,
        totalcols: 120,
        totalrows: 40,
        showtouchcontrols: false,
      }),
    ).toEqual({
      rows: 40,
      dockcols: 0,
      dockrows: 0,
      dockrow: 0,
      showdockui: false,
      showactionrow: false,
    })
  })

  it('uses the full-width portrait dock in a landscape-sized frame', () => {
    const layout = readtouchscreenlayout({
      ...BASE,
      totalcols: 100,
      totalrows: 40,
    })
    expect(layout.dockcols).toBe(100)
    expect(layout.dockrows).toBe(PORTRAIT_TOUCH_DOCK_ROWS)
    expect(layout.rows).toBe(40 - PORTRAIT_TOUCH_DOCK_ROWS)
    expect(layout.dockrow).toBe(layout.rows)
    expect(layout.showdockui).toBe(true)
    expect(layout.showactionrow).toBe(true)
  })

  it('does not reserve vertical space for the sidebar', () => {
    const layout = readtouchscreenlayout({
      ...BASE,
      totalcols: 40,
      totalrows: 70,
      saferows: 70,
    })
    expect(layout.rows).toBe(70 - PORTRAIT_TOUCH_DOCK_ROWS)
    expect(layout.dockrow).toBe(70 - PORTRAIT_TOUCH_DOCK_ROWS)
    expect(layout.showdockui).toBe(true)
    expect(layout.showactionrow).toBe(true)
  })

  it('keeps dock height stable for soft keyboard and hides ActionRow only', () => {
    const layout = readtouchscreenlayout({
      ...BASE,
      totalcols: 40,
      totalrows: 70,
      saferows: 40,
    })
    expect(layout.dockrows).toBe(PORTRAIT_TOUCH_DOCK_ROWS)
    expect(layout.rows).toBe(70 - PORTRAIT_TOUCH_DOCK_ROWS)
    expect(layout.dockrow).toBe(70 - PORTRAIT_TOUCH_DOCK_ROWS)
    expect(layout.showdockui).toBe(true)
    expect(layout.showactionrow).toBe(false)
  })

  it('keeps the default dock when saferows matches the frame', () => {
    const layout = readtouchscreenlayout({
      ...BASE,
      totalcols: 40,
      totalrows: 70,
      saferows: 70,
    })
    expect(layout.dockrows).toBe(PORTRAIT_TOUCH_DOCK_ROWS)
    expect(layout.rows).toBe(70 - PORTRAIT_TOUCH_DOCK_ROWS)
    expect(layout.showdockui).toBe(true)
    expect(layout.showactionrow).toBe(true)
  })
})
