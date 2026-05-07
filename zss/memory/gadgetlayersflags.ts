/**
 * Gadget layer snapshots per board: owner `createlayersid(boardId)` with inner keys
 * = graphics mode (`NAME(graphics.graphics)`). Avoids importing `rendering` from
 * `bookoperations` (would cycle).
 */
import { createlayersid } from 'zss/mapping/guid'
import { MAYBE } from 'zss/mapping/types'

import { memoryreadbookflags } from './bookoperations'
import type { MEMORY_GADGET_LAYERS } from './rendering'
import type { BOOK } from './types'

export function memoryreadbookgadgetlayersforboard(
  book: MAYBE<BOOK>,
  boardid: string,
): Record<string, MEMORY_GADGET_LAYERS> {
  return memoryreadbookflags(
    book,
    createlayersid(boardid),
  ) as unknown as Record<string, MEMORY_GADGET_LAYERS>
}
