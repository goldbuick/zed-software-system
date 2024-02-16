/*
What is wordtypes?
it is a set of helper functions that parse & identify multi-word data types
*/

import { isDefined } from 'ts-extras'

import { CHIP, WORD } from '../chip'
import { isArray, isNumber, isString } from '../mapping/types'

export type PT = [number, number]

export function checkpt(value: any): value is PT {
  return isArray(value) && isNumber(value[0]) && isNumber(value[1])
}

export enum COLOR {
  BLACK,
  DKBLUE,
  DKGREEN,
  DKCYAN,
  DKRED,
  DKPURPLE,
  DKYELLOW,
  LTGRAY,
  DKGRAY,
  BLUE,
  GREEN,
  CYAN,
  RED,
  PURPLE,
  YELLOW,
  WHITE,
}

export enum DIR {
  IDLE,
  NORTH,
  SOUTH,
  WEST,
  EAST,
  BY,
  AT,
  FLOW,
  SEEK,
  RNDNS,
  RNDNE,
  RND,
  // modifiers
  CW,
  CCW,
  OPP,
  RNDP,
}

export enum COLLISION {
  SOLID,
  WALK,
  SWIM,
  BULLET,
}

export enum CATEGORY {
  TERRAIN,
  OBJECT,
}

export const categoryconsts = {
  terrain: 'TERRAIN',
  object: 'OBJECT',
} as const

export type STR_CATEGORY =
  (typeof categoryconsts)[keyof typeof categoryconsts][]

export function checkcategory(value: any): value is STR_CATEGORY {
  return isArray(value) && isDefined(CATEGORY[value[0]])
}

export const collisionconsts = {
  solid: 'SOLID',
  walk: 'WALK',
  swim: 'SWIM',
  bullet: 'BULLET',
  // aliases
  walkable: 'WALK',
  swimmable: 'SWIM',
} as const

export type STR_COLLISION =
  (typeof collisionconsts)[keyof typeof collisionconsts][]

export function checkcollision(value: any): value is STR_COLLISION {
  return isArray(value) && isDefined(COLLISION[value[0]])
}

export const colorconsts = {
  black: 'BLACK',
  dkblue: 'DKBLUE',
  dkgreen: 'DKGREEN',
  dkcyan: 'DKCYAN',
  dkred: 'DKRED',
  dkpurple: 'DKPURPLE',
  dkyellow: 'DKYELLOW',
  ltgray: 'LTGRAY',
  dkgray: 'DKGRAY',
  blue: 'BLUE',
  green: 'GREEN',
  cyan: 'CYAN',
  red: 'RED',
  purple: 'PURPLE',
  yellow: 'YELLOW',
  white: 'WHITE',
  // aliases
  brown: 'DKYELLOW',
  dkwhite: 'LTGRAY',
  ltgrey: 'LTGRAY',
  gray: 'LTGRAY',
  grey: 'LTGRAY',
  dkgrey: 'DKGRAY',
  ltblack: 'DKGRAY',
} as const

export type STR_COLOR = (typeof colorconsts)[keyof typeof colorconsts][]

export function checkcolor(value: any): value is STR_COLOR {
  return isArray(value) && isDefined(COLOR[value[0]])
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
} as const

export type STR_DIR = (typeof dirconsts)[keyof typeof dirconsts][]

export function checkdir(value: any): value is STR_DIR {
  return isArray(value) && isDefined(DIR[value[0]])
}

// read a numerical value from words
export function readnumber(
  chip: CHIP,
  words: WORD[],
  i: number,
): [number, number] {
  const value: WORD | undefined = words[i]
  return [
    (typeof value === 'string' ? chip.get(value) : undefined) ?? value,
    i + 1,
  ]
}

// read a numerical value from words
export function readexpr(
  chip: CHIP,
  words: WORD[],
  i: number,
): [number, number] {
  const maybevalue = words[i]

  // check for number
  if (isNumber(maybevalue)) {
    return [maybevalue, i + 1]
  }

  // check for flag
  if (isString(maybevalue)) {
    const flagvalue = chip.get(maybevalue)
    if (isDefined(flagvalue)) {
      return [flagvalue, i + 1]
    }
  }

  // check for these ??
  /*
ALLIGNED
This flag is SET whenever the object is aligned with the player either horizontally or vertically.
CONTACT
This flag is SET whenever the object is adjacent to (touching) the player.
BLOCKED <direction>
This flag is SET when the object is not free to move in the given direction, and CLEAR when the object is free to move in the direction.
ENERGIZED
This flag is SET whenever the player has touched an energizer and can not be harmed by creatures and bullets.
ANY <color> <item>
  */

  // ooops
  return [0, 0]
}
