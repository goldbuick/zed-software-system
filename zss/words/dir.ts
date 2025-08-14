import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'

import { ARG_TYPE, READ_CONTEXT, readargs } from './reader'
import { DIR, NAME, PT, WORD } from './types'

export function ispt(value: any): value is PT {
  return ispresent(value) && ispresent(value.x) && ispresent(value.y)
}

export function ptapplydir(
  pt: PT,
  dir: DIR.NORTH | DIR.SOUTH | DIR.WEST | DIR.EAST | DIR.IDLE | undefined,
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

export function dirfromdelta(dx: number, dy: number) {
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
  return DIR.IDLE
}

export function dirfrompts(last: PT, current: PT) {
  return dirfromdelta(current.x - last.x, current.y - last.y)
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
  // pathfinding
  away: 'AWAY',
  toward: 'TOWARD',
  find: 'FIND',
  flee: 'FLEE',
  // combinations
  to: 'TO',
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
  // layer specifier
  over: 'OVER',
  under: 'UNDER',
  // distance specifiers
  within: 'WITHIN',
  awayby: 'AWAYBY',
} as const

export type STR_DIR_TYPE = typeof dirconsts
export type STR_DIR_KEYS = keyof STR_DIR_TYPE
export type STR_DIR_CONST = STR_DIR_TYPE[STR_DIR_KEYS]
export type STR_DIR = (STR_DIR_CONST | number)[]

export type EVAL_DIR = {
  dir: STR_DIR
  startpt: PT
  destpt: PT
  layer: DIR
  within: number
  awayby: number
}

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

export function mapstrdir(value: any): MAYBE<STR_DIR_CONST> {
  if (isstring(value)) {
    return dirconsts[NAME(value) as STR_DIR_KEYS]
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

  // check value
  const maybedir = checkfordirconst(value)
  if (isstrdir(maybedir)) {
    return [maybedir, index + 1]
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

    // some directions have args
    switch (maybedir[0]) {
      case 'AT':
      case 'BY':
      case 'AWAY':
      case 'TOWARD': {
        const [xvalue, yvalue, iii] = readargs(READ_CONTEXT.words, ii, [
          ARG_TYPE.NUMBER,
          ARG_TYPE.NUMBER,
        ])
        strdir.push(xvalue, yvalue)
        ii = iii
        break
      }
      case 'FLEE':
      case 'FIND': {
        const [kind, iii] = readargs(READ_CONTEXT.words, ii, [ARG_TYPE.KIND])
        // strdir.push(dir.destpt.x, dir.destpt.y)
        console.info('kind', kind)
        ii = iii
        break
      }
      case 'TO': {
        const [dir1, dir2, iii] = readargs(READ_CONTEXT.words, ii, [
          ARG_TYPE.DIR,
          ARG_TYPE.DIR,
        ])
        const sx = READ_CONTEXT.element?.x ?? 0
        const sy = READ_CONTEXT.element?.y ?? 0
        dir1.destpt.x -= sx
        dir1.destpt.y -= sy
        dir2.destpt.x -= sx
        dir2.destpt.y -= sy
        strdir.push(
          sx + dir1.destpt.x + dir2.destpt.x,
          sy + dir1.destpt.y + dir2.destpt.y,
        )
        ii = iii
        break
      }
      case 'WITHIN':
      case 'AWAYBY': {
        const [amount, iii] = readargs(READ_CONTEXT.words, ii, [
          ARG_TYPE.NUMBER,
        ])
        strdir.push(amount)
        ii = iii
        break
      }
    }

    // if we consume a modifier we need to read more dir consts
    // if so, stop reading the direction
    const nextii = ii
    switch (maybedir[0]) {
      case 'CW':
      case 'CCW':
      case 'OPP':
      case 'RNDP':
      case 'OVER':
      case 'UNDER':
      case 'WITHIN':
      case 'AWAYBY':
        break
      default:
        return [strdir, ii]
    }

    // get next item in list
    const [maybenextdir, iii] = readdirconst(nextii)
    maybedir = maybenextdir
    ii = iii
  }

  return strdir.length ? [strdir, ii] : [undefined, index]
}
