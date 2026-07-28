import { createContext, useContext, useEffect, useMemo } from 'react'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { useEqual } from 'zss/gadget/data/useequal'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { useDeviceData } from 'zss/gadget/device'
import { useScreenSize } from 'zss/gadget/userscreen'
import { clamp } from 'zss/mapping/number'
import {
  PORTRAIT_SIDEBAR_OVERLAY_ROWS,
  TOUCH_SIDEBAR_COLS,
} from 'zss/screens/touchui/layout'
import { useShallow } from 'zustand/react/shallow'

export enum RECT_TYPE {
  PANEL,
  SCROLL,
  FRAMED,
}

export type RECT = {
  name: string
  type: RECT_TYPE
  x: number
  y: number
  width: number
  height: number
  text: PANEL_ITEM[]
}

const SIDEBAR_SIZE = TOUCH_SIDEBAR_COLS

export type ScreenChromeLayout = {
  screensize: ReturnType<typeof useScreenSize>
  rects: RECT[]
  scrollrect: RECT
  scroll: PANEL_ITEM[]
  hasscroll: boolean
  isscrollempty: boolean
}

export const ScreenUILayoutContext = createContext<ScreenChromeLayout | null>(
  null,
)

export function useScreenUILayoutContext(): ScreenChromeLayout | null {
  return useContext(ScreenUILayoutContext)
}

export function useScreenChromeLayout(
  hasscroll: boolean,
  sethasscroll: (v: boolean) => void,
): ScreenChromeLayout | null {
  const screensize = useScreenSize()
  const { islandscape, sidebaropen, sidebarclosing, showtouchcontrols, touchrailcols } =
    useDeviceData(
      useShallow((state) => ({
        islandscape: state.islandscape,
        sidebaropen: state.sidebaropen,
        sidebarclosing: state.sidebarclosing,
        showtouchcontrols: state.showtouchcontrols,
        touchrailcols: state.touchrailcols,
      })),
    )

  const scroll = useGadgetClient(useEqual((state) => state.gadget.scroll ?? []))
  const isscrollempty = scroll.length === 0
  const sidebar = useGadgetClient(
    useEqual((state) => state.gadget.sidebar ?? []),
  )

  useEffect(() => {
    if (!isscrollempty) {
      sethasscroll(true)
    }
  }, [isscrollempty, sethasscroll])

  return useMemo(() => {
    if (screensize.cols < 10 || screensize.rows < 10) {
      return null
    }

    const frame: RECT = {
      name: 'main',
      type: RECT_TYPE.FRAMED,
      x: 0,
      y: 0,
      text: [],
      width: screensize.cols,
      height: screensize.rows,
    }

    const rects: RECT[] = []

    if (sidebar.length) {
      if (!showtouchcontrols) {
        const rect = {
          name: 'sidebar',
          type: RECT_TYPE.PANEL,
          x: frame.x + frame.width - SIDEBAR_SIZE,
          y: frame.y,
          width: SIDEBAR_SIZE,
          height: frame.height,
          text: sidebar,
        }
        frame.width -= SIDEBAR_SIZE
        rects.push(rect)
      } else if (islandscape) {
        // Far right of screen: after game + shoot rail gap (0 when keyboard tucked rails).
        const rect = {
          name: 'sidebar',
          type: RECT_TYPE.PANEL,
          x: frame.width + touchrailcols,
          y: frame.y,
          width: SIDEBAR_SIZE,
          height: frame.height,
          text: sidebar,
        }
        rects.push(rect)
      } else if (sidebaropen || sidebarclosing) {
        // Portrait: reserved band when open; overlay bottom of expanded game when closing.
        const height = PORTRAIT_SIDEBAR_OVERLAY_ROWS
        const rect = {
          name: 'sidebar',
          type: RECT_TYPE.PANEL,
          x: 0,
          y: sidebaropen
            ? frame.height
            : frame.height - PORTRAIT_SIDEBAR_OVERLAY_ROWS,
          width: frame.width,
          height,
          text: sidebar,
        }
        rects.push(rect)
      }
    }

    const scrollrect: RECT = {
      name: 'scroll',
      type: RECT_TYPE.SCROLL,
      x: 0,
      y: 0,
      width: clamp(50, 40, frame.width - 2),
      height: clamp(20, 8, frame.height - 2),
      text: scroll,
    }
    scrollrect.x = frame.x + Math.floor((frame.width - scrollrect.width) * 0.5)
    scrollrect.y =
      frame.y + Math.floor((frame.height - scrollrect.height) * 0.5)

    rects.unshift(frame)

    return {
      screensize,
      rects,
      scrollrect,
      scroll,
      hasscroll,
      isscrollempty,
    }
  }, [
    hasscroll,
    islandscape,
    isscrollempty,
    screensize,
    scroll,
    showtouchcontrols,
    sidebar,
    sidebaropen,
    sidebarclosing,
    touchrailcols,
  ])
}
