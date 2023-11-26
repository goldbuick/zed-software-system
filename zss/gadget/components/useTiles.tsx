import { useMemo } from 'react'
import { objectKeys } from 'ts-extras'
import { proxy } from 'valtio'

import { TILES } from '../data/types'

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
  }, [width, height])

  return tiles
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
    return -1
  }
  const index = x + y * width
  objectKeys(value).forEach((key) => {
    const v = value[key]
    if (v !== undefined) {
      tiles[key][index] = v
    }
  })
}
