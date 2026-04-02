import { LAYER, createtiles } from 'zss/gadget/data/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { COLOR } from 'zss/words/types'

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

const PLACEHOLDER_TILES = createtiles(
  'exitpreview',
  0,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  0,
)
const bank = 5
const size = BOARD_WIDTH * BOARD_HEIGHT
for (let i = 0; i < size; ++i) {
  const x = i % BOARD_WIDTH
  const y = Math.floor(i / BOARD_WIDTH)
  const diagonal = (x + y) % bank === 0 || (x - y) % bank === 0
  PLACEHOLDER_TILES.char[i] = diagonal ? 176 : 178
  PLACEHOLDER_TILES.color[i] = diagonal ? COLOR.DKGRAY : COLOR.BLACK
  PLACEHOLDER_TILES.bg[i] = COLOR.DKGRAY
  PLACEHOLDER_TILES.stats[i] = 0
}

/** Fog-style placeholder tiles when a linked neighbor has no cache snapshot yet. */
export function buildundiscoveredexitlayers(dir: EXIT_DIRECTION): LAYER[] {
  const idx = DIR_INDEX[dir]
  const tiles = createtiles('exitpreview', idx, BOARD_WIDTH, BOARD_HEIGHT, 0)
  tiles.id = `exitundiscovered:${dir}`
  tiles.char = PLACEHOLDER_TILES.char
  tiles.color = PLACEHOLDER_TILES.color
  tiles.bg = PLACEHOLDER_TILES.bg
  tiles.stats = PLACEHOLDER_TILES.stats
  return [tiles]
}
