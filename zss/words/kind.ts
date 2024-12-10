import { isarray, ispresent, isstring, MAYBE } from 'zss/mapping/types'

import { readcolor, readstrbg, readstrcolor, STR_COLOR } from './color'
import { readexpr } from './expr'
import { READ_CONTEXT } from './reader'
import { COLOR, WORD } from './types'

export type STR_KIND = [string, STR_COLOR?]

export function isstrkind(value: any): value is STR_KIND {
  return isarray(value) && typeof value[0] === 'string'
}

export function readkind(index: number): [STR_KIND | undefined, number] {
  const value: MAYBE<WORD> = READ_CONTEXT.words[index]

  // already mapped
  if (isstrkind(value)) {
    return [value, index + 1]
  }

  const [maybecolor, ii] = readcolor(index)
  const [maybename, iii] = readexpr(ii, false)

  // found a string, color is optional
  if (isstring(maybename)) {
    return [[maybename, maybecolor], iii]
  }

  // fail
  return [undefined, index]
}

export function readstrkindname(kind: MAYBE<STR_KIND>): MAYBE<string> {
  if (!isstrkind(kind)) {
    return undefined
  }
  const [maybename] = kind
  return maybename
}

export function readstrkindcolor(kind: MAYBE<STR_KIND>): MAYBE<COLOR> {
  if (!isstrkind(kind)) {
    return undefined
  }
  const [, strcolor] = kind
  const color = ispresent(strcolor) ? readstrcolor(strcolor) : undefined
  return ispresent(color) ? color : undefined
}

export function readstrkindbg(kind: MAYBE<STR_KIND>): MAYBE<COLOR> {
  if (!isstrkind(kind)) {
    return undefined
  }
  const [, strcolor] = kind
  const bg = ispresent(strcolor) ? readstrbg(strcolor) : undefined
  return ispresent(bg) ? bg : undefined
}
