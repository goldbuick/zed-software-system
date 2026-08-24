import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'

import {
  STR_COLOR,
  colortobg,
  readcolor,
  readstrbg,
  readstrcolor,
} from './color'
import { READ_CONTEXT } from './reader'
import { COLOR, WORD } from './types'

/** Same tuple shape as STR_KIND; freeform name (no codepage check). */
export type STR_GROUP = [string, STR_COLOR?]

export function isstrgroup(value: any): value is STR_GROUP {
  return isarray(value) && typeof value[0] === 'string'
}

export function strgrouptostr(group: STR_GROUP): string[] {
  const [groupname, strcolor] = group
  return [...(strcolor ?? []), groupname]
}

function readname(index: number): [string | undefined, number] {
  const value: MAYBE<WORD> = READ_CONTEXT.words[index]
  if (isstring(value)) {
    return [value, index + 1]
  }
  return [undefined, index]
}

export function readgroup(index: number): [STR_GROUP | undefined, number] {
  const value: MAYBE<WORD> = READ_CONTEXT.words[index]

  if (isstrgroup(value)) {
    return [value, index + 1]
  }

  const [maybecolor, ii] = readcolor(index)
  const [maybename, iii] = readname(ii)

  if (isstring(maybename)) {
    return [[maybename, maybecolor], iii]
  }

  return [undefined, index]
}

export function readstrgroupname(group: MAYBE<STR_GROUP>): MAYBE<string> {
  if (!isstrgroup(group)) {
    return undefined
  }
  const [maybename] = group
  return maybename
}

export function readstrgroupcolor(group: MAYBE<STR_GROUP>): MAYBE<COLOR> {
  if (!isstrgroup(group)) {
    return undefined
  }
  const [, strcolor] = group
  const color = ispresent(strcolor) ? readstrcolor(strcolor) : undefined
  return ispresent(color) ? color : undefined
}

export function readstrgroupbg(group: MAYBE<STR_GROUP>): MAYBE<COLOR> {
  if (!isstrgroup(group)) {
    return undefined
  }
  const [, strcolor] = group
  const bg = ispresent(strcolor) ? readstrbg(strcolor) : undefined
  return ispresent(bg) ? colortobg(bg) : undefined
}
