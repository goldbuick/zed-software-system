import { useThree } from '@react-three/fiber'
import React from 'react'

import { clamp } from '/zss/mapping/number'

import {
  DRAW_CHAR_HEIGHT,
  DRAW_CHAR_WIDTH,
  PANEL,
  PANEL_TYPE,
  PANEL_ITEM,
  LAYER,
  LAYER_TYPE,
} from '../data/types'
import { loadDefaultCharset, loadDefaultPalette } from '../file/bytes'

import { Panel } from './panel'
import { Scroll } from './scroll'
import { Sprites } from './sprites'
import { Tiles } from './tiles'

const palette = loadDefaultPalette()
const charset = loadDefaultCharset()

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

interface LayoutRectProps {
  player: string
  layers: LAYER[]
  rect: RECT
}

function LayoutRect({ player, layers, rect }: LayoutRectProps) {
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
        />
      )

    case RECT_TYPE.FRAMED:
      return (
        <React.Fragment>
          {layers.map((layer) => {
            switch (layer.type) {
              default:
              case LAYER_TYPE.BLANK:
                return null
              case LAYER_TYPE.TILES:
                return (
                  palette &&
                  charset && (
                    <Tiles
                      {...layer}
                      key={layer.id}
                      palette={palette}
                      charset={charset}
                    />
                  )
                )
              case LAYER_TYPE.SPRITES:
                return (
                  palette &&
                  charset && (
                    <Sprites
                      key={layer.id}
                      sprites={layer.sprites}
                      palette={palette}
                      charset={charset}
                    />
                  )
                )
            }
          })}
        </React.Fragment>
      )
  }
  return null
}

interface LayoutProps {
  player: string
  layers: LAYER[]
  layout: PANEL[]
}

export function Layout({ player, layers, layout }: LayoutProps) {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  const width = Math.floor(viewWidth / DRAW_CHAR_WIDTH)
  const height = Math.floor(viewHeight / DRAW_CHAR_HEIGHT)
  const marginX = viewWidth % DRAW_CHAR_WIDTH
  const marginY = viewHeight % DRAW_CHAR_HEIGHT

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
  const rects: RECT[] =
    layout.map((panel) => {
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
          rect.x = frame.x + Math.round((frame.width - rect.width) * 0.5)
          rect.y = frame.y + Math.floor((frame.height - rect.height) * 0.5)
          break
        }
      }
      return rect
    }) ?? []

  // ending region is main
  rects.push(frame)

  return (
    // eslint-disable-next-line react/no-unknown-property
    <group position={[marginX * 0.5, marginY * 0.5, 0]}>
      {rects.map((rect) => {
        return (
          <group
            key={rect.name}
            // eslint-disable-next-line react/no-unknown-property
            position={[
              rect.x * DRAW_CHAR_WIDTH,
              rect.y * DRAW_CHAR_HEIGHT,
              rect.type === RECT_TYPE.SCROLL ? 100 : 0,
            ]}
          >
            <LayoutRect player={player} layers={layers} rect={rect} />
          </group>
        )
      })}
    </group>
  )
}
