import { ispresent, isstring } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import {
  dirfromdelta,
  isstrdir,
  mapstrdirtoconst,
  ptapplydir,
  readdir,
} from 'zss/words/dir'
import { READ_CONTEXT } from 'zss/words/reader'
import { DIR, NAME, PT, WORD } from 'zss/words/types'

import { memoryevaldir } from './boarddirection'
import { BOARD, BOARD_ELEMENT } from './types'

export const DIR_EDIT_CARDINALS = ['north', 'south', 'west', 'east'] as const

export type DIR_EDIT_CARDINAL = (typeof DIR_EDIT_CARDINALS)[number]

/** Map axis deltas to a dir-edit cardinal (idle / non-cardinal → north). */
export function memorycardinaldirfromdelta(dx: number, dy: number): DIR_EDIT_CARDINAL {
  const d = dirfromdelta(dx, dy)
  switch (d) {
    case DIR.SOUTH:
      return 'south'
    case DIR.WEST:
      return 'west'
    case DIR.EAST:
      return 'east'
    case DIR.NORTH:
    default:
      return 'north'
  }
}

/** Clamp any word to a dir-edit cardinal. */
export function memoryclampdireditcardinal(value: unknown): DIR_EDIT_CARDINAL {
  const name = NAME(maptostring(value))
  switch (name) {
    case 'south':
    case 's':
    case 'down':
    case 'd':
      return 'south'
    case 'west':
    case 'w':
    case 'left':
    case 'l':
      return 'west'
    case 'east':
    case 'e':
    case 'right':
    case 'r':
      return 'east'
    case 'north':
    case 'n':
    case 'up':
    case 'u':
    default:
      return 'north'
  }
}

/**
 * Write step/shoot-style axis deltas from dir words onto an element.
 * With board: full dir eval. Without board: cardinal-only (kind apply).
 */
export function memorywritedeltadirstat(
  board: BOARD | undefined,
  element: BOARD_ELEMENT,
  dirwords: WORD[],
  writex: 'stepx' | 'shootx',
  writey: 'stepy' | 'shooty',
  frompt?: PT,
) {
  if (dirwords.length === 0) {
    element[writex] = 0
    element[writey] = 0
    return
  }
  const prevwords = READ_CONTEXT.words
  READ_CONTEXT.words = dirwords
  const [strdir] = readdir(0)
  READ_CONTEXT.words = prevwords
  if (!isstrdir(strdir)) {
    return
  }
  const origin: PT = frompt ?? {
    x: element.x ?? 0,
    y: element.y ?? 0,
  }
  if (ispresent(board)) {
    const dest = memoryevaldir(board, element, '', strdir, origin)
    element[writex] = dest.destpt.x - origin.x
    element[writey] = dest.destpt.y - origin.y
    return
  }
  const delta: PT = { x: 0, y: 0 }
  for (let i = 0; i < strdir.length; ++i) {
    const segment = strdir[i]
    if (isstring(segment) || typeof segment === 'number') {
      const maybedir = mapstrdirtoconst(segment)
      if (
        maybedir === DIR.NORTH ||
        maybedir === DIR.SOUTH ||
        maybedir === DIR.WEST ||
        maybedir === DIR.EAST ||
        maybedir === DIR.IDLE
      ) {
        ptapplydir(delta, maybedir)
      }
    }
  }
  element[writex] = delta.x
  element[writey] = delta.y
}

/** Parse `@step` / `@shoot` const value into dir words. */
export function memoryparsedirstatvalue(value: unknown): WORD[] | undefined {
  if (!isstring(value)) {
    return undefined
  }
  const tokens = value.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    return undefined
  }
  return tokens
}
