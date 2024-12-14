import { isarray, ispresent, isstring, MAYBE } from 'zss/mapping/types'

import { readexpr } from './expr'
import { READ_CONTEXT } from './reader'
import { COLLISION, WORD } from './types'

export const collisionconsts = {
  issolid: 'ISSOLID',
  iswalk: 'ISWALK',
  isswim: 'ISSWIM',
  isbullet: 'ISBULLET',
  // aliases
  iswalkable: 'ISWALKABLE',
  isswimmable: 'ISSWIMABLE',
} as const

export const collisionenums = {
  issolid: COLLISION.ISSOLID,
  iswalk: COLLISION.ISWALK,
  isswim: COLLISION.ISSWIM,
  isbullet: COLLISION.ISBULLET,
  // aliases
  iswalkable: COLLISION.ISWALK,
  isswimmable: COLLISION.ISSWIM,
} as const

export type STR_COLLISION_TYPE = typeof collisionconsts
export type STR_COLLISION_KEYS = keyof STR_COLLISION_TYPE
export type STR_COLLISION_CONST = STR_COLLISION_TYPE[STR_COLLISION_KEYS]
export type STR_COLLISION = STR_COLLISION_CONST[]

export function isstrcollision(value: any): value is STR_COLLISION {
  return isarray(value) && isstrcollisionconst(value[0])
}

export function mapstrcollisiontoenum(value: STR_COLLISION): COLLISION {
  return collisionenums[value[0].toLowerCase() as keyof typeof collisionenums]
}

function isstrcollisionconst(value: any): value is STR_COLLISION_CONST {
  return ispresent(COLLISION[value]) && isstring(value)
}

export function mapstrcollision(value: any): MAYBE<STR_COLLISION_CONST> {
  if (isstring(value)) {
    return collisionconsts[value.toLowerCase() as STR_COLLISION_KEYS]
  }
  return undefined
}

export function readcollision(
  index: number,
): [STR_COLLISION | undefined, number] {
  const value: MAYBE<WORD> = READ_CONTEXT.words[index]

  // already mapped
  if (isstrcollision(value)) {
    return [value, index + 1]
  }
  if (isstrcollisionconst(value)) {
    return [[value], index + 1]
  }

  // attempt to read value
  const [maybecollision, ii] = readexpr(index)

  if (isstrcollision(maybecollision)) {
    return [maybecollision, ii]
  }
  if (isstrcollisionconst(maybecollision)) {
    return [[maybecollision], ii]
  }

  // fail
  return [undefined, index]
}
