import { useThree } from '@react-three/fiber'
import React from 'react'

import { DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH, PANEL, PANEL_EDGE } from '../data'

import { Panel } from './panel'

type RECT = {
  id: string
  x: number
  y: number
  width: number
  height: number
  frame?: boolean
}

interface LayoutProps {
  panel?: PANEL
}

export function Layout({ panel }: LayoutProps) {
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
    id: 'root',
    x: 0,
    y: 0,
    width,
    height,
    frame: true,
  }

  // iterate layout
  const rects: RECT[] = []
  let cursor: PANEL | undefined = panel
  while (cursor) {
    switch (cursor.edge) {
      case PANEL_EDGE.LEFT:
        rects.push({
          id: cursor.id,
          x: frame.x,
          y: frame.y,
          width: cursor.size,
          height: frame.height,
        })
        frame.x += cursor.size
        frame.width -= cursor.size
        break
      case PANEL_EDGE.RIGHT:
        rects.push({
          id: cursor.id,
          x: frame.x + frame.width - cursor.size,
          y: frame.y,
          width: cursor.size,
          height: frame.height,
        })
        frame.width -= cursor.size
        break
      case PANEL_EDGE.TOP:
        rects.push({
          id: cursor.id,
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: cursor.size,
        })
        frame.y += cursor.size
        frame.height -= cursor.size
        break
      case PANEL_EDGE.BOTTOM:
        rects.push({
          id: cursor.id,
          x: frame.x,
          y: frame.y + frame.height - cursor.size,
          width: frame.width,
          height: cursor.size,
        })
        frame.height -= cursor.size
        break
    }
    cursor = cursor.next
  }

  rects.push(frame)

  return (
    <group position={[marginX * 0.5, marginY * 0.5, 0]}>
      {rects.map((rect) => (
        <group
          key={rect.id}
          position={[rect.x * DRAW_CHAR_WIDTH, rect.y * DRAW_CHAR_HEIGHT, 0]}
        >
          <Panel
            width={rect.width}
            height={rect.height}
            color={rect.frame ? 5 : 1}
          />
        </group>
      ))}
    </group>
  )
}
