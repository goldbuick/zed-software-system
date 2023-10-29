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
