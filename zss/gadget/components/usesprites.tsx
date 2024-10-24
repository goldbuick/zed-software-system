/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react'
import { proxy, useSnapshot } from 'valtio'

import { SPRITE } from '../data/types'
import { loadDefaultCharset, loadDefaultPalette } from '../file/bytes'

import { Sprites } from './sprites'

export function useSprites(width: number, height: number) {
  const size = width * height
  const dither = useMemo(() => {
    return proxy<SPRITE[]>(new Array(size).fill(0))
  }, [size])

  return dither
}

const palette = loadDefaultPalette()
const charset = loadDefaultCharset()

type SpritesSnapshotProps = {
  sprites: SPRITE[]
}

export function SpritesSnapshot({ sprites }: SpritesSnapshotProps) {
  const snapshot = useSnapshot(sprites) as SPRITE[]

  return (
    palette &&
    charset &&
    snapshot.length > 0 && (
      <Sprites palette={palette} charset={charset} sprites={snapshot} />
    )
  )
}
