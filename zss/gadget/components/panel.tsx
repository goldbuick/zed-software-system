import React from 'react'

import { WRITE_TEXT_CONTEXT, createWriteTextContext } from '../data/textFormat'
import { PANEL_ITEM } from '../data/types'

import { PanelItem } from './panel/panelitem'
import { TileSnapshot, resetTiles, useTiles } from './useTiles'

interface PanelProps {
  margin?: number
  playerId: string
  name: string
  width: number
  height: number
  color: number
  bg: number
  text: PANEL_ITEM[]
}

export function Panel({
  margin = 1,
  playerId,
  width,
  height,
  color,
  bg,
  text,
}: PanelProps) {
  const tiles = useTiles(width, height, 0, color, bg)
  resetTiles(tiles, 0, color, bg)

  const context: WRITE_TEXT_CONTEXT = {
    ...createWriteTextContext(width, height, color, bg),
    ...tiles,
  }
  context.x = margin
  context.leftEdge = margin
  context.rightEdge = context.width - margin

  return (
    <>
      {text.map((item, index) => {
        return (
          <PanelItem
            key={index}
            playerId={playerId}
            item={item}
            context={context}
          />
        )
      })}
      <TileSnapshot width={width} height={height} tiles={tiles} />
    </>
  )
}
