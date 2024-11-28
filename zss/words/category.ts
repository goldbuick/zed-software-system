import { isarray, ispresent, isstring, MAYBE } from 'zss/mapping/types'

import { CATEGORY } from './types'
import { readexpr } from './expr'
import { READ_CONTEXT } from './reader'
import { WORD } from './types'

export const categoryconsts = {
  isterrain: 'ISTERRAIN',
  isobject: 'ISOBJECT',
} as const

export type STR_CATEGORY_TYPE = typeof categoryconsts
export type STR_CATEGORY_KEYS = keyof STR_CATEGORY_TYPE
export type STR_CATEGORY_CONST = STR_CATEGORY_TYPE[STR_CATEGORY_KEYS]
export type STR_CATEGORY = STR_CATEGORY_CONST[]

export function isstrcategory(value: any): value is STR_CATEGORY {
  return isarray(value) && isstrcategoryconst(value[0])
}

function isstrcategoryconst(value: any): value is STR_CATEGORY_CONST {
  return ispresent(CATEGORY[value]) && isstring(value)
}

export function mapstrcategory(value: any): MAYBE<STR_CATEGORY_CONST> {
  if (isstring(value)) {
    return categoryconsts[value.toLowerCase() as STR_CATEGORY_KEYS]
  }
  return undefined
}

function checkforcategoryconst(value: MAYBE<WORD>): MAYBE<STR_CATEGORY> {
  // already mapped STR_CATEGORY
  if (isstrcategory(value)) {
    return value
  }

  // convert STR_CATEGORY_CONST to STR_CATEGORY
  if (isstrcategoryconst(value)) {
    return [value]
  }

  // convert name to const
  const maybecategory = mapstrcategory(value)
  if (ispresent(maybecategory)) {
    return [maybecategory]
  }

  return undefined
}

export function readcategory(
  index: number,
): [STR_CATEGORY | undefined, number] {
  const value: MAYBE<WORD> = READ_CONTEXT.words[index]

  // pre-check
  const maybecategory = checkforcategoryconst(value)
  if (isstrcategory(maybecategory)) {
    return [maybecategory, index + 1]
  }

  // read expression
  const [exprvalue, iii] = readexpr(index)

  // post-check
  const maybecategory2 = checkforcategoryconst(exprvalue)
  if (isstrcategory(maybecategory2)) {
    return [maybecategory2, iii]
  }

  // fail
  return [undefined, index]
}
