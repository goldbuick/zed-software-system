/**
 * Terrain display strip for persisted exports. Removes per-cell char / color / bg
 * that match the resolved kind so kind defaults are not repeated on every cell.
 */
import { MAYBE, ispresent } from 'zss/mapping/types'

import { memoryreadelementkind } from './boards'
import { BOARD_ELEMENT } from './types'

const TERRAIN_DISPLAY_STATS: ('char' | 'color' | 'bg')[] = [
  'char',
  'color',
  'bg',
]

export function memorystripterrainkinddefaults(
  element: MAYBE<BOARD_ELEMENT>,
): MAYBE<BOARD_ELEMENT> {
  if (!ispresent(element)) {
    return element
  }
  const kind = memoryreadelementkind(element)
  if (!ispresent(kind)) {
    return element
  }
  let stripped: MAYBE<BOARD_ELEMENT>
  for (let i = 0; i < TERRAIN_DISPLAY_STATS.length; ++i) {
    const stat = TERRAIN_DISPLAY_STATS[i]
    const value = element[stat]
    if (!ispresent(value) || kind[stat] !== value) {
      continue
    }
    stripped ??= { ...element }
    delete stripped[stat]
  }
  return stripped ?? element
}

/** Terrain cell for export; verbatim when `strip` is absent/false. */
export function memoryexportterrainelement(
  element: MAYBE<BOARD_ELEMENT>,
  strip?: boolean,
): MAYBE<BOARD_ELEMENT> {
  if (!strip) {
    return element
  }
  return memorystripterrainkinddefaults(element)
}
