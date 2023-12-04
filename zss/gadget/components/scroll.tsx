import { useThree } from '@react-three/fiber'
import anime from 'animejs'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Group } from 'three'

import {
  createWriteTextContext,
  tokenizeAndWriteTextFormat,
} from '../data/textFormat'
import { DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH, PANEL_ITEM } from '../data/types'
import { TILE_TINDEX } from '../display/tiles'

import { Panel } from './panel'
import { ScrollContext } from './panel/common'
import {
  DitherSnapshot,
  resetDither,
  useDither,
  writeDither,
} from './useDither'
import { TileSnapshot, useTiles, writeTile } from './useTiles'

interface ScrollProps {
  player: string
  name: string
  width: number
  height: number
  color: number
  bg: number
  text: PANEL_ITEM[]
  shouldclose: boolean
  didclose?: () => void
}

export function Scroll({
  player,
  name,
  width,
  height,
  color,
  bg,
  text,
  shouldclose,
}: ScrollProps) {
  const panelwidth = width - 3
  const panelheight = height - 3
  const tiles = useTiles(width, height, 0, color, bg)
  const dither = useDither(panelwidth, panelheight)
  const scroll = useContext(ScrollContext)

  // edges
  for (let x = 1; x < width - 1; ++x) {
    writeTile(tiles, width, height, x, 0, { char: 196, color: 15 })
    if (x > 2 && x < width - 1) {
      writeTile(tiles, width, height, x, 1, { char: 205, color: 15 })
    }
    writeTile(tiles, width, height, x, height - 1, { char: 205, color: 15 })
  }
  writeTile(tiles, width, height, 1, 0, { char: 205, color: 15 })
  writeTile(tiles, width, height, 2, 0, { char: 187, color: 15 })
  writeTile(tiles, width, height, 1, 1, { char: 232, color: 15 })
  writeTile(tiles, width, height, 2, 1, { char: 200, color: 15 })

  for (let y = 1; y < height - 1; ++y) {
    writeTile(tiles, width, height, 0, y, { char: 179, color: 15 })
    writeTile(tiles, width, height, width - 1, y, { char: 179, color: 15 })
  }

  for (let y = 2; y < height - 1; ++y) {
    writeTile(tiles, width, height, 1, y, { char: 0, color: 15 })
    writeTile(tiles, width, height, width - 2, y, { char: 0, color: 15 })
  }

  // corners
  // top left-right
  writeTile(tiles, width, height, 0, 0, { char: 213, color: 15 })
  writeTile(tiles, width, height, width - 1, 0, { char: 191, color: 15 })
  writeTile(tiles, width, height, width - 1, 1, { char: 181, color: 15 })
  // bottom left-right
  writeTile(tiles, width, height, 0, height - 1, { char: 212, color: 15 })
  writeTile(tiles, width, height, width - 1, height - 1, {
    char: 190,
    color: 15,
  })

  // measure title
  const title = ` ${name} `
  let context = createWriteTextContext(width - 6, 1, color, bg)
  context.measureOnly = true
  tokenizeAndWriteTextFormat(title, context)

  // center title
  const titleWidth = context.x
  context = {
    ...createWriteTextContext(width, height, color, bg),
    ...tiles,
    activeColor: 14,
    x: Math.round(width * 0.5) - Math.round(titleWidth * 0.5),
    leftEdge: 2,
    rightEdge: width - 2,
    bottomEdge: 1,
  }
  tokenizeAndWriteTextFormat(title, context)

  // input cursor
  const [cursor, setCursor] = useState(0)

  // display offset
  let offset = cursor - Math.floor(panelheight * 0.5)
  offset = Math.min(text.length - panelheight, Math.max(0, offset))

  const visibletext = text.slice(offset, offset + panelheight)

  // display cursor
  const row = cursor - offset
  writeTile(tiles, width, height, 1, 2 + row, { char: 26, color: 12 })

  const wither = [0.01, 0.06, 0.1, 0.2]
  const WITHER_CENTER = 0.4
  resetDither(dither)
  for (let x = 0; x < panelwidth; ++x) {
    writeDither(dither, panelwidth, panelheight, x, row, WITHER_CENTER)
    for (let i = 0; i < wither.length; ++i) {
      const edge = wither.length - i
      writeDither(dither, panelwidth, panelheight, x, row - edge, wither[i])
      writeDither(dither, panelwidth, panelheight, x, row + edge, wither[i])
    }
  }

  const groupref = useRef<Group>(null)
  const viewport = useThree((state) => state.viewport)
  const { height: viewheight } = viewport.getCurrentViewport()

  useEffect(() => {
    if (!groupref.current) {
      return
    }

    // start position
    groupref.current.position.y = shouldclose ? 0 : viewheight
    anime({
      // end position
      y: shouldclose ? viewheight : 0,
      duration: shouldclose ? 300 : 300,
      easing: shouldclose ? 'easeInBack' : 'easeOutExpo',
      targets: groupref.current.position,
      complete() {
        if (shouldclose) {
          scroll.didclose()
        }
      },
    })
  }, [shouldclose, scroll])

  useHotkeys('up', () => setCursor((state) => Math.max(0, state - 1)), [
    setCursor,
  ])

  useHotkeys('alt+up', () => setCursor((state) => Math.max(0, state - 10)), [
    setCursor,
  ])

  useHotkeys(
    'down',
    () => setCursor((state) => Math.min(text.length - 1, state + 1)),
    [setCursor, text],
  )

  useHotkeys(
    'alt+down',
    () => setCursor((state) => Math.min(text.length - 1, state + 10)),
    [setCursor, text],
  )

  useHotkeys('esc', () => scroll.sendclose(), [cursor])

  return (
    <group ref={groupref}>
      <TileSnapshot tiles={tiles} width={width} height={height} />
      <group
        // eslint-disable-next-line react/no-unknown-property
        position={[2 * DRAW_CHAR_WIDTH, 2 * DRAW_CHAR_HEIGHT, 0]}
      >
        <DitherSnapshot
          dither={dither}
          width={panelwidth}
          height={panelheight}
        />
        <Panel
          player={player}
          name={name}
          width={panelwidth}
          height={panelheight}
          margin={0}
          color={color}
          bg={TILE_TINDEX}
          text={visibletext}
          selected={row}
        />
      </group>
    </group>
  )
}
