import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'

import { READ_CONTEXT } from './reader'
import { COLOR, NAME, WORD } from './types'

export function colortofg(color: MAYBE<COLOR>): MAYBE<number> {
  return ispresent(color) && color < COLOR.ONBLACK ? color : undefined
}

export function colortobg(color: MAYBE<COLOR>): MAYBE<number> {
  return ispresent(color) && color > COLOR.WHITE && color < COLOR.ONCLEAR
    ? color - COLOR.ONBLACK
    : undefined
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
  // special bg colors
  onclear: 'ONCLEAR',
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

export function mapstrcolor(value: any): MAYBE<STR_COLOR_CONST> {
  if (isstring(value)) {
    return colorconsts[NAME(value) as STR_COLOR_KEYS]
  }
  return undefined
}

export function mapcolortostrcolor(
  color: MAYBE<COLOR>,
  bg: MAYBE<COLOR>,
): STR_COLOR_CONST[] {
  return [
    ispresent(color) ? (`${COLOR[color]}` as STR_COLOR_CONST) : undefined,
    ispresent(bg) ? (`ON${COLOR[bg]}` as STR_COLOR_CONST) : undefined,
  ].filter(ispresent)
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

function checkforcolorconst(value: MAYBE<WORD>): MAYBE<STR_COLOR> {
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

function readcolorconst(index: number): [STR_COLOR | undefined, number] {
  const value: MAYBE<WORD> = READ_CONTEXT.words[index]

  // check value
  const maybecolor = checkforcolorconst(value)
  if (isstrcolor(maybecolor)) {
    return [maybecolor, index + 1]
  }

  // fail
  return [undefined, index]
}

export function readcolor(index: number): [STR_COLOR | undefined, number] {
  const strcolor: STR_COLOR = []
  let next = index

  // numeric color value ie: 12
  const maybeintcolor = parseFloat(READ_CONTEXT.words[index] as any)
  if (isnumber(maybeintcolor)) {
    return [mapcolortostrcolor(maybeintcolor, undefined), index + 1]
  }

  // check for color
  const [maybecolor, ii] = readcolorconst(index)
  if (isstrcolor(maybecolor)) {
    strcolor.push(...maybecolor)
    next = ii
  }

  // check for bg
  const [maybebg, iii] = readcolorconst(ii)
  if (isbgstrcolor(maybebg)) {
    strcolor.push(...maybebg)
    next = iii
  }

  return strcolor.length ? [strcolor, next] : [undefined, index]
}

export function mapstrcolortoattributes(strcolor: STR_COLOR) {
  const attributes = {} as Partial<{
    color: COLOR
    bg: COLOR
  }>

  for (let i = 0; i < strcolor.length; ++i) {
    const attr = strcolor[i]
    const value = COLOR[attr]
    if (ispresent(value)) {
      if (value < COLOR.ONBLACK) {
        attributes.color = value
      } else {
        attributes.bg = colortobg(value)
      }
    }
  }

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
