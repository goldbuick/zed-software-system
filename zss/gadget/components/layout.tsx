import { useThree } from '@react-three/fiber'
import { deepClone, _areEquals } from 'fast-json-patch'
import React, { useState } from 'react'
import { gadgetserver_clearscroll } from 'zss/device/api'
import { hub } from 'zss/hub'
import { clamp } from 'zss/mapping/number'

import {
  DRAW_CHAR_HEIGHT,
  DRAW_CHAR_WIDTH,
  PANEL,
  PANEL_TYPE,
  PANEL_ITEM,
  LAYER,
} from '../data/types'

import { StaticDither } from './dither'
import { Framed } from './framed'
import { Panel } from './panel'
import { ScrollContext } from './panel/common'
import { Scroll } from './scroll'

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
  player: string
  layers: LAYER[]
  rect: RECT
  shouldclose?: boolean
}

function LayoutRect({
  player,
  layers,
  rect,
  shouldclose = false,
}: LayoutRectProps) {
  switch (rect.type) {
    case RECT_TYPE.PANEL:
      return (
        <Panel
          player={player}
          name={rect.name}
          width={rect.width}
          height={rect.height}
          color={14}
          bg={1}
          text={rect.text}
        />
      )

    case RECT_TYPE.SCROLL:
      return (
        <Scroll
          player={player}
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
      return (
        <Framed
          player={player}
          layers={layers}
          width={rect.width}
          height={rect.height}
        />
      )
  }
  return null
}

type LayoutProps = {
  player: string
  layers: LAYER[]
  layout: PANEL[]
}

export function Layout({ player, layers, layout }: LayoutProps) {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  const width = Math.floor(viewWidth / DRAW_CHAR_WIDTH)
  const height = Math.floor(viewHeight / DRAW_CHAR_HEIGHT)
  const marginX = viewWidth - width * DRAW_CHAR_WIDTH
  const marginY = viewHeight - height * DRAW_CHAR_HEIGHT

  // cache scroll
  const [scroll, setScroll] = useState<RECT>()

  // bail on odd states
  if (width < 1 || height < 1 || layers === undefined || layout === undefined) {
    return null
  }

  // starting area
  const frame: RECT = {
    name: 'main',
    type: RECT_TYPE.FRAMED,
    x: 0,
    y: 0,
    width,
    height,
    text: [],
  }

  // iterate layout
  const rects: RECT[] = []

  let noscroll = true
  layout.forEach((panel) => {
    let rect: RECT
    switch (panel.edge) {
      case PANEL_TYPE.LEFT:
        rect = {
          name: panel.name,
          type: RECT_TYPE.PANEL,
          x: frame.x,
          y: frame.y,
          width: panel.size,
          height: frame.height,
          text: panel.text,
        }
        frame.x += panel.size
        frame.width -= panel.size
        rects.push(rect)
        break
      default:
      case PANEL_TYPE.RIGHT:
        rect = {
          name: panel.name,
          type: RECT_TYPE.PANEL,
          x: frame.x + frame.width - panel.size,
          y: frame.y,
          width: panel.size,
          height: frame.height,
          text: panel.text,
        }
        frame.width -= panel.size
        rects.push(rect)
        break
      case PANEL_TYPE.TOP:
        rect = {
          name: panel.name,
          type: RECT_TYPE.PANEL,
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: panel.size,
          text: panel.text,
        }
        frame.y += panel.size
        frame.height -= panel.size
        rects.push(rect)
        break
      case PANEL_TYPE.BOTTOM:
        rect = {
          name: panel.name,
          type: RECT_TYPE.PANEL,
          x: frame.x,
          y: frame.y + frame.height - panel.size,
          width: frame.width,
          height: panel.size,
          text: panel.text,
        }
        frame.height -= panel.size
        rects.push(rect)
        break
      case PANEL_TYPE.SCROLL: {
        rect = {
          name: panel.name,
          type: RECT_TYPE.SCROLL,
          x: 0,
          y: 0,
          width: clamp(panel.size || 50, 24, frame.width - 2),
          height: clamp(18, 8, frame.height - 8),
          text: panel.text,
        }
        rect.x = frame.x + Math.floor((frame.width - rect.width) * 0.5)
        rect.y = frame.y + Math.floor((frame.height - rect.height) * 0.5)
        // cache scroll
        // don't add to render list
        noscroll = false
        if (!_areEquals(scroll, rect)) {
          setScroll(deepClone(rect))
        }
      }
    }
  })

  // ending region is main
  // but we start with main
  rects.unshift(frame)

  return (
    <ScrollContext.Provider
      value={{
        sendmessage(target, data) {
          // send a hyperlink message
          hub.emit(target, 'gadget', data, player)
        },
        sendclose() {
          // send a message to trigger the close
          gadgetserver_clearscroll('gadget', player)
        },
        didclose() {
          // clear scroll state
          setScroll(undefined)
        },
      }}
    >
      {/* eslint-disable-next-line react/no-unknown-property */}
      <group position={[marginX * 0.5, marginY * 0.5, -512]}>
        {rects.map((rect, i) => {
          return (
            <group
              key={rect.name}
              // eslint-disable-next-line react/no-unknown-property
              position={[
                rect.x * DRAW_CHAR_WIDTH,
                rect.y * DRAW_CHAR_HEIGHT,
                i * 10,
              ]}
            >
              <LayoutRect player={player} layers={layers} rect={rect} />
            </group>
          )
        })}
        {scroll && (
          <React.Fragment key={scroll.name}>
            <group
              // eslint-disable-next-line react/no-unknown-property
              position={[0, 0, 800]}
            >
              <StaticDither width={width} height={height} alpha={0.14} />
            </group>
            <group
              // eslint-disable-next-line react/no-unknown-property
              position={[
                scroll.x * DRAW_CHAR_WIDTH,
                scroll.y * DRAW_CHAR_HEIGHT,
                900,
              ]}
            >
              <LayoutRect
                player={player}
                layers={layers}
                rect={scroll}
                shouldclose={noscroll}
              />
            </group>
          </React.Fragment>
        )}
      </group>
    </ScrollContext.Provider>
  )
}
