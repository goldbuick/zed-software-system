import { useThree } from '@react-three/fiber'
import React from 'react'

import {
  DRAW_CHAR_HEIGHT,
  DRAW_CHAR_WIDTH,
  PANEL,
  PANEL_TYPE,
  PANEL_ITEM,
} from '../data/types'

import { Panel } from './panel'

type RECT = {
  name: string
  x: number
  y: number
  width: number
  height: number
  frame?: boolean
  text: PANEL_ITEM[]
}

interface LayoutProps {
  panels?: PANEL[]
}

export function Layout({ panels }: LayoutProps) {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  const width = Math.floor(viewWidth / DRAW_CHAR_WIDTH)
  const height = Math.floor(viewHeight / DRAW_CHAR_HEIGHT)
  const marginX = viewWidth % DRAW_CHAR_WIDTH
  const marginY = viewHeight % DRAW_CHAR_HEIGHT

  if (width < 1 || height < 1) {
    return null
  }

  // starting area
  const frame: RECT = {
    name: 'main',
    x: 0,
    y: 0,
    width,
    height,
    frame: true,
    text: [],
  }

  // iterate layout
  const rects: RECT[] =
    panels?.map((panel) => {
      let rect: RECT
      switch (panel.edge) {
        case PANEL_TYPE.LEFT:
          rect = {
            name: panel.name,
            x: frame.x,
            y: frame.y,
            width: panel.size,
            height: frame.height,
            text: panel.text,
          }
          frame.x += panel.size
          frame.width -= panel.size
          break
        default:
        case PANEL_TYPE.RIGHT:
          rect = {
            name: panel.name,
            x: frame.x + frame.width - panel.size,
            y: frame.y,
            width: panel.size,
            height: frame.height,
            text: panel.text,
          }
          frame.width -= panel.size
          break
        case PANEL_TYPE.TOP:
          rect = {
            name: panel.name,
            x: frame.x,
            y: frame.y,
            width: frame.width,
            height: panel.size,
            text: panel.text,
          }
          frame.y += panel.size
          frame.height -= panel.size
          break
        case PANEL_TYPE.BOTTOM:
          rect = {
            name: panel.name,
            x: frame.x,
            y: frame.y + frame.height - panel.size,
            width: frame.width,
            height: panel.size,
            text: panel.text,
          }
          frame.height -= panel.size
          break
      }
      return rect
    }) ?? []

  // ending region is main
  rects.push(frame)

  return (
    <group position={[marginX * 0.5, marginY * 0.5, 0]}>
      {rects.map((rect) => (
        <group
          key={rect.name}
          position={[rect.x * DRAW_CHAR_WIDTH, rect.y * DRAW_CHAR_HEIGHT, 0]}
        >
          {rect.frame ? (
            <React.Fragment />
          ) : (
            <Panel
              name={rect.name}
              width={rect.width}
              height={rect.height}
              color={15}
              bg={rect.frame ? 5 : 1}
              text={rect.text}
            />
          )}
        </group>
      ))}
    </group>
  )
}
