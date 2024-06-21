import { useMemo } from 'react'
import { objectKeys } from 'ts-extras'
import { proxy, useSnapshot } from 'valtio'
import { ispresent } from 'zss/mapping/types'

import { TILES } from '../data/types'
import { loadDefaultCharset, loadDefaultPalette } from '../file/bytes'

import { Tiles } from './tiles'

export function useTiles(
  width: number,
  height: number,
  char: number,
  color: number,
  bg: number,
) {
  const size = width * height

  const tiles = useMemo(() => {
    return proxy<TILES>({
      char: new Array(size).fill(char),
      color: new Array(size).fill(color),
      bg: new Array(size).fill(bg),
    })
  }, [size, char, color, bg])

  return tiles
}

const palette = loadDefaultPalette()
const charset = loadDefaultCharset()

type TileSnapshotProps = {
  width: number
  height: number
  tiles: TILES
}

export function TileSnapshot({ width, height, tiles }: TileSnapshotProps) {
  const snapshot = useSnapshot(tiles) as TILES

  return (
    palette &&
    charset &&
    width > 0 &&
    height > 0 && (
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

export function resetTiles(
  tiles: TILES,
  char: number,
  color: number,
  bg: number,
) {
  tiles.char = new Array(tiles.char.length).fill(char)
  tiles.color = new Array(tiles.color.length).fill(color)
  tiles.bg = new Array(tiles.bg.length).fill(bg)
}

export function readTile(
  tiles: TILES,
  width: number,
  height: number,
  x: number,
  y: number,
  key: keyof TILES,
): number {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return -1
  }
  const index = x + y * width
  return tiles[key][index]
}

type WRITE_TILE_VALUE = {
  char: number
  color: number
  bg: number
}

export function writeTile(
  tiles: TILES,
  width: number,
  height: number,
  x: number,
  y: number,
  value: Partial<WRITE_TILE_VALUE>,
) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return
  }
  const index = x + y * width
  objectKeys(value).forEach((key) => {
    const v = value[key]
    if (ispresent(v)) {
      tiles[key][index] = v
    }
  })
}
