import { CHIP, WORD } from 'zss/chip'
import { COLOR_SINDEX, COLOR_TINDEX } from 'zss/gadget/data/types'
import { range, pick } from 'zss/mapping/array'
import { clamp, randomInteger } from 'zss/mapping/number'
import {
  MAYBE,
  MAYBE_STRING,
  isarray,
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

export type READ_CONTEXT = {
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
  ONBLACK,
  ONDKBLUE,
  ONDKGREEN,
  ONDKCYAN,
  ONDKRED,
  ONDKPURPLE,
  ONDKYELLOW,
  ONLTGRAY,
  ONDKGRAY,
  ONBLUE,
  ONGREEN,
  ONCYAN,
  ONRED,
  ONPURPLE,
  ONYELLOW,
  ONWHITE,
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
  return ispresent(value) && ispresent(value.x) && ispresent(value.y)
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

function mapstrcategory(value: any): MAYBE<STR_CATEGORY_CONST> {
  if (isstring(value)) {
    return categoryconsts[value.toLowerCase() as STR_CATEGORY_KEYS]
  }
  return undefined
}

function checkforcategoryconst(value: MAYBE_WORD): MAYBE<STR_CATEGORY> {
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
  read: READ_CONTEXT,
  index: number,
): [STR_CATEGORY | undefined, number] {
  const value: MAYBE_WORD = read.words[index]

  // pre-check
  const maybecategory = checkforcategoryconst(value)
  if (isstrcategory(maybecategory)) {
    return [maybecategory, index + 1]
  }

  // read expression
  const [exprvalue, iii] = readexpr(read, index)

  // post-check
  const maybecategory2 = checkforcategoryconst(exprvalue)
  if (isstrcategory(maybecategory2)) {
    return [maybecategory2, iii]
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

export type STR_COLLISION_TYPE = typeof collisionconsts
export type STR_COLLISION_KEYS = keyof STR_COLLISION_TYPE
export type STR_COLLISION_CONST = STR_COLLISION_TYPE[STR_COLLISION_KEYS]
export type STR_COLLISION = STR_COLLISION_CONST[]

export function isstrcollision(value: any): value is STR_COLLISION {
  return isarray(value) && isstrcollisionconst(value[0])
}

function isstrcollisionconst(value: any): value is STR_COLLISION_CONST {
  return ispresent(COLLISION[value]) && isstring(value)
}

function mapstrcollision(value: any): MAYBE<STR_COLLISION_CONST> {
  if (isstring(value)) {
    return collisionconsts[value.toLowerCase() as STR_COLLISION_KEYS]
  }
  return undefined
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
  if (isstrcollisionconst(value)) {
    return [[value], index + 1]
  }

  // attempt to read value
  const [maybecollision, ii] = readexpr(read, index)

  if (isstrcollision(maybecollision)) {
    return [maybecollision, ii]
  }
  if (isstrcollisionconst(maybecollision)) {
    return [[maybecollision], ii]
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
  clear: 'CLEAR',
  shadow: 'SHADOW',
  // aliases
  brown: 'DKYELLOW',
  dkwhite: 'LTGRAY',
  ltgrey: 'LTGRAY',
  gray: 'LTGRAY',
  grey: 'LTGRAY',
  dkgrey: 'DKGRAY',
  ltblack: 'DKGRAY',
  // bg color
  onblack: 'ONBLACK',
  ondkblue: 'ONDKBLUE',
  ondkgreen: 'ONDKGREEN',
  ondkcyan: 'ONDKCYAN',
  ondkred: 'ONDKRED',
  ondkpurple: 'ONDKPURPLE',
  ondkyellow: 'ONDKYELLOW',
  onltgray: 'ONLTGRAY',
  ondkgray: 'ONDKGRAY',
  onblue: 'ONBLUE',
  ongreen: 'ONGREEN',
  oncyan: 'ONCYAN',
  onred: 'ONRED',
  onpurple: 'ONPURPLE',
  onyellow: 'ONYELLOW',
  onwhite: 'ONWHITE',
  // aliases
  onbrown: 'ONDKYELLOW',
  ondkwhite: 'ONLTGRAY',
  onltgrey: 'ONLTGRAY',
  ongray: 'ONLTGRAY',
  ongrey: 'ONLTGRAY',
  ondkgrey: 'ONDKGRAY',
  onltblack: 'ONDKGRAY',
} as const

export type STR_COLOR_TYPE = typeof colorconsts
export type STR_COLOR_KEYS = keyof STR_COLOR_TYPE
export type STR_COLOR_CONST = STR_COLOR_TYPE[STR_COLOR_KEYS]
export type STR_COLOR = STR_COLOR_CONST[]

export function isstrcolor(value: any): value is STR_COLOR {
  return isarray(value) && isstrcolorconst(value[0])
}

export function isbgstrcolor(value: any): value is STR_COLOR {
  return isstrcolor(value) && value[0].startsWith('ON')
}

function isstrcolorconst(value: any): value is STR_COLOR_CONST {
  return ispresent(COLOR[value]) && isstring(value)
}

function mapstrcolor(value: any): MAYBE<STR_COLOR_CONST> {
  if (isstring(value)) {
    return colorconsts[value.toLowerCase() as STR_COLOR_KEYS]
  }
  return undefined
}

export function readstrcolor(value: STR_COLOR): MAYBE<COLOR> {
  return value
    .map((name) => COLOR[name])
    .find((clr) => ispresent(clr) && clr < COLOR.ONBLACK)
}

export function readstrbg(value: STR_COLOR): MAYBE<COLOR> {
  return value
    .map((name) => COLOR[name])
    .find((clr) => ispresent(clr) && clr >= COLOR.ONBLACK)
}

function checkforcolorconst(value: MAYBE_WORD): MAYBE<STR_COLOR> {
  // already mapped STR_COLOR
  if (isstrcolor(value)) {
    return value
  }

  // convert STR_COLOR_CONST to STR_COLOR
  if (isstrcolorconst(value)) {
    return [value]
  }

  // convert name to const
  const maybecolor = mapstrcolor(value)
  if (ispresent(maybecolor)) {
    return [maybecolor]
  }

  return undefined
}

function readcolorconst(
  read: READ_CONTEXT,
  index: number,
): [STR_COLOR | undefined, number] {
  const value: MAYBE_WORD = read.words[index]

  // pre-check
  const maybecolor = checkforcolorconst(value)
  if (isstrcolor(maybecolor)) {
    return [maybecolor, index + 1]
  }

  // read expression
  const [exprvalue, iii] = readexpr(read, index)

  // post-check
  const maybecolor2 = checkforcolorconst(exprvalue)
  if (isstrcolor(maybecolor2)) {
    return [maybecolor2, iii]
  }

  // fail
  return [undefined, index]
}

export function readcolor(
  read: READ_CONTEXT,
  index: number,
): [STR_COLOR | undefined, number] {
  const strcolor: STR_COLOR = []

  let next = index

  const [maybecolor, ii] = readcolorconst(read, index)
  if (isstrcolor(maybecolor)) {
    strcolor.push(...maybecolor)
    next = ii
  }

  if (isstrcolor(strcolor) && !isbgstrcolor(strcolor)) {
    const [maybebg, iii] = readcolorconst(read, ii)
    if (isbgstrcolor(maybebg)) {
      strcolor.push(...maybebg)
      next = iii
    }
  }

  return strcolor.length ? [strcolor, next] : [undefined, index]
}

export function mapstrcolortoattributes(color: STR_COLOR) {
  const attributes = {} as Partial<{
    color: COLOR
    bg: COLOR
  }>

  color.every((attr) => {
    const value = COLOR[attr]
    if (ispresent(value)) {
      if (value < COLOR.ONBLACK) {
        attributes.color = value
      } else {
        attributes.bg = value
      }
    }
  })

  return attributes
}

export function iscolormatch(
  pattern: STR_COLOR,
  color: MAYBE<COLOR>,
  bg: MAYBE<COLOR>,
) {
  const attr = mapstrcolortoattributes(pattern)
  if (ispresent(color) && color !== attr.color) {
    return false
  }
  if (ispresent(bg) && bg !== attr.bg) {
    return false
  }
  return true
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
  const [maybename, iii] = readexpr(read, ii, false)

  // found a string, color is optional
  if (isstring(maybename)) {
    return [[maybename, maybecolor], iii]
  }

  // fail
  return [undefined, index]
}

export function readstrkindname(kind: MAYBE<STR_KIND>): MAYBE_STRING {
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

export type STR_DIR_TYPE = typeof dirconsts
export type STR_DIR_KEYS = keyof STR_DIR_TYPE
export type STR_DIR_CONST = STR_DIR_TYPE[STR_DIR_KEYS]
export type STR_DIR = STR_DIR_CONST[]

export function isstrdir(value: any): value is STR_DIR {
  return isarray(value) && isstrdirconst(value[0])
}

function isstrdirconst(value: any): value is STR_DIR_CONST {
  return ispresent(DIR[value]) && isstring(value)
}

function mapstrdir(value: any): MAYBE<STR_DIR_CONST> {
  if (isstring(value)) {
    return dirconsts[value.toLowerCase() as STR_DIR_KEYS]
  }
  return undefined
}

function checkfordirconst(value: MAYBE_WORD): MAYBE<STR_DIR> {
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

function readdirconst(
  read: READ_CONTEXT,
  index: number,
): [STR_DIR | undefined, number] {
  const value: MAYBE_WORD = read.words[index]

  // pre-check
  const maybedir = checkfordirconst(value)
  if (isstrdir(maybedir)) {
    return [maybedir, index + 1]
  }

  // read expression
  const [exprvalue, iii] = readexpr(read, index)

  // post-check
  const maybedir2 = checkfordirconst(exprvalue)
  if (isstrdir(maybedir2)) {
    return [maybedir2, iii]
  }

  // fail
  return [undefined, index]
}

export function readdir(
  read: READ_CONTEXT,
  index: number,
): [STR_DIR | undefined, number] {
  const strdir: STR_DIR = []

  let [maybedir, ii] = readdirconst(read, index)
  while (isstrdir(maybedir)) {
    strdir.push(...maybedir)

    const [maybenextdir, iii] = readdirconst(read, ii)
    maybedir = maybenextdir
    ii = iii
  }

  return strdir.length ? [strdir, index + strdir.length] : [undefined, index]
}

export function chipreadcontext(chip: CHIP, words: WORD[]) {
  const memory = memoryreadchip(chip.id())
  return { ...memory, chip, words }
}

// read a value from words
// consider splitting out to own file
export function readexpr(
  read: READ_CONTEXT,
  index: number,
  stringeval = true,
): [any, number] {
  const maybevalue = read.words[index]

  // check consts
  if (mapstrcategory(maybevalue)) {
    const [maybecategory, n1] = readcategory(read, index)
    if (ispresent(maybecategory)) {
      return [maybecategory, n1]
    }
  }

  if (mapstrcollision(maybevalue)) {
    const [maybecollision, n2] = readcollision(read, index)
    if (ispresent(maybecollision)) {
      return [maybecollision, n2]
    }
  }

  if (mapstrcolor(maybevalue)) {
    const [maybecolor, n3] = readcolor(read, index)
    if (ispresent(maybecolor)) {
      return [maybecolor, n3]
    }
  }

  // special case rnd expression
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

  if (mapstrdir(maybevalue)) {
    const [maybedir, n4] = readdir(read, index)
    if (ispresent(maybedir)) {
      return [maybedir, n4]
    }
  }

  // check complex values

  // empty is invalid
  if (!ispresent(maybevalue)) {
    return [undefined, index]
  }

  // check for pt, number, or array
  if (ispt(maybevalue) || isnumber(maybevalue) || isarray(maybevalue)) {
    return [maybevalue, index + 1]
  }

  // check for flags and expressions
  if (isstring(maybevalue)) {
    const maybeexpr = maybevalue.toLowerCase()

    // check for flag
    if (stringeval) {
      const maybeflag = read.chip.get(maybevalue)
      if (ispresent(maybeflag)) {
        return [maybeflag, index + 1]
      }
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
        // console.info('pick', read.words.slice(index + 1))
        // PICK <a> [b] [c] [d]
        const values: any[] = []
        for (let ii = index + 1; ii < read.words.length; ) {
          const [value, iii] = readexpr(read, ii)
          // console.info({ value, iii })
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
        // console.info({ from: values })
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
  NUMBER_OR_STRING,
  MAYBE_CATEGORY,
  MAYBE_COLLISION,
  MAYBE_COLOR,
  MAYBE_KIND,
  MAYBE_DIR,
  MAYBE_NUMBER,
  MAYBE_STRING,
  MAYBE_NUMBER_OR_STRING,
  ANY,
}

export type ARG_TYPE_MAP = {
  [ARG_TYPE.CATEGORY]: CATEGORY
  [ARG_TYPE.COLLISION]: COLLISION
  [ARG_TYPE.COLOR]: STR_COLOR
  [ARG_TYPE.KIND]: STR_KIND
  [ARG_TYPE.DIR]: BOARD_DIR
  [ARG_TYPE.NUMBER]: number
  [ARG_TYPE.STRING]: string
  [ARG_TYPE.NUMBER_OR_STRING]: number | string
  [ARG_TYPE.MAYBE_CATEGORY]: CATEGORY | undefined
  [ARG_TYPE.MAYBE_COLLISION]: COLLISION | undefined
  [ARG_TYPE.MAYBE_COLOR]: STR_COLOR | undefined
  [ARG_TYPE.MAYBE_KIND]: STR_KIND | undefined
  [ARG_TYPE.MAYBE_DIR]: BOARD_DIR | undefined
  [ARG_TYPE.MAYBE_NUMBER]: number | undefined
  [ARG_TYPE.MAYBE_STRING]: string | undefined
  [ARG_TYPE.MAYBE_NUMBER_OR_STRING]: number | string
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
        const [value, iii] = readcategory(read, ii)
        if (!isstrcategory(value)) {
          didexpect('terrain or object', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.COLLISION: {
        const [value, iii] = readcollision(read, ii)
        if (!isstrcollision(value)) {
          didexpect('solid, walk, swim, bullet, walkable or swimmable', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.COLOR: {
        const [value, iii] = readcolor(read, ii)
        if (!isstrcolor(value)) {
          didexpect('color', value)
        }
        ii = iii
        values.push(value)
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
        const value = read.words[ii]
        if (!isstring(value)) {
          didexpect('string', value)
        }
        ++ii
        values.push(value)
        break
      }
      case ARG_TYPE.NUMBER_OR_STRING: {
        const [value, iii] = readexpr(read, ii, false)
        if (!isnumber(value) && !isstring(value)) {
          didexpect('number or string', value)
        }
        ii = iii
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
      case ARG_TYPE.MAYBE_KIND: {
        const [kind, iii] = readkind(read, ii)
        if (isstrkind(kind)) {
          ii = iii
          values.push(kind)
        } else if (kind !== undefined) {
          didexpect('optional kind', kind)
        }
        break
      }
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
        const value = read.words[ii]
        if (value !== undefined && !isstring(value)) {
          didexpect('optional string', value)
        }
        ++ii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_NUMBER_OR_STRING: {
        const [value, iii] = readexpr(read, ii, false)
        if (value !== undefined && !isnumber(value) && !isstring(value)) {
          didexpect('optional number or string', value)
        }
        ii = iii
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
