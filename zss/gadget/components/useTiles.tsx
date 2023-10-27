import { useMemo } from 'react'
import { proxy } from 'valtio'

import { TILES } from '../data/types'

export function useTiles(width: number, height: number): TILES {
  const size = width * height

  const tiles = useMemo(() => {
    return proxy<TILES>({
      char: new Array(size).fill(0),
      color: new Array(size).fill(0),
      bg: new Array(size).fill(0),
    })
  }, [width, height])

  return tiles
}
