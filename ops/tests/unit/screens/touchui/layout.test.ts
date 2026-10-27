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
  keyboardopen: false,
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
      hassidebar: true,
      sidebaropen: true,
    })
    expect(layout.rows).toBe(
      70 - PORTRAIT_TOUCH_DOCK_ROWS - PORTRAIT_SIDEBAR_OVERLAY_ROWS - 1,
    )
    expect(layout.dockrow).toBe(70 - PORTRAIT_TOUCH_DOCK_ROWS)
  })

  it('drops the dock and uses saferows while typing', () => {
    const layout = readtouchscreenlayout({
      ...BASE,
      totalcols: 40,
      totalrows: 70,
      saferows: 30,
      keyboardopen: true,
    })
    expect(layout).toEqual({ rows: 30, dockcols: 40, dockrows: 0, dockrow: 0 })
  })
})
