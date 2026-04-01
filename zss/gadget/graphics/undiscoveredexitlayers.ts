import { LAYER, createtiles } from 'zss/gadget/data/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

/** Cardinal + diagonal directions for exit preview placeholders. */
export type EXIT_DIRECTION = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

const DIR_INDEX: Record<EXIT_DIRECTION, number> = {
  n: 0,
  s: 1,
  e: 2,
  w: 3,
  nw: 4,
  ne: 5,
  sw: 6,
  se: 7,
}

/** Fog-style placeholder tiles when a linked neighbor has no cache snapshot yet. */
export function buildundiscoveredexitlayers(dir: EXIT_DIRECTION): LAYER[] {
  const idx = DIR_INDEX[dir]
  const tiles = createtiles('exitpreview', idx, BOARD_WIDTH, BOARD_HEIGHT, 0)
  tiles.id = `exitundiscovered:${dir}`
  const size = BOARD_WIDTH * BOARD_HEIGHT
  for (let i = 0; i < size; ++i) {
    tiles.char[i] = 176
    tiles.color[i] = 8
    tiles.bg[i] = 0
    tiles.stats[i] = 0
  }
  return [tiles]
}
