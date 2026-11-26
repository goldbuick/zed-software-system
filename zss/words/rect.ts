import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { memoryptwithinboard } from 'zss/memory/ptwithinboard'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

import { PT, WORD } from './types'

/** Same shape as `ptstoarea` / batch paths: one token `x1,y1,x2,y2` (optional whitespace). */
const RECT_ONEWORD =
  /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/

export type BOARD_RECT = {
  pt1: PT
  pt2: PT
}

/** Normalize two corners into inclusive min/max AABB. */
export function normalizerect(
  x1: number,
  y1: number,
  x2: number = x1,
  y2: number = y1,
): BOARD_RECT {
  return {
    pt1: { x: Math.min(x1, x2), y: Math.min(y1, y2) },
    pt2: { x: Math.max(x1, x2), y: Math.max(y1, y2) },
  }
}

/** Parse one-word `x1,y1,x2,y2` into a normalized board rect. */
export function parserectoneword(word: WORD): MAYBE<BOARD_RECT> {
  if (!isstring(word)) {
    return undefined
  }
  const m = RECT_ONEWORD.exec(word)
  if (!m) {
    return undefined
  }
  const x1 = Math.round(Number(m[1]))
  const y1 = Math.round(Number(m[2]))
  const x2 = Math.round(Number(m[3]))
  const y2 = Math.round(Number(m[4]))
  if (![x1, y1, x2, y2].every((n) => Number.isFinite(n))) {
    return undefined
  }
  return normalizerect(x1, y1, x2, y2)
}

/**
 * Build rect from numbers already on a word list (x1 y1 [x2 y2]).
 * Returns next index after consumed numbers, or undefined if not a numeric start.
 */
export function parserectfromnumbers(
  words: WORD[],
  index: number,
): MAYBE<{ rect: BOARD_RECT; next: number }> {
  const x1 = words[index]
  if (!isnumber(x1)) {
    return undefined
  }
  const y1 = words[index + 1]
  if (!isnumber(y1)) {
    return undefined
  }
  const x2 = words[index + 2]
  const y2 = words[index + 3]
  if (isnumber(x2) && isnumber(y2)) {
    return {
      rect: normalizerect(x1, y1, x2, y2),
      next: index + 4,
    }
  }
  return {
    rect: normalizerect(x1, y1),
    next: index + 2,
  }
}

/** All in-board cells in an inclusive AABB. */
export function recttargetpts(pt1: PT, pt2: PT): PT[] {
  const rect = normalizerect(pt1.x, pt1.y, pt2.x, pt2.y)
  const targets: PT[] = []
  for (let y = rect.pt1.y; y <= rect.pt2.y; ++y) {
    for (let x = rect.pt1.x; x <= rect.pt2.x; ++x) {
      const pt = { x, y }
      if (memoryptwithinboard(pt)) {
        targets.push(pt)
      }
    }
  }
  return targets
}

/** Full-board default region (transform filter default). */
export function fullboardrect(): BOARD_RECT {
  return {
    pt1: { x: 0, y: 0 },
    pt2: { x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 },
  }
}

export function ispresentrect(value: MAYBE<BOARD_RECT>): value is BOARD_RECT {
  return ispresent(value)
}
