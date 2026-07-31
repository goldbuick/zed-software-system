/**
 * Terrain display de-dupe for persisted exports. Strips per-cell char / color / bg that
 * match the resolved kind, then interns what remains into a book-level terrainmap table.
 */
import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

import { memoryreadelementkind } from './boards'
import { BOARD, BOARD_ELEMENT } from './types'

export type TERRAIN_DISPLAY = {
  char?: number
  color?: number
  bg?: number
}

/**
 * Absent mode means verbatim export. `intern: false` strips kind defaults only,
 * `intern: true` also collects distinct display triples into `entries`.
 */
export type TERRAIN_EXPORT_MODE = {
  intern: boolean
  entries: TERRAIN_DISPLAY[]
  keys: Map<string, number>
}

const TERRAIN_DISPLAY_STATS: ('char' | 'color' | 'bg')[] = [
  'char',
  'color',
  'bg',
]

export function memorycreateterrainexportmode(
  intern: boolean,
): TERRAIN_EXPORT_MODE {
  return { intern, entries: [], keys: new Map() }
}

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

function readterraindisplaykey(element: BOARD_ELEMENT): string {
  return `${element.char ?? ''}:${element.color ?? ''}:${element.bg ?? ''}`
}

export function memoryinternterraindisplay(
  element: MAYBE<BOARD_ELEMENT>,
  mode: TERRAIN_EXPORT_MODE,
): MAYBE<BOARD_ELEMENT> {
  if (!ispresent(element) || !mode.intern) {
    return element
  }
  const display: TERRAIN_DISPLAY = {}
  for (let i = 0; i < TERRAIN_DISPLAY_STATS.length; ++i) {
    const stat = TERRAIN_DISPLAY_STATS[i]
    const value = element[stat]
    if (ispresent(value)) {
      display[stat] = value
    }
  }
  const stats = Object.keys(display)
  if (stats.length === 0) {
    return element
  }
  const key = readterraindisplaykey(element)
  let index = mode.keys.get(key)
  if (!isnumber(index)) {
    index = mode.entries.length
    mode.entries.push(display)
    mode.keys.set(key, index)
  }
  const interned: BOARD_ELEMENT = { ...element, dmap: index }
  delete interned.char
  delete interned.color
  delete interned.bg
  return interned
}

/** Terrain cell as it should be written for `mode`; verbatim when mode is absent. */
export function memoryexportterrainelement(
  element: MAYBE<BOARD_ELEMENT>,
  mode: MAYBE<TERRAIN_EXPORT_MODE>,
): MAYBE<BOARD_ELEMENT> {
  if (!ispresent(mode)) {
    return element
  }
  return memoryinternterraindisplay(
    memorystripterrainkinddefaults(element),
    mode,
  )
}

/** Expand `dmap` indices back into char / color / bg. `dmap` never reaches live memory. */
export function memoryunpackterraindisplay(
  board: MAYBE<BOARD>,
  terrainmap: MAYBE<TERRAIN_DISPLAY[]>,
): void {
  if (!ispresent(board) || !Array.isArray(board.terrain)) {
    return
  }
  for (let i = 0; i < board.terrain.length; ++i) {
    const cell = board.terrain[i]
    if (!ispresent(cell) || !isnumber(cell.dmap)) {
      continue
    }
    const index = cell.dmap
    delete cell.dmap
    const display = Array.isArray(terrainmap) ? terrainmap[index] : undefined
    if (!ispresent(display)) {
      apierror(SOFTWARE, '', 'terrainmap', `missing display entry ${index}`)
      continue
    }
    for (let s = 0; s < TERRAIN_DISPLAY_STATS.length; ++s) {
      const stat = TERRAIN_DISPLAY_STATS[s]
      const value = display[stat]
      if (ispresent(value)) {
        cell[stat] = value
      }
    }
  }
}
