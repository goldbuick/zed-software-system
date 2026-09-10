/**
 * Gadget layer snapshots per board: owner `createlayersid(boardId)` with inner keys
 * = graphics mode (`normalizelayerzvariant(graphics.graphics)`). Avoids importing `rendering` from
 * `bookoperations` (would cycle).
 */
import { createlayersid } from 'zss/mapping/guid'
import { MAYBE } from 'zss/mapping/types'

import { memoryreadflags } from './bookoperations'
import type { MEMORY_GADGET_LAYERS } from './rendering'
import type { BOOK } from './types'

let cachebook: MAYBE<BOOK> = undefined
const layerstorecache = new Map<string, Record<string, MEMORY_GADGET_LAYERS>>()

/** Clear when the active book reference changes (import / attach). */
export function memoryresetbookgadgetlayersreadcache() {
  cachebook = undefined
  layerstorecache.clear()
}

/** Per-book layer store ref cache. Debug: zss/perf/docs/render-gadget-optimizations.md */
export function memoryreadbookgadgetlayersforboard(
  book: MAYBE<BOOK>,
  board: string,
): Record<string, MEMORY_GADGET_LAYERS> {
  if (!book) {
    return {}
  }
  if (book !== cachebook) {
    layerstorecache.clear()
    cachebook = book
  }
  const store = layerstorecache.get(board)
  if (!store) {
    const fresh = memoryreadflags(
      book,
      createlayersid(board),
    ) as unknown as Record<string, MEMORY_GADGET_LAYERS>
    layerstorecache.set(board, fresh)
    return fresh
  }
  return store
}
