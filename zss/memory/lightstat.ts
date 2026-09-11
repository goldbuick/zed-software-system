import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import {
  dirfromdelta,
  isstrdir,
  mapstrdirtoconst,
  ptapplydir,
  readdir,
} from 'zss/words/dir'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, DIR, PT, WORD } from 'zss/words/types'

import { memoryevaldir } from './boarddirection'
import { BOARD, BOARD_ELEMENT } from './types'

/** STR_DIR from step/shoot/light axis deltas (X wins over Y). */
export function memorystrdirfromdelta(dx: number, dy: number): WORD {
  return [DIR[dirfromdelta(dx, dy)]]
}

/**
 * Write lightsteps (+ optional cone axes) onto element.
 * When `setdir` is false, only lightsteps is updated.
 * When `setdir` is true and dirwords empty, cone is cleared (circle).
 */
export function memorywritelightstat(
  board: BOARD | undefined,
  element: BOARD_ELEMENT,
  radius: number,
  dirwords: WORD[] | undefined,
  setdir: boolean,
  frompt?: PT,
) {
  element.lightsteps = radius
  if (!setdir) {
    return
  }
  if (!ispresent(dirwords) || dirwords.length === 0) {
    element.lightx = 0
    element.lighty = 0
    return
  }
  const prevwords = READ_CONTEXT.words
  READ_CONTEXT.words = dirwords
  const [strdir] = readdir(0)
  READ_CONTEXT.words = prevwords
  if (!isstrdir(strdir)) {
    element.lightx = 0
    element.lighty = 0
    return
  }
  const origin: PT = frompt ?? {
    x: element.x ?? 0,
    y: element.y ?? 0,
  }
  // Prefer eval when a board is present (modifiers / seek / etc.).
  if (ispresent(board)) {
    const dest = memoryevaldir(board, element, '', strdir, origin)
    element.lightx = dest.destpt.x - origin.x
    element.lighty = dest.destpt.y - origin.y
    return
  }
  // Kind @light without board: cardinal delta from STR_DIR consts.
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
  element.lightx = delta.x
  element.lighty = delta.y
}

/** Parse `@light` / `#set light` value: number, or `"<radius> [dir…]"`. */
export function memoryparselightstatvalue(
  value: unknown,
): { radius: number; dirwords: WORD[] } | undefined {
  if (isnumber(value)) {
    return { radius: value, dirwords: [] }
  }
  if (!isstring(value)) {
    return undefined
  }
  const tokens = value.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    return undefined
  }
  const radius = parseFloat(tokens[0])
  if (!isnumber(radius) || Number.isNaN(radius)) {
    return undefined
  }
  return { radius, dirwords: tokens.slice(1) }
}

/** Read remaining words as NUMBER then optional DIR for #pset light. */
export function memoryreadlightpsetargs(
  words: WORD[],
  index: number,
): { radius: number; dirwords: WORD[]; setdir: boolean; next: number } {
  const [radius, ii] = readargs(words, index, [ARG_TYPE.NUMBER])
  if (ii >= words.length) {
    return { radius, dirwords: [], setdir: false, next: ii }
  }
  const prevwords = READ_CONTEXT.words
  READ_CONTEXT.words = words
  const [strdir, iii] = readdir(ii)
  READ_CONTEXT.words = prevwords
  if (isstrdir(strdir)) {
    return {
      radius,
      dirwords: words.slice(ii, iii),
      setdir: true,
      next: iii,
    }
  }
  return { radius, dirwords: [], setdir: false, next: ii }
}

export function memoryclearlightstat(element: BOARD_ELEMENT) {
  element.lightsteps = 0
  element.lightx = 0
  element.lighty = 0
}
