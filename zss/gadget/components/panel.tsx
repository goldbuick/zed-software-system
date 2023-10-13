import React, { useMemo } from 'react'

import { range } from '/zss/mapping/array'

import { TILES } from '../data'
import { loadDefaultCharset, loadDefaultPalette } from '../file'

import { Tiles } from './tiles'

const palette = loadDefaultPalette()
const charset = loadDefaultCharset()

interface PanelProps {
  width: number
  height: number
  color: number
}

export function Panel({ width, height, color }: PanelProps) {
  const tiles: TILES = useMemo(() => {
    const size = width * height - 1
    return {
      char: range(size).fill(219),
      color: range(size).fill(color),
      bg: range(size).fill(0),
    }
  }, [width, height])

  return (
    palette &&
    charset && (
      <Tiles
        width={width}
        height={height}
        {...tiles}
        palette={palette}
        charset={charset}
      />
    )
  )
}
