import React from 'react'

import {
  createWriteTextContext,
  tokenizeAndWriteTextFormat,
} from '../data/textFormat'
import { DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH, PANEL_ITEM } from '../data/types'
import { loadDefaultCharset, loadDefaultPalette } from '../file/bytes'

import { Panel } from './panel'
import { Tiles } from './tiles'
import { useTiles, writeTile } from './useTiles'

const palette = loadDefaultPalette()
const charset = loadDefaultCharset()

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
  console.info('tets', text)

  const tiles = useTiles(width, height, 0, color, bg)
  // edges
  for (let x = 1; x < width - 1; ++x) {
    writeTile(tiles, width, height, x, 0, 'char', 205)
    if (x > 1 && x < width - 2) {
      writeTile(tiles, width, height, x, 1, 'char', 196)
    }
    writeTile(tiles, width, height, x, height - 1, 'char', 205)
  }
  for (let y = 1; y < height - 1; ++y) {
    writeTile(tiles, width, height, 0, y, 'char', 179)
    writeTile(tiles, width, height, width - 1, y, 'char', 179)
  }

  // corners
  // top left-right
  writeTile(tiles, width, height, 0, 0, 'char', 213)
  writeTile(tiles, width, height, width - 1, 0, 'char', 184)
  // bottom left-right
  writeTile(tiles, width, height, 0, height - 1, 'char', 212)
  writeTile(tiles, width, height, width - 1, height - 1, 'char', 190)

  // measure title
  let context = createWriteTextContext(width - 4, 1, color, bg)
  context.measureOnly = true
  tokenizeAndWriteTextFormat(name, context)

  // center title
  const titleWidth = context.x
  context = {
    ...createWriteTextContext(width, height, color, bg),
    ...tiles,
    x: Math.round(width * 0.5) - Math.round(titleWidth * 0.5),
    leftEdge: 2,
    rightEdge: width - 2,
    bottomEdge: 1,
  }
  tokenizeAndWriteTextFormat(name, context)

  return (
    <React.Fragment>
      {palette && charset && (
        <Tiles
          {...tiles}
          width={width}
          height={height}
          palette={palette}
          charset={charset}
        />
      )}
      <group
        // eslint-disable-next-line react/no-unknown-property
        position={[2 * DRAW_CHAR_WIDTH, 2 * DRAW_CHAR_HEIGHT, 1]}
      >
        <Panel
          playerId={playerId}
          name={name}
          width={width - 4}
          height={height - 3}
          color={color}
          bg={bg}
          text={text}
        />
      </group>
    </React.Fragment>
  )
}
