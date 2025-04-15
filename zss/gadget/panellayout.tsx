import React, { useState } from 'react'
import { RUNTIME } from 'zss/config'
import { gadgetserver_clearscroll } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useEqual, useGadgetClient } from 'zss/gadget/data/state'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'

import { Framed } from './framed'
import { StaticDither } from './framedlayer/dither'
import { useDeviceConfig } from './hooks'
import { Panel } from './panel'
import { ScrollContext } from './panel/common'
import { Scroll } from './scroll/component'
import { useScreenSize } from './userscreen'

enum RECT_TYPE {
  PANEL,
  SCROLL,
  FRAMED,
}

type RECT = {
  name: string
  type: RECT_TYPE
  x: number
  y: number
  width: number
  height: number
  text: PANEL_ITEM[]
}

type LayoutRectProps = {
  rect: RECT
  islandscape?: boolean
  sidebaropen?: boolean
  shouldclose?: boolean
}

function LayoutRect({
  rect,
  islandscape = true,
  sidebaropen = true,
  shouldclose = false,
}: LayoutRectProps) {
  switch (rect.type) {
    case RECT_TYPE.PANEL:
      return (
        <Panel
          name={rect.name}
          width={rect.width}
          height={rect.height}
          color={14}
          bg={1}
          text={rect.text}
          xmargin={islandscape ? 1 : sidebaropen ? 3 : 10}
          ymargin={islandscape && !sidebaropen ? 6 : 0}
        />
      )
    case RECT_TYPE.SCROLL:
      return (
        <Scroll
          name={rect.name}
          width={rect.width}
          height={rect.height}
          color={14}
          bg={1}
          text={rect.text}
          shouldclose={shouldclose}
        />
      )
    case RECT_TYPE.FRAMED:
      return <Framed width={rect.width} height={rect.height} />
  }
  return null
}

const SIDEBAR_SIZE = 20

export function PanelLayout() {
  const screensize = useScreenSize()
  const { islandscape, sidebaropen, insetrows, showtouchcontrols } =
    useDeviceConfig()

  const scroll = useGadgetClient(useEqual((state) => state.gadget.scroll ?? []))
  const isscrollempty = scroll.length === 0
  const [hasscroll, sethasscroll] = useState(false)
  const sidebar = useGadgetClient(
    useEqual((state) => state.gadget.sidebar ?? []),
  )

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  // starting area
  const frame: RECT = {
    name: 'main',
    type: RECT_TYPE.FRAMED,
    x: 0,
    y: 0,
    text: [],
    width: screensize.cols,
    height: screensize.rows,
  }

  // simple layout
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
      const panelwidth = sidebaropen ? SIDEBAR_SIZE + 5 : SIDEBAR_SIZE
      const inset = sidebaropen ? SIDEBAR_SIZE : 4
      const rect = {
        name: 'sidebar',
        type: RECT_TYPE.PANEL,
        x: frame.x + frame.width - inset,
        y: frame.y,
        width: panelwidth,
        height: frame.height,
        text: sidebar,
      }
      frame.width -= inset
      rects.push(rect)
    } else {
      const panelheight = sidebaropen ? insetrows - 7 : insetrows
      const inset = sidebaropen ? panelheight : 4
      const rect = {
        name: 'sidebar',
        type: RECT_TYPE.PANEL,
        x: 0,
        y: frame.y + frame.height - inset,
        width: frame.width,
        height: panelheight,
        text: sidebar,
      }
      frame.height -= inset
      rects.push(rect)
    }
  }

  const scrollrect: RECT = {
    name: 'scroll',
    type: RECT_TYPE.SCROLL,
    x: 0,
    y: 0,
    width: clamp(50, 24, frame.width - 2),
    height: clamp(18, 8, frame.height - 8),
    text: scroll,
  }
  scrollrect.x = frame.x + Math.floor((frame.width - scrollrect.width) * 0.5)
  scrollrect.y = frame.y + Math.floor((frame.height - scrollrect.height) * 0.5)

  if (!isscrollempty && !hasscroll) {
    sethasscroll(true)
  }

  // add the frame to display the game
  rects.unshift(frame)

  const player = registerreadplayer()

  return (
    <ScrollContext.Provider
      value={{
        sendmessage(target, data) {
          // send a hyperlink message
          SOFTWARE.emit(player, target, data)
        },
        sendclose() {
          // send a message to trigger the close
          gadgetserver_clearscroll(SOFTWARE, player)
        },
        didclose() {
          sethasscroll(false)
        },
      }}
    >
      {/* eslint-disable-next-line react/no-unknown-property */}
      <group position={[0, 0, -512]}>
        {rects.map((rect) => {
          return (
            <group
              key={rect.name}
              // eslint-disable-next-line react/no-unknown-property
              position={[
                rect.x * RUNTIME.DRAW_CHAR_WIDTH(),
                rect.y * RUNTIME.DRAW_CHAR_HEIGHT(),
                0,
              ]}
            >
              <LayoutRect
                islandscape={!showtouchcontrols || islandscape}
                sidebaropen={!showtouchcontrols || sidebaropen}
                rect={rect}
              />
            </group>
          )
        })}
        {hasscroll && (
          <React.Fragment key="scroll">
            <group
              // eslint-disable-next-line react/no-unknown-property
              position={[0, 0, 800]}
            >
              <StaticDither
                width={screensize.cols}
                height={screensize.rows}
                alpha={0.14}
              />
            </group>
            <group
              // eslint-disable-next-line react/no-unknown-property
              position={[
                scrollrect.x * RUNTIME.DRAW_CHAR_WIDTH(),
                scrollrect.y * RUNTIME.DRAW_CHAR_HEIGHT(),
                900,
              ]}
            >
              <LayoutRect rect={scrollrect} shouldclose={isscrollempty} />
            </group>
          </React.Fragment>
        )}
      </group>
    </ScrollContext.Provider>
  )
}
