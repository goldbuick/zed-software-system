import { useRef } from 'react'
import { ispresent } from 'zss/mapping/types'

import { useBlink, useTilesData, writeTile } from '../hooks'

type BlinkerProps = {
  x: number
  y: number
  color?: number
  on?: number
  off?: number
  alt?: number
}

export function Blinker({ x, y, color, on = 232, off = 7, alt }: BlinkerProps) {
  const blink = useBlink()
  const tiles = useTilesData()
  const state = useRef(0)
  const withchar = ispresent(alt) ? (state.current % 2 === 0 ? on : alt) : on

  // toggle char between two values
  writeTile(tiles, tiles.width, tiles.height, x, y, {
    char: blink ? withchar : off,
    color,
  })
  tiles.changed()

  if (blink) {
    ++state.current
  }

  return null
}
