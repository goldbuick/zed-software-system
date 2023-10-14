import React, { useMemo } from 'react'

import { TILES } from '../data'
import { loadDefaultCharset, loadDefaultPalette } from '../file'

import { Tiles } from './tiles'

const palette = loadDefaultPalette()
const charset = loadDefaultCharset()

interface PanelProps {
  width: number
  height: number
  color: number
  text: string[]
}

export function Panel({ width, height, color, text }: PanelProps) {
  const tiles: TILES = useMemo(() => {
    const size = width * height
    const chars = new Array(size).fill(0)
    const colors = new Array(size).fill(15)
    const bgs = new Array(size).fill(color)

    text.forEach((line, y) => {
      if (y < height) {
        for (let x = 0; x < line.length; ++x) {
          if (x < width) {
            const char = line.charCodeAt(x)
            console.info({ x, y, char })
            chars[x + y * width] = char
          }
        }
        Array.from(line).forEach((char, x) => {})
      }
    })

    return {
      char: chars,
      color: colors,
      bg: bgs,
    }
  }, [width, height, text])

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
