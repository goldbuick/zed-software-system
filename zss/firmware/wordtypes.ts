import { CHIP, WORD } from 'zss/chip'
import { COLOR_SINDEX, COLOR_TINDEX } from 'zss/gadget/data/types'
import { range, pick } from 'zss/mapping/array'
import { clamp, randomInteger } from 'zss/mapping/number'
import {
  MAYBE,
  isarray,
  isdefined,
  ismaybestring,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { memoryreadchip } from 'zss/memory'
import {
  BOARD_DIR,
  MAYBE_BOARD,
  MAYBE_BOARD_ELEMENT,
  boardevaldir,
} from 'zss/memory/board'

export interface READ_CONTEXT {
  chip: CHIP
  board: MAYBE_BOARD
  target: MAYBE_BOARD_ELEMENT
  words: WORD[]
}

type MAYBE_WORD = MAYBE<WORD>

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
  CLEAR = COLOR_TINDEX,
  SHADOW = COLOR_SINDEX,
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
  // framing
  EDIT,
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
  return isdefined(value) && isdefined(value.x) && isdefined(value.y)
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
  return isdefined(CATEGORY[value]) && isstring(value)
}

export function isstrcategory(value: any): value is STR_CATEGORY {
  return isarray(value) && isstrcategoryconst(value[0])
}

export function readcategory(
  read: READ_CONTEXT,
  index: number,
): [STR_CATEGORY | undefined, number] {
  const value: MAYBE_WORD = read.words[index]

  // already mapped
  if (isstrcategory(value)) {
    return [value, index + 1]
  }

  // single string
  if (typeof value === 'string') {
    const maybecategory = read.chip.get(value)
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
  return isdefined(COLLISION[value]) && isstring(value)
}

export function isstrcollision(value: any): value is STR_COLLISION {
  return isarray(value) && isstrcollisionconst(value[0])
}

export function readcollision(
  read: READ_CONTEXT,
  index: number,
): [STR_COLLISION | undefined, number] {
  const value: MAYBE_WORD = read.words[index]

  // already mapped
  if (isstrcollision(value)) {
    return [value, index + 1]
  }

  // single string
  if (typeof value === 'string') {
    const maybecollision = read.chip.get(value)
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
  return isdefined(COLOR[value]) && isstring(value)
}

export function isstrcolor(value: any): value is STR_COLOR {
  return isarray(value) && isstrcolorconst(value[0])
}

export function readcolor(
  read: READ_CONTEXT,
  index: number,
): [STR_COLOR | undefined, number] {
  const value: MAYBE_WORD = read.words[index]

  // already mapped
  if (isstrcolor(value)) {
    return [value, index + 1]
  }

  // single string
  if (typeof value === 'string') {
    const maybecolor = read.chip.get(value)
    if (isstrcolor(maybecolor)) {
      return [maybecolor, index + 1]
    }
    if (isstrcolorconst(maybecolor)) {
      return [[maybecolor], index + 1]
    }
  }

  return [undefined, index]
}

export type STR_KIND = [string, STR_COLOR?]

export function isstrkind(value: any): value is STR_KIND {
  return isarray(value) && typeof value[0] === 'string'
}

export function readkind(
  read: READ_CONTEXT,
  index: number,
): [STR_KIND | undefined, number] {
  const value: MAYBE_WORD = read.words[index]

  // already mapped
  if (isstrkind(value)) {
    return [value, index + 1]
  }

  const [maybecolor, ii] = readcolor(read, index)
  const [maybename, iii] = readexpr(read, ii)

  // found a string, color is optional
  if (typeof maybename === 'string') {
    return [[maybename, maybecolor], iii]
  }

  // fail
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
  // framing
  edit: 'EDIT',
} as const

export type STR_DIR = (typeof dirconsts)[keyof typeof dirconsts][]

function isstrdirconst(value: any) {
  return isdefined(DIR[value]) && isstring(value)
}

export function isstrdir(value: any): value is STR_DIR {
  return isarray(value) && isstrdirconst(value[0])
}

export function readdir(
  read: READ_CONTEXT,
  index: number,
): [STR_DIR | undefined, number] {
  const dirvalue: STR_DIR = []
  const maybevalue: MAYBE_WORD = read.words[index]

  // already mapped
  if (isstrdir(maybevalue)) {
    return [maybevalue, index + 1]
  }

  // check for flag / stat value
  if (typeof maybevalue === 'string') {
    const maybeflagvalue = read.chip.get(maybevalue)
    // already mapped
    if (isstrdir(maybeflagvalue)) {
      return [maybeflagvalue, index + 1]
    }
  }

  // one to many strings
  for (let ii = index; ii < read.words.length; ++ii) {
    // check value
    const value = read.words[ii] as MAYBE_WORD
    if (typeof value !== 'string') {
      break
    }

    // read value
    const maybedir = read.chip.get(value)

    // check for const value
    if (isstrdirconst(maybedir)) {
      dirvalue.push(maybedir)
    } else {
      break
    }
  }

  // found dir
  if (dirvalue.length) {
    return [dirvalue, index + dirvalue.length]
  }

  // fail
  return [undefined, index]
}

// read a numerical value from words
export function readnumber(read: READ_CONTEXT, i: number): [number, number] {
  const value: WORD | undefined = read.words[i]
  return [
    (typeof value === 'string' ? read.chip.get(value) : undefined) ?? value,
    i + 1,
  ]
}

export function chipreadcontext(chip: CHIP, words: WORD[]) {
  const memory = memoryreadchip(chip.id())
  return { ...memory, chip, words }
}

// read a value from words
// consider splitting out to own file
export function readexpr(read: READ_CONTEXT, index: number): [any, number] {
  const maybevalue = read.words[index]

  // check consts
  const [maybecategory, n1] = readcategory(read, index)
  if (isdefined(maybecategory)) {
    return [maybecategory, n1]
  }

  const [maybecollision, n2] = readcollision(read, index)
  if (isdefined(maybecollision)) {
    return [maybecollision, n2]
  }

  const [maybecolor, n3] = readcolor(read, index)
  if (isdefined(maybecolor)) {
    return [maybecolor, n3]
  }

  // special case rnd
  if (isstring(maybevalue) && maybevalue.toLowerCase() === 'rnd') {
    // RND - returns 0 or 1
    // RND <number> - return 0 to number
    // RND <number> <number> - return number to number
    const [min, ii] = readexpr(read, index + 1)
    const [max, iii] = readexpr(read, ii)
    if (isnumber(min) && isnumber(max)) {
      return [randomInteger(min, max), iii]
    }
    if (isnumber(min)) {
      return [randomInteger(0, min), ii]
    }
    return [randomInteger(0, 1), index + 1]
  }

  const [maybedir, n4] = readdir(read, index)
  if (isdefined(maybedir)) {
    return [maybedir, n4]
  }

  // check complex values

  // empty is invalid
  if (!isdefined(maybevalue)) {
    return [undefined, index]
  }

  // check for number or array
  if (ispt(maybevalue) || isnumber(maybevalue) || isarray(maybevalue)) {
    return [maybevalue, index + 1]
  }

  // check for flags and expressions
  if (isstring(maybevalue)) {
    const maybeexpr = maybevalue.toLowerCase()

    // check for flag
    const maybeflag = read.chip.get(maybevalue)
    if (isdefined(maybeflag)) {
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
        const [a, ii] = readargs(read, index + 1, [ARG_TYPE.NUMBER])
        return [Math.abs(a), ii]
      }
      case 'ceil': {
        // CEIL <a>
        const [a, ii] = readargs(read, index + 1, [ARG_TYPE.NUMBER])
        return [Math.ceil(a), ii]
      }
      case 'floor': {
        // FLOOR <a>
        const [a, ii] = readargs(read, index + 1, [ARG_TYPE.NUMBER])
        return [Math.floor(a), ii]
      }
      case 'round': {
        // ROUND <a>
        const [a, ii] = readargs(read, index + 1, [ARG_TYPE.NUMBER])
        return [Math.round(a), ii]
      }
      // array
      case 'min': {
        // MIN <a> [b] [c] [d]
        const values: any[] = []
        for (let ii = index + 1; ii < read.words.length; ) {
          const [value, iii] = readexpr(read, ii)
          // if we're given array, we pick from it
          if (
            isarray(value) &&
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
        return [Math.min(...values), read.words.length]
      }
      case 'max': {
        // MAX <a> [b] [c] [d]
        const values: any[] = []
        for (let ii = index + 1; ii < read.words.length; ) {
          const [value, iii] = readexpr(read, ii)
          // if we're given array, we pick from it
          if (
            isarray(value) &&
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
        return [Math.max(...values), read.words.length]
      }
      case 'clamp': {
        // CLAMP <a> <min> <max>
        const [a, min, max, ii] = readargs(read, index + 1, [
          ARG_TYPE.NUMBER,
          ARG_TYPE.NUMBER,
          ARG_TYPE.NUMBER,
        ])
        return [clamp(a, min, max), ii]
      }
      case 'pick': {
        // PICK <a> [b] [c] [d]
        const values: any[] = []
        for (let ii = index + 1; ii < read.words.length; ) {
          const [value, iii] = readexpr(read, ii)
          // if we're given array, we pick from it
          if (
            isarray(value) &&
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
        return [pick(values), read.words.length]
      }
      case 'range': {
        // RANGE <a> [b] [step]
        const [a, b, step, ii] = readargs(read, index + 1, [
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
  [ARG_TYPE.KIND]: STR_KIND
  [ARG_TYPE.DIR]: BOARD_DIR
  [ARG_TYPE.NUMBER]: number
  [ARG_TYPE.STRING]: string
  [ARG_TYPE.MAYBE_CATEGORY]: CATEGORY | undefined
  [ARG_TYPE.MAYBE_COLLISION]: COLLISION | undefined
  [ARG_TYPE.MAYBE_COLOR]: COLOR | undefined
  [ARG_TYPE.MAYBE_KIND]: STR_KIND | undefined
  [ARG_TYPE.MAYBE_DIR]: BOARD_DIR | undefined
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
  read: READ_CONTEXT,
  index: number,
  args: T,
): [...ARG_TYPE_VALUES<T>, number] {
  const values = []

  let ii = index
  for (let i = 0; i < args.length; ++i) {
    switch (args[i]) {
      case ARG_TYPE.CATEGORY: {
        const [value, iii] = readexpr(read, ii)
        if (!isstrcategory(value)) {
          didexpect('terrain or object', value)
        }
        ii = iii
        values.push(CATEGORY[value[0]])
        break
      }
      case ARG_TYPE.COLLISION: {
        const [value, iii] = readexpr(read, ii)
        if (!isstrcollision(value)) {
          didexpect('solid, walk, swim, bullet, walkable or swimmable', value)
        }
        ii = iii
        values.push(COLLISION[value[0]])
        break
      }
      case ARG_TYPE.COLOR: {
        const [value, iii] = readexpr(read, ii)
        if (!isstrcolor(value)) {
          didexpect('color', value)
        }
        ii = iii
        values.push(COLOR[value[0]])
        break
      }
      case ARG_TYPE.KIND: {
        const [kind, iii] = readkind(read, ii)
        if (isstrkind(kind)) {
          ii = iii
          values.push(kind)
        } else {
          didexpect('kind', kind)
        }
        break
      }
      case ARG_TYPE.DIR: {
        const [dir, iii] = readdir(read, ii)
        if (isstrdir(dir)) {
          const value = read.board
            ? boardevaldir(read.board, read.target, dir)
            : { x: 0, y: 0 }
          ii = iii
          values.push(value)
        } else {
          didexpect('direction', dir)
        }
        break
      }
      case ARG_TYPE.NUMBER: {
        const [value, iii] = readexpr(read, ii)
        if (!isnumber(value)) {
          didexpect('number', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.STRING: {
        const value = read.words[i]
        if (!isstring(value)) {
          didexpect('string', value)
        }
        ii = i + 1
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_CATEGORY: {
        const [value, iii] = readcategory(read, ii)
        if (value !== undefined && isstrcategory(value)) {
          didexpect('optional terrain or object', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_COLLISION: {
        const [value, iii] = readcategory(read, ii)
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
        const [value, iii] = readcolor(read, ii)
        if (value !== undefined && !isstrcolor(value)) {
          didexpect('optional color', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_KIND:
        const [value, iii] = readexpr(read, ii)
        if (
          value !== undefined &&
          (!isarray(value) ||
            !isstring(value[0]) ||
            !ismaybestring(value[1]) ||
            !ismaybestring(value[2]))
        ) {
          didexpect('optional kind', value)
        }
        ii = iii
        values.push(value)
        break
      case ARG_TYPE.MAYBE_DIR: {
        const [dir, iii] = readdir(read, ii)
        if (isstrdir(dir)) {
          const value = read.board
            ? boardevaldir(read.board, read.target, dir)
            : { x: 0, y: 0 }
          ii = iii
          values.push(value)
        } else if (dir !== undefined) {
          didexpect('optional direction', dir)
        }
        break
      }
      case ARG_TYPE.MAYBE_NUMBER: {
        const [value, iii] = readexpr(read, ii)
        if (value !== undefined && !isnumber(value)) {
          didexpect('optional number', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_STRING: {
        const value = read.words[i]
        if (value !== undefined && !isstring(value)) {
          didexpect('optional string', value)
        }
        ii = i + 1
        values.push(value)
        break
      }
      case ARG_TYPE.ANY: {
        const [value, iii] = readexpr(read, ii)
        ii = iii
        values.push(value)
        break
      }
    }
  }

  // @ts-expect-error any[] doesn't work
  return [...values, ii]
}
