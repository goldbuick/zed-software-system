import { ptwithin } from 'zss/mapping/2d'
import { MAYBE, isstring } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import { BOARD, BOARD_HEIGHT, BOARD_WIDTH } from './types'

export type MEMORY_BOARD_EDGE_EXIT = {
  exitboard: string
  dest: PT
}

/** Pure exit resolution for an out-of-bounds destination (no side effects). */
export function memoryresolveboardedgeexit(
  board: MAYBE<BOARD>,
  dest: PT,
): MEMORY_BOARD_EDGE_EXIT | undefined {
  if (dest.x < 0) {
    const exit = board?.exitwest
    if (isstring(exit) && exit) {
      return {
        exitboard: exit,
        dest: { x: BOARD_WIDTH - 1, y: dest.y },
      }
    }
  } else if (dest.x >= BOARD_WIDTH) {
    const exit = board?.exiteast
    if (isstring(exit) && exit) {
      return {
        exitboard: exit,
        dest: { x: 0, y: dest.y },
      }
    }
  } else if (dest.y < 0) {
    const exit = board?.exitnorth
    if (isstring(exit) && exit) {
      return {
        exitboard: exit,
        dest: { x: dest.x, y: BOARD_HEIGHT - 1 },
      }
    }
  } else if (dest.y >= BOARD_HEIGHT) {
    const exit = board?.exitsouth
    if (isstring(exit) && exit) {
      return {
        exitboard: exit,
        dest: { x: dest.x, y: 0 },
      }
    }
  }
  return undefined
}

export function memoryptwithinboard(pt: PT) {
  return ptwithin(pt.x, pt.y, 0, BOARD_WIDTH - 1, BOARD_HEIGHT - 1, 0)
}
