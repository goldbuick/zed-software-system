/* eslint-disable react/no-unknown-property */
import React, { useState } from 'react'
import { Color } from 'three'
import { RUNTIME } from 'zss/config'
import { gadgetserverclearscroll } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useEqual, useGadgetClient } from 'zss/gadget/data/state'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { StaticDither } from 'zss/gadget/graphics/dither'
import { useDeviceData } from 'zss/gadget/hooks'
import { Rect } from 'zss/gadget/rect'
import { useScreenSize } from 'zss/gadget/userscreen'
import { clamp } from 'zss/mapping/number'
import { ScrollContext } from 'zss/screens/panel/common'
import { Panel } from 'zss/screens/panel/component'
import { ScrollComponent } from 'zss/screens/scroll/component'

import { Framed } from './framed'

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
  shouldclose?: boolean
}

function LayoutRect({ rect, shouldclose = false }: LayoutRectProps) {
  switch (rect.type) {
    case RECT_TYPE.PANEL:
      return (
        <group position-z={512}>
          <Panel
            width={rect.width}
            height={rect.height}
            color={14}
            bg={1}
            text={rect.text}
            ymargin={0}
          />
        </group>
      )
    case RECT_TYPE.SCROLL:
      return (
        <ScrollComponent
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

export function ScreenUI() {
  const screensize = useScreenSize()
  const { islandscape, sidebaropen, showtouchcontrols } = useDeviceData()

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
      const height = 15
      const inset = sidebaropen ? height : 4
      const rect = {
        name: 'sidebar',
        type: RECT_TYPE.PANEL,
        x: 0,
        y: frame.y + frame.height - inset,
        width: frame.width,
        height: height,
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
    width: clamp(50, 40, frame.width - 2),
    height: clamp(20, 8, frame.height - 2),
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
          gadgetserverclearscroll(SOFTWARE, player)
        },
        didclose() {
          sethasscroll(false)
        },
      }}
    >
      <group
        position={[
          -RUNTIME.DRAW_CHAR_WIDTH(),
          -RUNTIME.DRAW_CHAR_HEIGHT(),
          -524,
        ]}
      >
        <Rect
          visible
          color={new Color(0.076, 0.076, 0)}
          width={screensize.cols + 2}
          height={screensize.rows + 2}
        />
      </group>
      <group position={[0, 0, -512]}>
        {rects.map((rect) => {
          return (
            <group
              key={rect.name}
              position={[
                rect.x * RUNTIME.DRAW_CHAR_WIDTH(),
                rect.y * RUNTIME.DRAW_CHAR_HEIGHT(),
                0,
              ]}
            >
              <LayoutRect rect={rect} />
            </group>
          )
        })}
      </group>
      {hasscroll && (
        <React.Fragment key="scroll">
          <group position={[0, 0, 800]}>
            <StaticDither
              width={screensize.cols}
              height={screensize.rows}
              alpha={0.14}
            />
          </group>
          <group
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
    </ScrollContext.Provider>
  )
}
