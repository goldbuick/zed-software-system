import React, { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import {
  createWriteTextContext,
  tokenizeAndWriteTextFormat,
} from '../data/textFormat'
import { DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH, PANEL_ITEM } from '../data/types'
import { TILE_TINDEX } from '../display/tiles'

import { Panel } from './panel'
import {
  DitherSnapshot,
  resetDither,
  useDither,
  writeDither,
} from './useDither'
import { TileSnapshot, useTiles, writeTile } from './useTiles'

interface ScrollProps {
  playerId: string
  name: string
  width: number
  height: number
  color: number
  bg: number
  text: PANEL_ITEM[]
}

export function Scroll({
  playerId,
  name,
  width,
  height,
  color,
  bg,
  text,
}: ScrollProps) {
  const tiles = useTiles(width, height, 0, color, bg)
  const dither = useDither(width, height)

  // edges
  for (let x = 1; x < width - 1; ++x) {
    writeTile(tiles, width, height, x, 0, { char: 205, color: 15 })
    if (x > 1 && x < width - 2) {
      writeTile(tiles, width, height, x, 1, { char: 196, color: 15 })
    }
    writeTile(tiles, width, height, x, height - 1, { char: 205, color: 15 })
  }
  for (let y = 1; y < height - 1; ++y) {
    writeTile(tiles, width, height, 0, y, { char: 179, color: 15 })
    writeTile(tiles, width, height, width - 1, y, { char: 179, color: 15 })
    writeTile(tiles, width, height, 1, y, { char: 0, color: 15 })
    writeTile(tiles, width, height, width - 2, y, { char: 0, color: 15 })
  }

  // corners
  // top left-right
  writeTile(tiles, width, height, 0, 0, { char: 213, color: 15 })
  writeTile(tiles, width, height, width - 1, 0, { char: 184, color: 15 })
  // bottom left-right
  writeTile(tiles, width, height, 0, height - 1, { char: 212, color: 15 })
  writeTile(tiles, width, height, width - 1, height - 1, {
    char: 190,
    color: 15,
  })

  // measure title
  let context = createWriteTextContext(width - 4, 1, color, bg)
  context.measureOnly = true
  tokenizeAndWriteTextFormat(name, context)

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
  tokenizeAndWriteTextFormat(name, context)

  // input cursor
  const panelheight = height - 3
  const [cursor, setCursor] = useState(0)

  // display offset
  let offset = cursor - Math.floor(panelheight * 0.5)
  offset = Math.min(text.length - panelheight, Math.max(0, offset))

  const visibletext = text.slice(offset, offset + panelheight)

  // display cursor
  const row = cursor - offset
  writeTile(tiles, width, height, 1, 2 + row, { char: 175, color: 12 })
  writeTile(tiles, width, height, width - 2, 2 + row, {
    char: 174,
    color: 12,
  })

  resetDither(dither)
  for (let x = 2; x < width - 2; ++x) {
    writeDither(dither, width, height, x, row - 2, 0.01)
    writeDither(dither, width, height, x, row - 1, 0.1)
    writeDither(dither, width, height, x, row, 0.2)
    writeDither(dither, width, height, x, row + 1, 0.1)
    writeDither(dither, width, height, x, row + 2, 0.01)
  }

  useHotkeys(
    'up',
    () => {
      setCursor((state) => Math.max(0, state - 1))
    },
    { preventDefault: true },
    [setCursor],
  )

  useHotkeys(
    'down',
    () => {
      setCursor((state) => Math.min(text.length - 1, state + 1))
    },
    { preventDefault: true },
    [setCursor, text],
  )

  return (
    <React.Fragment>
      <TileSnapshot tiles={tiles} width={width} height={height} />
      <group
        // eslint-disable-next-line react/no-unknown-property
        position={[0 * DRAW_CHAR_WIDTH, 2 * DRAW_CHAR_HEIGHT, 1]}
      >
        <DitherSnapshot dither={dither} width={width} height={height} />
      </group>
      <group
        // eslint-disable-next-line react/no-unknown-property
        position={[2 * DRAW_CHAR_WIDTH, 2 * DRAW_CHAR_HEIGHT, 2]}
      >
        <Panel
          playerId={playerId}
          name={name}
          width={width - 4}
          height={height - 3}
          color={color}
          bg={TILE_TINDEX}
          text={visibletext}
        />
      </group>
    </React.Fragment>
  )
}
