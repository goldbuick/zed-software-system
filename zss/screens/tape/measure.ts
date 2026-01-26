import { BOARD_WIDTH } from 'zss/memory/types'
import { tokenizeandmeasuretextformat } from 'zss/words/textformat'

export function measureminwidth(width: number) {
  return Math.max(BOARD_WIDTH + 1, width - 1)
}

export function measurerow(item: string, width: number, height: number) {
  if (item.startsWith('!')) {
    return 1
  }
  const measure = tokenizeandmeasuretextformat(item, width, height)
  return measure?.y ?? 1
}
