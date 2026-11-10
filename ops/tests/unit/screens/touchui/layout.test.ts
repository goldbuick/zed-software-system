import {
  PORTRAIT_SIDEBAR_OVERLAY_ROWS,
  PORTRAIT_TOUCH_DOCK_ROWS,
  readtouchscreenlayout,
} from 'zss/screens/touchui/layout'

const BASE = {
  saferows: 40,
  showtouchcontrols: true,
  hassidebar: false,
  sidebaropen: false,
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
    ).toEqual({ rows: 40, dockcols: 0, dockrows: 0, dockrow: 0 })
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
  })

  it('reserves the sidebar band and toggle row above the dock', () => {
    const layout = readtouchscreenlayout({
      ...BASE,
      totalcols: 40,
      totalrows: 70,
      saferows: 70,
      hassidebar: true,
      sidebaropen: true,
    })
    expect(layout.rows).toBe(
      70 - PORTRAIT_TOUCH_DOCK_ROWS - PORTRAIT_SIDEBAR_OVERLAY_ROWS - 1,
    )
    expect(layout.dockrow).toBe(70 - PORTRAIT_TOUCH_DOCK_ROWS)
  })

  it('grows the bottom dock to match soft-keyboard height', () => {
    const layout = readtouchscreenlayout({
      ...BASE,
      totalcols: 40,
      totalrows: 70,
      saferows: 40,
    })
    expect(layout.dockrows).toBe(30)
    expect(layout.rows).toBe(40)
    expect(layout.dockrow).toBe(40)
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
  })
})
