/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react'

import { SPRITE } from '../data/types'

import { Sprites } from './sprites'

export function useSprites(width: number, height: number) {
  const size = width * height
  const dither = useMemo(() => {
    return new Array(size).fill(0)
  }, [size])

  return dither
}

type SpritesSnapshotProps = {
  sprites: SPRITE[]
}

export function SpritesSnapshot({ sprites }: SpritesSnapshotProps) {
  return sprites.length > 0 && <Sprites sprites={sprites} />
}
