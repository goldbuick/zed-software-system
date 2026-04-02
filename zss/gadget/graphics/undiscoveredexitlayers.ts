import {
  LAYER,
  LAYER_DITHER,
  createdither,
  createtiles,
} from 'zss/gadget/data/types'
import { clamp, randomnumber } from 'zss/mapping/number'
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
    tiles.char[i] = i % 2 === 0 ? 176 : 177
    tiles.color[i] = 8
    tiles.bg[i] = 0
    tiles.stats[i] = 0
  }
  return [tiles]
}

const DITHER_ALPHA = 0.3
const DITHER_SIZE = BOARD_WIDTH * BOARD_HEIGHT
const DITHER_ALPHA_VALUES = Array.from({ length: DITHER_SIZE }, () =>
  clamp(DITHER_ALPHA + randomnumber() * DITHER_ALPHA, 0, 1),
)

/** Dither drawn on top of cached neighbor snapshots (visited); not used for placeholders. */
export function buildcachedexitpreviewoverlaydither(
  dir: EXIT_DIRECTION,
): LAYER_DITHER {
  const idx = DIR_INDEX[dir]
  const dither = createdither(
    'exitpreviewcache',
    idx,
    BOARD_WIDTH,
    BOARD_HEIGHT,
  )
  dither.alphas = DITHER_ALPHA_VALUES
  return dither
}
