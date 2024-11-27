import { isarray, ispresent, isstring, MAYBE } from 'zss/mapping/types'

import { DIR } from './consts'
import { readexpr } from './expr'
import { ARG_TYPE, READ_CONTEXT, readargs } from './reader'
import { PT, WORD } from './types'

export function ispt(value: any): value is PT {
  return ispresent(value) && ispresent(value.x) && ispresent(value.y)
}

export function ptapplydir(
  pt: PT,
  dir: DIR.NORTH | DIR.SOUTH | DIR.WEST | DIR.EAST | undefined,
): PT {
  switch (dir) {
    case DIR.NORTH:
      --pt.y
      break
    case DIR.SOUTH:
      ++pt.y
      break
    case DIR.WEST:
      --pt.x
      break
    case DIR.EAST:
      ++pt.x
      break
    default:
      // no-op
      break
  }
  return pt
}

export function dirfrompts(last: PT, current: PT) {
  const dx = current.x - last.x
  const dy = current.y - last.y
  if (dx < 0) {
    return DIR.WEST
  }
  if (dx > 0) {
    return DIR.EAST
  }
  if (dy < 0) {
    return DIR.NORTH
  }
  if (dy > 0) {
    return DIR.SOUTH
  }
}

export const dirconsts = {
  idle: 'IDLE',
  up: 'NORTH',
  down: 'SOUTH',
  left: 'WEST',
  right: 'EAST',
  by: 'BY',
  at: 'AT',
  flow: 'FLOW',
  seek: 'SEEK',
  rndns: 'RNDNS',
  rndne: 'RNDNE',
  rnd: 'RND',
  // modifiers
  cw: 'CW',
  ccw: 'CCW',
  opp: 'OPP',
  rndp: 'RNDP',
  // aliases
  i: 'IDLE',
  u: 'NORTH',
  north: 'NORTH',
  n: 'NORTH',
  d: 'SOUTH',
  south: 'SOUTH',
  s: 'SOUTH',
  l: 'WEST',
  west: 'WEST',
  w: 'WEST',
  r: 'EAST',
  east: 'EAST',
  e: 'EAST',
  // framing
  edit: 'EDIT',
} as const

export type STR_DIR_TYPE = typeof dirconsts
export type STR_DIR_KEYS = keyof STR_DIR_TYPE
export type STR_DIR_CONST = STR_DIR_TYPE[STR_DIR_KEYS]
export type STR_DIR = (STR_DIR_CONST | number)[]

export function isstrdir(value: any): value is STR_DIR {
  return isarray(value) && isstrdirconst(value[0])
}

function isstrdirconst(value: any): value is STR_DIR_CONST {
  return ispresent(DIR[value]) && isstring(value)
}

export function mapstrdirtoconst(value: any): DIR {
  const maybedir = DIR[value]
  if (ispresent(maybedir)) {
    // @ts-expect-error yay enum junk
    return maybedir
  }
  return DIR.IDLE
}

function mapstrdir(value: any): MAYBE<STR_DIR_CONST> {
  if (isstring(value)) {
    return dirconsts[value.toLowerCase() as STR_DIR_KEYS]
  }
  return undefined
}

function checkfordirconst(value: MAYBE<WORD>): MAYBE<STR_DIR> {
  // already mapped STR_DIR
  if (isstrdir(value)) {
    return value
  }

  // convert STR_DIR_CONST to STR_DIR
  if (isstrdirconst(value)) {
    return [value]
  }

  // convert name to const
  const maybedir = mapstrdir(value)
  if (ispresent(maybedir)) {
    return [maybedir]
  }

  return undefined
}

function readdirconst(index: number): [STR_DIR | undefined, number] {
  const value: MAYBE<WORD> = READ_CONTEXT.words[index]

  // pre-check
  const maybedir = checkfordirconst(value)
  if (isstrdir(maybedir)) {
    return [maybedir, index + 1]
  }

  // read expression
  const [exprvalue, iii] = readexpr(index)

  // post-check
  const maybedir2 = checkfordirconst(exprvalue)
  if (isstrdir(maybedir2)) {
    return [maybedir2, iii]
  }

  // fail
  return [undefined, index]
}

export function readdir(index: number): [STR_DIR | undefined, number] {
  const strdir: STR_DIR = []

  let [maybedir, ii] = readdirconst(index)
  while (isstrdir(maybedir)) {
    // make a list !
    strdir.push(...maybedir)

    // read coords for at & by
    if ((maybedir[0] === 'AT' || maybedir[0] === 'BY') && maybedir.length < 2) {
      // read args
      const [xvalue, yvalue, iii] = readargs(READ_CONTEXT.words, ii, [
        ARG_TYPE.NUMBER,
        ARG_TYPE.NUMBER,
      ])
      strdir.push(xvalue, yvalue)
      ii = iii
    }

    // get next item in list
    const [maybenextdir, iii] = readdirconst(ii)
    maybedir = maybenextdir
    ii = iii
  }

  return strdir.length ? [strdir, ii] : [undefined, index]
}
