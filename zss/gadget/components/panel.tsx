import React from 'react'
import { useSnapshot } from 'valtio'

import { WRITE_TEXT_CONTEXT, createWriteTextContext } from '../data/textFormat'
import { PANEL_ITEM, TILES } from '../data/types'
import { loadDefaultCharset, loadDefaultPalette } from '../file/bytes'

import { PanelItem } from './panel/panelitem'
import { Tiles } from './tiles'
import { useTiles } from './useTiles'

const palette = loadDefaultPalette()
const charset = loadDefaultCharset()

interface PanelRenderProps {
  width: number
  height: number
  tiles: TILES
}

function PanelRender({ width, height, tiles }: PanelRenderProps) {
  const snapshot = useSnapshot(tiles) as TILES

  return (
    palette &&
    charset && (
      <Tiles
        {...snapshot}
        width={width}
        height={height}
        palette={palette}
        charset={charset}
      />
    )
  )
}

interface PanelProps {
  playerId: string
  name: string
  width: number
  height: number
  color: number
  bg: number
  text: PANEL_ITEM[]
}

export function Panel({
  playerId,
  width,
  height,
  color,
  bg,
  text,
}: PanelProps) {
  const tiles = useTiles(width, height, 0, color, bg)

  const context: WRITE_TEXT_CONTEXT = {
    ...createWriteTextContext(width, height, color, bg),
    ...tiles,
  }

  return (
    palette &&
    charset && (
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
        <PanelRender width={width} height={height} tiles={tiles} />
      </>
    )
  )
}
