/**
 * Gadget layer snapshots per board on the flags boundary payload at key `gadgetlayers`.
 * Separate module avoids importing `rendering` from `bookoperations` (would cycle).
 */
import { MAYBE } from 'zss/mapping/types'

import { memoryreadbookflags } from './bookoperations'
import type { MEMORY_GADGET_LAYERS } from './rendering'
import { type BOOK, MEMORY_LABEL } from './types'

export function memoryreadbookgadgetlayersmap(
  book: MAYBE<BOOK>,
): Record<string, MEMORY_GADGET_LAYERS> {
  return memoryreadbookflags(
    book,
    MEMORY_LABEL.GADGETLAYERS,
  ) as unknown as Record<string, MEMORY_GADGET_LAYERS>
}
