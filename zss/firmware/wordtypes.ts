/*
What is wordtypes?
it is a set of helper functions that parse & identify multi-word data types
*/

import { isDefined } from 'ts-extras'

import { CHIP, WORD } from '../chip'
import { SPRITES_SINDEX, SPRITES_TINDEX } from '../gadget/data/types'
import { randomInteger } from '../mapping/number'
import {
  isArray,
  isMaybeNumber,
  isMaybeString,
  isNumber,
  isString,
} from '../mapping/types'

type MAYBE_WORD = WORD | undefined

export type PT = [number, number]

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
  CLEAR = SPRITES_TINDEX,
  SHADOW = SPRITES_SINDEX,
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

export function ispt(value: any): value is PT {
  return isArray(value) && isNumber(value[0]) && isNumber(value[1])
}

export function dirfrompts(last: PT, current: PT) {
  const dx = current[0] - last[0]
  const dy = current[1] - last[1]
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

export const categoryconsts = {
  terrain: 'TERRAIN',
  object: 'OBJECT',
} as const

export type STR_CATEGORY =
  (typeof categoryconsts)[keyof typeof categoryconsts][]

function isstrcategoryconst(value: any) {
  return isDefined(CATEGORY[value])
}

export function isstrcategory(value: any): value is STR_CATEGORY {
  return isArray(value) && isstrcategoryconst(value[0])
}

export function readcategory(
  chip: CHIP,
  words: WORD[],
  index: number,
): [STR_CATEGORY | undefined, number] {
  // already mapped
  const maybestrcategory = words[index]
  if (isstrcategory(maybestrcategory)) {
    return [maybestrcategory, index + 1]
  }

  const categoryvalue: STR_CATEGORY = []

  for (let i = index; i < words.length; ++i) {
    const value: MAYBE_WORD = words[i]
    if (typeof value === 'string') {
      const maybecategory = chip.get(value)
      if (!isstrcategoryconst(maybecategory)) {
        break
      }
      categoryvalue.push(maybecategory)
    } else {
      break
    }
  }

  if (categoryvalue.length === 0) {
    return [undefined, index]
  }

  return [categoryvalue, index + categoryvalue.length]
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

function isstrcollisionconst(value: any) {
  return isDefined(COLLISION[value])
}

export function isstrcollision(value: any): value is STR_COLLISION {
  return isArray(value) && isstrcollisionconst(value[0])
}

export function readcollision(
  chip: CHIP,
  words: WORD[],
  index: number,
): [STR_COLLISION | undefined, number] {
  // already mapped
  const maybestrcollision = words[index]
  if (isstrcollision(maybestrcollision)) {
    return [maybestrcollision, index + 1]
  }

  const collisionvalue: STR_COLLISION = []

  for (let i = index; i < words.length; ++i) {
    const value: MAYBE_WORD = words[i]
    if (typeof value === 'string') {
      const maybecollision = chip.get(value)
      if (!isstrcollisionconst(maybecollision)) {
        break
      }
      collisionvalue.push(maybecollision)
    } else {
      break
    }
  }

  if (collisionvalue.length === 0) {
    return [undefined, index]
  }

  return [collisionvalue, index + collisionvalue.length]
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
  // bg color
  onblack: 'BLACK',
  ondkblue: 'DKBLUE',
  ondkgreen: 'DKGREEN',
  ondkcyan: 'DKCYAN',
  ondkred: 'DKRED',
  ondkpurple: 'DKPURPLE',
  ondkyellow: 'DKYELLOW',
  onltgray: 'LTGRAY',
  ondkgray: 'DKGRAY',
  onblue: 'BLUE',
  ongreen: 'GREEN',
  oncyan: 'CYAN',
  onred: 'RED',
  onpurple: 'PURPLE',
  onyellow: 'YELLOW',
  onwhite: 'WHITE',
  clear: 'CLEAR',
  shadow: 'SHADOW',
  // aliases
  onbrown: 'DKYELLOW',
  ondkwhite: 'LTGRAY',
  onltgrey: 'LTGRAY',
  ongray: 'LTGRAY',
  ongrey: 'LTGRAY',
  ondkgrey: 'DKGRAY',
  onltblack: 'DKGRAY',
} as const

export type STR_COLOR = (typeof colorconsts)[keyof typeof colorconsts][]

function isstrcolorconst(value: any) {
  return isDefined(COLOR[value])
}

export function isstrcolor(value: any): value is STR_COLOR {
  return isArray(value) && isstrcolorconst(value[0])
}

export function readcolor(
  chip: CHIP,
  words: WORD[],
  index: number,
): [STR_COLOR | undefined, number] {
  // already mapped
  const maybestrcolor = words[index]
  if (isstrcolor(maybestrcolor)) {
    return [maybestrcolor, index + 1]
  }

  const colorvalue: STR_COLOR = []

  for (let i = index; i < words.length; ++i) {
    const value: MAYBE_WORD = words[i]
    if (typeof value === 'string') {
      const maybecolor = chip.get(value)
      if (!isstrcolorconst(maybecolor)) {
        break
      }
      colorvalue.push(maybecolor)
    } else {
      break
    }
  }

  if (colorvalue.length === 0) {
    return [undefined, index]
  }

  return [colorvalue, index + colorvalue.length]
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

function isstrdirconst(value: any) {
  return isDefined(DIR[value])
}

export function isstrdir(value: any): value is STR_DIR {
  return isArray(value) && isstrdirconst(value[0])
}

export function readdir(
  chip: CHIP,
  words: WORD[],
  index: number,
): [STR_DIR | undefined, number] {
  // already mapped
  const maybestrdir = words[index]
  if (isstrdir(maybestrdir)) {
    return [maybestrdir, index + 1]
  }

  const dirvalue: STR_DIR = []

  for (let i = index; i < words.length; ++i) {
    const value: MAYBE_WORD = words[i]
    if (typeof value === 'string') {
      const maybedir = chip.get(value)
      if (!isstrdirconst(maybedir)) {
        break
      }
      dirvalue.push(maybedir)
    } else {
      break
    }
  }

  if (dirvalue.length === 0) {
    return [undefined, index]
  }

  return [dirvalue, index + dirvalue.length]
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

// read a value from words
// consider splitting out to own file
export function readexpr(chip: CHIP, words: WORD[], i: number): [any, number] {
  const maybevalue = words[i]
  if (!isDefined(maybevalue)) {
    return [undefined, i]
  }

  // check for number or array
  if (isNumber(maybevalue) || isArray(maybevalue)) {
    return [maybevalue, i + 1]
  }

  // check for flags and expressions
  if (isString(maybevalue)) {
    const maybeexpr = maybevalue.toLowerCase()

    // special case rnd
    if (maybeexpr === 'rnd') {
      // RND - returns 0 or 1
      // RND <number> - return 0 to number
      // RND <number> <number> - return number to number
      const [min, ii] = readexpr(chip, words, i + 1)
      const [max, iii] = readexpr(chip, words, ii)
      if (isNumber(min) && isNumber(max)) {
        return [randomInteger(min, max), iii]
      }
      if (isNumber(min)) {
        return [randomInteger(0, min), ii]
      }
      return [randomInteger(0, 1), i + 1]
    }

    // check for flag
    const maybeflag = chip.get(maybevalue)
    if (isDefined(maybeflag)) {
      return [maybeflag, i + 1]
    }

    /*
    port existing zed cafe expressions here ...
    func, min, max, ceil, floor, etc...
    */
    switch (maybeexpr) {
      case 'aligned':
      case 'alligned':
        // ALLIGNED
        // This flag is SET whenever the object is aligned with the player either horizontally or vertically.
        break
      case 'contact':
        // CONTACT
        // This flag is SET whenever the object is adjacent to (touching) the player.
        break
      case 'blocked':
        // BLOCKED <direction>
        // This flag is SET when the object is not free to move in the given direction, and
        // CLEAR when the object is free to move in the direction.
        break
      case 'any':
        // ANY <color> <item>
        // This flag is SET whenever the given kind is visible on the board
        break
    }
  }

  // pass through everything else
  return [maybevalue, i + 1]
}

// param parsing engine
// a simple DSL to say string [number] [number] args

export enum ARG_TYPE {
  CATEGORY,
  COLLISION,
  COLOR,
  KIND,
  DIR,
  NUMBER,
  STRING,
  MAYBE_CATEGORY,
  MAYBE_COLLISION,
  MAYBE_COLOR,
  MAYBE_KIND,
  MAYBE_DIR,
  MAYBE_NUMBER,
  MAYBE_STRING,
  ANY,
}

export type ARG_TYPE_MAP = {
  [ARG_TYPE.CATEGORY]: CATEGORY
  [ARG_TYPE.COLLISION]: COLLISION
  [ARG_TYPE.COLOR]: COLOR
  [ARG_TYPE.KIND]: [string, string?, string?]
  [ARG_TYPE.DIR]: PT
  [ARG_TYPE.NUMBER]: number
  [ARG_TYPE.STRING]: string
  [ARG_TYPE.MAYBE_CATEGORY]: CATEGORY | undefined
  [ARG_TYPE.MAYBE_COLLISION]: COLLISION | undefined
  [ARG_TYPE.MAYBE_COLOR]: COLOR | undefined
  [ARG_TYPE.MAYBE_KIND]: [string, string?, string?] | undefined
  [ARG_TYPE.MAYBE_DIR]: PT | undefined
  [ARG_TYPE.MAYBE_NUMBER]: number | undefined
  [ARG_TYPE.MAYBE_STRING]: string | undefined
  [ARG_TYPE.ANY]: any
}

type ARG_TYPES = [ARG_TYPE, ...ARG_TYPE[]]
type ARG_TYPE_VALUES<T extends ARG_TYPES> = {
  [P in keyof T]: ARG_TYPE_MAP[T[P]]
}

function didexpect(msg: string) {
  throw new Error(`Invalid arg, expected: ${msg}`)
}

export function readargs<T extends ARG_TYPES>(
  chip: CHIP,
  words: WORD[],
  args: T,
): ARG_TYPE_VALUES<T> {
  const values = []

  let ii = 0
  for (let i = 0; i < args.length; ++i) {
    const [value, iii] = readexpr(chip, words, ii)
    ii = iii
    values.push(value)

    switch (args[i]) {
      case ARG_TYPE.CATEGORY:
        if (!(value in CATEGORY)) {
          didexpect('terrain or object')
        }
        break
      case ARG_TYPE.COLLISION:
        if (!(value in COLLISION)) {
          didexpect('solid, walk, swim, bullet, walkable or swimmable')
        }
        break
      case ARG_TYPE.COLOR:
        if (!(value in COLOR)) {
          didexpect('color')
        }
        break
      case ARG_TYPE.KIND:
        if (
          !isArray(value) ||
          !isString(value[0]) ||
          !isMaybeString(value[1]) ||
          !isMaybeString(value[2])
        ) {
          didexpect('kind')
        }
        break
      case ARG_TYPE.DIR:
        if (!ispt(value)) {
          didexpect('direction')
        }
        break
      case ARG_TYPE.NUMBER:
        if (!isNumber(value)) {
          didexpect('number')
        }
        break
      case ARG_TYPE.STRING:
        if (!isString(value)) {
          didexpect('string')
        }
        break
      case ARG_TYPE.MAYBE_CATEGORY:
        if (value !== undefined && !(value in CATEGORY)) {
          didexpect('optional terrain or object')
        }
        break
      case ARG_TYPE.MAYBE_COLLISION:
        if (value !== undefined && !(value in COLLISION)) {
          didexpect('optional solid, walk, swim, bullet, walkable or swimmable')
        }
        break
      case ARG_TYPE.MAYBE_COLOR:
        if (value !== undefined && !(value in COLOR)) {
          didexpect('optional color')
        }
        break
      case ARG_TYPE.MAYBE_KIND:
        if (
          value !== undefined &&
          (!isArray(value) ||
            !isString(value[0]) ||
            !isMaybeString(value[1]) ||
            !isMaybeString(value[2]))
        ) {
          didexpect('optional kind')
        }
        break
      case ARG_TYPE.MAYBE_DIR:
        if (value !== undefined && !ispt(value)) {
          didexpect('optional direction')
        }
        break
      case ARG_TYPE.MAYBE_NUMBER:
        if (!isMaybeNumber(value)) {
          didexpect('optional number')
        }
        break
      case ARG_TYPE.MAYBE_STRING:
        if (!isMaybeString(value)) {
          didexpect('optional string')
        }
        break
      case ARG_TYPE.ANY:
        if (isDefined(value)) {
          didexpect('a value, but got empty')
        }
        break
    }
  }

  // @ts-expect-error any[] doesn't work
  return values
}
