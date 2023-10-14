import React, { useMemo } from 'react'

import { TILES } from '../data'
import { tokenize, writeTextFormat } from '../data/textFormat'
import { loadDefaultCharset, loadDefaultPalette } from '../file'

import { Tiles } from './tiles'

const palette = loadDefaultPalette()
const charset = loadDefaultCharset()

interface PanelProps {
  width: number
  height: number
  color: number
  bg: number
  text: string[]
}

export function Panel({ width, height, color, bg, text }: PanelProps) {
  const tiles: TILES = useMemo(() => {
    const size = width * height
    const chars = new Array(size).fill(0)
    const colors = new Array(size).fill(color)
    const bgs = new Array(size).fill(bg)

    let x = 0
    let y = 0
    let activeColor: number | undefined
    let activeBg: number | undefined
    text.forEach((line) => {
      if (y < height) {
        const tokens = tokenize(line)
        const next = writeTextFormat(
          tokens.tokens,
          x,
          y,
          activeColor,
          activeBg,
          width,
          chars,
          colors,
          bgs,
        )
        x = next.x
        y = next.y
        activeColor = next.activeColor
        activeBg = next.activeBg
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
