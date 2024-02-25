import { isDefined } from 'ts-extras'

import { CHIP, WORD } from '../chip'
import { SPRITES_SINDEX, SPRITES_TINDEX } from '../gadget/data/types'
import { range, pick } from '../mapping/array'
import { clamp, randomInteger } from '../mapping/number'
import { isArray, isMaybeString, isNumber, isString } from '../mapping/types'

type MAYBE_WORD = WORD | undefined

export type PT = { x: number; y: number }

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
  return isDefined(value) && isDefined(value.x) && isDefined(value.y)
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

export const categoryconsts = {
  terrain: 'TERRAIN',
  object: 'OBJECT',
} as const

export type STR_CATEGORY =
  (typeof categoryconsts)[keyof typeof categoryconsts][]

function isstrcategoryconst(value: any) {
  return isDefined(CATEGORY[value]) && isString(value)
}

export function isstrcategory(value: any): value is STR_CATEGORY {
  return isArray(value) && isstrcategoryconst(value[0])
}

export function readcategory(
  chip: CHIP,
  words: WORD[],
  index: number,
): [STR_CATEGORY | undefined, number] {
  const value: MAYBE_WORD = words[index]

  // already mapped
  if (isstrcategory(value)) {
    return [value, index + 1]
  }

  // single string
  if (typeof value === 'string') {
    const maybecategory = chip.get(value)
    if (isstrcategory(maybecategory)) {
      return [maybecategory, index + 1]
    }
    if (isstrcategoryconst(maybecategory)) {
      return [[maybecategory], index + 1]
    }
  }

  // fail
  return [undefined, index]
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
  return isDefined(COLLISION[value]) && isString(value)
}

export function isstrcollision(value: any): value is STR_COLLISION {
  return isArray(value) && isstrcollisionconst(value[0])
}

export function readcollision(
  chip: CHIP,
  words: WORD[],
  index: number,
): [STR_COLLISION | undefined, number] {
  const value: MAYBE_WORD = words[index]

  // already mapped
  if (isstrcollision(value)) {
    return [value, index + 1]
  }

  // single string
  if (typeof value === 'string') {
    const maybecollision = chip.get(value)
    if (isstrcollision(maybecollision)) {
      return [maybecollision, index + 1]
    }
    if (isstrcollisionconst(maybecollision)) {
      return [[maybecollision], index + 1]
    }
  }

  // fail
  return [undefined, index]
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
  return isDefined(COLOR[value]) && isString(value)
}

export function isstrcolor(value: any): value is STR_COLOR {
  return isArray(value) && isstrcolorconst(value[0])
}

export function readcolor(
  chip: CHIP,
  words: WORD[],
  index: number,
): [STR_COLOR | number | undefined, number] {
  const value: MAYBE_WORD = words[index]

  // already mapped
  if (isstrcolor(value)) {
    return [value, index + 1]
  }

  // single string
  if (typeof value === 'string') {
    const maybecolor = chip.get(value)
    if (isstrcolor(maybecolor)) {
      return [maybecolor, index + 1]
    }
    if (isstrcolorconst(maybecolor)) {
      return [[maybecolor], index + 1]
    }
  }

  return [undefined, index]
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
  return isDefined(DIR[value]) && isString(value)
}

export function isstrdir(value: any): value is STR_DIR {
  return isArray(value) && isstrdirconst(value[0])
}

export function readdir(
  chip: CHIP,
  words: WORD[],
  index: number,
): [STR_DIR | undefined, number] {
  const value: MAYBE_WORD = words[index]

  // already mapped
  if (isstrdir(value)) {
    return [value, index + 1]
  }

  // single string
  if (typeof value === 'string') {
    const maybedir = chip.get(value)
    if (isstrdir(maybedir)) {
      return [maybedir, index + 1]
    }
    if (isstrdirconst(maybedir)) {
      // need to handle special case of by & at
      return [[maybedir], index + 1]
    }
  }

  // fail
  return [undefined, index]
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
export function readexpr(
  chip: CHIP,
  words: WORD[],
  index: number,
): [any, number] {
  const maybevalue = words[index]

  // check consts
  const [maybecategory, n1] = readcategory(chip, words, index)
  if (isDefined(maybecategory)) {
    return [maybecategory, n1]
  }

  const [maybecollision, n2] = readcollision(chip, words, index)
  if (isDefined(maybecollision)) {
    return [maybecollision, n2]
  }

  const [maybecolor, n3] = readcolor(chip, words, index)
  if (isDefined(maybecolor)) {
    return [maybecolor, n3]
  }

  // special case rnd
  if (isString(maybevalue) && maybevalue.toLowerCase() === 'rnd') {
    // RND - returns 0 or 1
    // RND <number> - return 0 to number
    // RND <number> <number> - return number to number
    const [min, ii] = readexpr(chip, words, index + 1)
    const [max, iii] = readexpr(chip, words, ii)
    if (isNumber(min) && isNumber(max)) {
      return [randomInteger(min, max), iii]
    }
    if (isNumber(min)) {
      return [randomInteger(0, min), ii]
    }
    return [randomInteger(0, 1), index + 1]
  }

  const [maybedir, n4] = readdir(chip, words, index)
  if (isDefined(maybedir)) {
    return [maybedir, n4]
  }

  // check complex values

  // empty is invalid
  if (!isDefined(maybevalue)) {
    return [undefined, index]
  }

  // check for number or array
  if (ispt(maybevalue) || isNumber(maybevalue) || isArray(maybevalue)) {
    return [maybevalue, index + 1]
  }

  // check for flags and expressions
  if (isString(maybevalue)) {
    const maybeexpr = maybevalue.toLowerCase()

    // check for flag
    const maybeflag = chip.get(maybevalue)
    if (isDefined(maybeflag)) {
      return [maybeflag, index + 1]
    }

    // check for expressions
    switch (maybeexpr) {
      // zzt
      case 'aligned':
      case 'alligned': {
        // ALLIGNED
        // This flag is SET whenever the object is aligned with the player either horizontally or vertically.
        break
      }
      case 'contact': {
        // CONTACT
        // This flag is SET whenever the object is adjacent to (touching) the player.
        break
      }
      case 'blocked': {
        // BLOCKED <direction>
        // This flag is SET when the object is not free to move in the given direction, and
        // CLEAR when the object is free to move in the direction.
        break
      }
      case 'any': {
        // ANY <color> <item>
        // This flag is SET whenever the given kind is visible on the board
        break
      }
      // zss
      // numbers
      case 'abs': {
        // ABS <a>
        const [a, ii] = readargs(chip, words, index + 1, [ARG_TYPE.NUMBER])
        return [Math.abs(a), ii]
      }
      case 'ceil': {
        // CEIL <a>
        const [a, ii] = readargs(chip, words, index + 1, [ARG_TYPE.NUMBER])
        return [Math.ceil(a), ii]
      }
      case 'floor': {
        // FLOOR <a>
        const [a, ii] = readargs(chip, words, index + 1, [ARG_TYPE.NUMBER])
        return [Math.floor(a), ii]
      }
      case 'round': {
        // ROUND <a>
        const [a, ii] = readargs(chip, words, index + 1, [ARG_TYPE.NUMBER])
        return [Math.round(a), ii]
      }
      // array
      case 'min': {
        // MIN <a> [b] [c] [d]
        const values: any[] = []
        for (let ii = index + 1; ii < words.length; ) {
          const [value, iii] = readexpr(chip, words, ii)
          // if we're given array, we pick from it
          if (
            isArray(value) &&
            !ispt(value) &&
            !isstrdir(value) &&
            !isstrcategory(value) &&
            !isstrcollision(value) &&
            !isstrcolor(value)
          ) {
            return [pick(value), iii]
          }
          ii = iii
          values.push(value)
        }
        return [Math.min(...values), words.length]
      }
      case 'max': {
        // MAX <a> [b] [c] [d]
        const values: any[] = []
        for (let ii = index + 1; ii < words.length; ) {
          const [value, iii] = readexpr(chip, words, ii)
          // if we're given array, we pick from it
          if (
            isArray(value) &&
            !ispt(value) &&
            !isstrdir(value) &&
            !isstrcategory(value) &&
            !isstrcollision(value) &&
            !isstrcolor(value)
          ) {
            return [pick(value), iii]
          }
          ii = iii
          values.push(value)
        }
        return [Math.max(...values), words.length]
      }
      case 'clamp': {
        // CLAMP <a> <min> <max>
        const [a, min, max, ii] = readargs(chip, words, index + 1, [
          ARG_TYPE.NUMBER,
          ARG_TYPE.NUMBER,
          ARG_TYPE.NUMBER,
        ])
        return [clamp(a, min, max), ii]
      }
      case 'pick': {
        // PICK <a> [b] [c] [d]
        const values: any[] = []
        for (let ii = index + 1; ii < words.length; ) {
          const [value, iii] = readexpr(chip, words, ii)
          // if we're given array, we pick from it
          if (
            isArray(value) &&
            !ispt(value) &&
            !isstrdir(value) &&
            !isstrcategory(value) &&
            !isstrcollision(value) &&
            !isstrcolor(value)
          ) {
            return [pick(value), iii]
          }
          ii = iii
          values.push(value)
        }
        return [pick(values), words.length]
      }
      case 'range': {
        // RANGE <a> [b] [step]
        const [a, b, step, ii] = readargs(chip, words, index + 1, [
          ARG_TYPE.NUMBER,
          ARG_TYPE.MAYBE_NUMBER,
          ARG_TYPE.MAYBE_NUMBER,
        ])
        return [range(a, b, step), ii]
      }
      // advanced
      case 'func': {
        break
      }
    }
  }

  // pass through everything else
  return [maybevalue, index + 1]
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

function didexpect(msg: string, value: any) {
  throw new Error(
    `Invalid arg, expected: ${msg} but got ${JSON.stringify(value)}`,
  )
}

export function readargs<T extends ARG_TYPES>(
  chip: CHIP,
  words: WORD[],
  index: number,
  args: T,
): [...ARG_TYPE_VALUES<T>, number] {
  const values = []

  let ii = index
  for (let i = 0; i < args.length; ++i) {
    switch (args[i]) {
      case ARG_TYPE.CATEGORY: {
        const [value, iii] = readexpr(chip, words, ii)
        if (!isstrcategory(value)) {
          didexpect('terrain or object', value)
        }
        ii = iii
        values.push(CATEGORY[value[0]])
        break
      }
      case ARG_TYPE.COLLISION: {
        const [value, iii] = readexpr(chip, words, ii)
        if (!isstrcollision(value)) {
          didexpect('solid, walk, swim, bullet, walkable or swimmable', value)
        }
        ii = iii
        values.push(COLLISION[value[0]])
        break
      }
      case ARG_TYPE.COLOR: {
        const [value, iii] = readexpr(chip, words, ii)
        if (!isstrcolor(value)) {
          didexpect('color', value)
        }
        ii = iii
        values.push(COLOR[value[0]])
        break
      }
      case ARG_TYPE.KIND: {
        const [value, iii] = readexpr(chip, words, ii)
        if (
          !isArray(value) ||
          !isString(value[0]) ||
          !isMaybeString(value[1]) ||
          !isMaybeString(value[2])
        ) {
          didexpect('kind', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.DIR: {
        const [value, iii] = readdir(chip, words, ii)
        if (!ispt(value)) {
          didexpect('direction', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.NUMBER: {
        const [value, iii] = readexpr(chip, words, ii)
        if (!isNumber(value)) {
          didexpect('number', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.STRING: {
        const value = words[i]
        if (!isString(value)) {
          didexpect('string', value)
        }
        ii = i + 1
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_CATEGORY: {
        const [value, iii] = readcategory(chip, words, ii)
        if (value !== undefined && isstrcategory(value)) {
          didexpect('optional terrain or object', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_COLLISION: {
        const [value, iii] = readcategory(chip, words, ii)
        if (value !== undefined && isstrcollision(value)) {
          didexpect(
            'optional solid, walk, swim, bullet, walkable or swimmable',
            value,
          )
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_COLOR: {
        const [value, iii] = readcolor(chip, words, ii)
        if (value !== undefined && !isstrcolor(value)) {
          didexpect('optional color', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_KIND:
        const [value, iii] = readexpr(chip, words, ii)
        if (
          value !== undefined &&
          (!isArray(value) ||
            !isString(value[0]) ||
            !isMaybeString(value[1]) ||
            !isMaybeString(value[2]))
        ) {
          didexpect('optional kind', value)
        }
        ii = iii
        values.push(value)
        break
      case ARG_TYPE.MAYBE_DIR: {
        const [value, iii] = readexpr(chip, words, ii)
        if (value !== undefined && !ispt(value)) {
          didexpect('optional direction', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_NUMBER: {
        const [value, iii] = readexpr(chip, words, ii)
        if (value !== undefined && !isNumber(value)) {
          didexpect('optional number', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_STRING: {
        const value = words[i]
        if (value !== undefined && !isString(value)) {
          didexpect('optional string', value)
        }
        ii = i + 1
        values.push(value)
        break
      }
      case ARG_TYPE.ANY: {
        const [value, iii] = readexpr(chip, words, ii)
        ii = iii
        values.push(value)
        break
      }
    }
  }

  // @ts-expect-error any[] doesn't work
  return [...values, ii]
}
