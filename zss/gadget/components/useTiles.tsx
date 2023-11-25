import { useMemo } from 'react'
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

export function writeTile(
  tiles: TILES,
  width: number,
  height: number,
  x: number,
  y: number,
  value: Record<char | color | number, number>,
) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return -1
  }
  const index = x + y * width
  Object.keys(value).forEach((key) => {
    tiles[key][index] = value[key]
  })
}
