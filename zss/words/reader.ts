import { isnumber, isstring, MAYBE } from 'zss/mapping/types'
import { boardevaldir } from 'zss/memory/board'
import { BOARD, BOARD_ELEMENT, BOOK } from 'zss/memory/types'

import { isstrcategory, readcategory } from './category'
import { isstrcollision, readcollision } from './collision'
import { isstrcolor, readcolor, STR_COLOR } from './color'
import { isstrdir, readdir } from './dir'
import { readexpr } from './expr'
import { isstrkind, readkind, STR_KIND } from './kind'
import { CATEGORY, COLLISION, PT, WORD } from './types'

export const READ_CONTEXT = {
  // useful state
  timestamp: 0,
  // targets & lookups
  book: undefined as MAYBE<BOOK>,
  board: undefined as MAYBE<BOARD>,
  element: undefined as MAYBE<BOARD_ELEMENT>,
  player: '',
  isplayer: false,
  // for commands to use readargs
  words: [] as WORD[],
  get: undefined as MAYBE<(name: string) => any>,
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
  [ARG_TYPE.DIR]: PT
  [ARG_TYPE.NUMBER]: number
  [ARG_TYPE.STRING]: string
  [ARG_TYPE.NUMBER_OR_STRING]: number | string
  [ARG_TYPE.MAYBE_CATEGORY]: MAYBE<CATEGORY>
  [ARG_TYPE.MAYBE_COLLISION]: MAYBE<COLLISION>
  [ARG_TYPE.MAYBE_COLOR]: MAYBE<STR_COLOR>
  [ARG_TYPE.MAYBE_KIND]: MAYBE<STR_KIND>
  [ARG_TYPE.MAYBE_DIR]: MAYBE<PT>
  [ARG_TYPE.MAYBE_NUMBER]: MAYBE<number>
  [ARG_TYPE.MAYBE_STRING]: MAYBE<string>
  [ARG_TYPE.MAYBE_NUMBER_OR_STRING]: MAYBE<number | string>
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
  words: WORD[],
  index: number,
  args: T,
): [...ARG_TYPE_VALUES<T>, number] {
  const tmp = READ_CONTEXT.words
  READ_CONTEXT.words = words

  const values = []

  let ii = index
  for (let i = 0; i < args.length; ++i) {
    switch (args[i]) {
      case ARG_TYPE.CATEGORY: {
        const [value, iii] = readcategory(ii)
        if (!isstrcategory(value)) {
          didexpect('terrain or object', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.COLLISION: {
        const [value, iii] = readcollision(ii)
        if (!isstrcollision(value)) {
          didexpect('solid, walk, swim, bullet, walkable or swimmable', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.COLOR: {
        const [value, iii] = readcolor(ii)
        if (!isstrcolor(value)) {
          didexpect('color', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.KIND: {
        const [kind, iii] = readkind(ii)
        if (isstrkind(kind)) {
          ii = iii
          values.push(kind)
        } else {
          didexpect('kind', kind)
        }
        break
      }
      case ARG_TYPE.DIR: {
        const [dir, iii] = readdir(ii)
        if (isstrdir(dir)) {
          const value = READ_CONTEXT.board
            ? boardevaldir(
                READ_CONTEXT.board,
                READ_CONTEXT.element,
                dir,
                READ_CONTEXT.player,
              )
            : { x: 0, y: 0 }
          ii = iii
          values.push(value)
        } else {
          didexpect('direction', dir)
        }
        break
      }
      case ARG_TYPE.NUMBER: {
        const [value, iii] = readexpr(ii)
        if (isstring(value)) {
          const maybevalue = parseFloat(value)
          if (isnumber(maybevalue)) {
            values.push(maybevalue)
          } else {
            didexpect('number', value)
          }
        } else if (isnumber(value)) {
          values.push(value)
        } else {
          didexpect('number', value)
        }
        ii = iii
        break
      }
      case ARG_TYPE.STRING: {
        const value = READ_CONTEXT.words[ii]
        if (!isstring(value)) {
          didexpect('string', value)
        }
        ++ii
        values.push(value)
        break
      }
      case ARG_TYPE.NUMBER_OR_STRING: {
        const [value, iii] = readexpr(ii, false)
        let maybevalue = value
        if (isstring(maybevalue)) {
          // can we convert to number ?
          const maybernumber = parseFloat(maybevalue)
          if (isnumber(maybernumber)) {
            maybevalue = maybernumber
          }
        } else if (!isnumber(maybevalue)) {
          didexpect('number or string', maybevalue)
        }
        ii = iii
        values.push(maybevalue)
        break
      }
      case ARG_TYPE.MAYBE_CATEGORY: {
        const [value, iii] = readcategory(ii)
        if (value !== undefined && !isstrcategory(value)) {
          didexpect('optional terrain or object', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_COLLISION: {
        const [value, iii] = readcategory(ii)
        if (value !== undefined && !isstrcollision(value)) {
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
        const [value, iii] = readcolor(ii)
        if (value !== undefined && !isstrcolor(value)) {
          didexpect('optional color', value)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_KIND: {
        const [kind, iii] = readkind(ii)
        if (kind !== undefined && !isstrkind(kind)) {
          didexpect('optional kind', kind)
        }
        ii = iii
        values.push(kind)
        break
      }
      case ARG_TYPE.MAYBE_DIR: {
        const [dir, iii] = readdir(ii)
        if (isstrdir(dir)) {
          const value = READ_CONTEXT.board
            ? boardevaldir(
                READ_CONTEXT.board,
                READ_CONTEXT.element,
                dir,
                READ_CONTEXT.player,
              )
            : { x: 0, y: 0 }
          ii = iii
          values.push(value)
        } else if (dir === undefined) {
          ii = iii
          values.push(undefined)
        } else {
          didexpect('optional direction', dir)
        }
        break
      }
      case ARG_TYPE.MAYBE_NUMBER: {
        const [value, iii] = readexpr(ii)
        if (isstring(value)) {
          const maybevalue = parseFloat(value)
          if (isnumber(maybevalue)) {
            values.push(maybevalue)
          } else {
            didexpect('optional number', value)
          }
        } else if (isnumber(value) || value === undefined) {
          values.push(value)
        } else {
          didexpect('optional number', value)
        }
        ii = iii
        break
      }
      case ARG_TYPE.MAYBE_STRING: {
        const value = READ_CONTEXT.words[ii]
        if (value !== undefined && !isstring(value)) {
          didexpect('optional string', value)
        }
        ++ii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_NUMBER_OR_STRING: {
        const [value, iii] = readexpr(ii, false)
        let maybevalue = value
        if (isstring(maybevalue)) {
          // can we convert to number ?
          const maybernumber = parseFloat(maybevalue)
          if (isnumber(maybernumber)) {
            maybevalue = maybernumber
          }
        } else if (maybevalue !== undefined && !isnumber(maybevalue)) {
          didexpect('number or string', maybevalue)
        }
        ii = iii
        values.push(maybevalue)
        break
      }
      case ARG_TYPE.ANY: {
        const [value, iii] = readexpr(ii)
        ii = iii
        values.push(value)
        break
      }
    }
  }

  READ_CONTEXT.words = tmp

  // @ts-expect-error any[] doesn't work
  return [...values, ii]
}
