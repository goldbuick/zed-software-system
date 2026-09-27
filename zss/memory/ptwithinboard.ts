import { ptwithin } from 'zss/mapping/2d'
import { PT } from 'zss/words/types'

import { BOARD_HEIGHT, BOARD_WIDTH } from './types'

export function memoryptwithinboard(pt: PT) {
  return ptwithin(pt.x, pt.y, 0, BOARD_WIDTH - 1, BOARD_HEIGHT - 1, 0)
}
