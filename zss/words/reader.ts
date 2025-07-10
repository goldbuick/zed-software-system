import { isnumber, isstring, MAYBE } from 'zss/mapping/types'
import { boardevaldir } from 'zss/memory/board'
import { BOARD, BOARD_ELEMENT, BOOK } from 'zss/memory/types'

import { isstrcolor, mapstrcolor, readcolor, STR_COLOR } from './color'
import { EVAL_DIR, isstrdir, mapstrdir, readdir, STR_DIR } from './dir'
import { readexpr } from './expr'
import { isstrkind, readkind, STR_KIND } from './kind'
import { PT, WORD } from './types'

export const READ_CONTEXT = {
  // useful state
  timestamp: 0,
  // targets & lookups
  book: undefined as MAYBE<BOOK>,
  board: undefined as MAYBE<BOARD>,
  // current element info
  element: undefined as MAYBE<BOARD_ELEMENT>,
  elementid: '',
  elementisplayer: false,
  elementfocus: '',
  // for commands to use readargs
  words: [] as WORD[],
  get: undefined as MAYBE<(name: string) => any>,
}

// param parsing engine
// a simple DSL to say string [number] [number] args

export enum ARG_TYPE {
  COLOR,
  KIND,
  DIR,
  NAME,
  NUMBER,
  STRING,
  NUMBER_OR_STRING,
  COLOR_OR_KIND,
  MAYBE_KIND,
  MAYBE_NAME,
  MAYBE_NUMBER,
  MAYBE_STRING,
  MAYBE_NUMBER_OR_STRING,
  ANY,
}

export type ARG_TYPE_MAP = {
  [ARG_TYPE.COLOR]: STR_COLOR
  [ARG_TYPE.KIND]: STR_KIND
  [ARG_TYPE.DIR]: EVAL_DIR
  [ARG_TYPE.NAME]: string
  [ARG_TYPE.NUMBER]: number
  [ARG_TYPE.STRING]: string
  [ARG_TYPE.NUMBER_OR_STRING]: number | string
  [ARG_TYPE.COLOR_OR_KIND]: STR_COLOR | STR_KIND
  [ARG_TYPE.MAYBE_KIND]: MAYBE<STR_KIND>
  [ARG_TYPE.MAYBE_NAME]: MAYBE<string>
  [ARG_TYPE.MAYBE_NUMBER]: MAYBE<number>
  [ARG_TYPE.MAYBE_STRING]: MAYBE<string>
  [ARG_TYPE.MAYBE_NUMBER_OR_STRING]: MAYBE<number | string>
  [ARG_TYPE.ANY]: any
}

type ARG_TYPES = [ARG_TYPE, ...ARG_TYPE[]]
type ARG_TYPE_VALUES<T extends ARG_TYPES> = {
  [P in keyof T]: ARG_TYPE_MAP[T[P]]
}

function didexpect(msg: string, value: any, words: WORD[]) {
  console.info(
    words,
    READ_CONTEXT.element,
    READ_CONTEXT.elementid,
    READ_CONTEXT.elementfocus,
  )
  throw new Error(
    `Invalid arg, expected: ${msg} but got ${JSON.stringify(value)}`,
  )
}

function readdestfromdir(dir: STR_DIR) {
  const startpt: PT = {
    x: READ_CONTEXT.element?.x ?? 0,
    y: READ_CONTEXT.element?.y ?? 0,
  }
  return boardevaldir(
    READ_CONTEXT.board,
    READ_CONTEXT.element,
    READ_CONTEXT.elementfocus,
    dir,
    startpt,
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
      case ARG_TYPE.KIND: {
        const [kind, iii] = readkind(ii)
        if (isstrkind(kind)) {
          ii = iii
          values.push(kind)
        } else {
          didexpect('kind', kind, words)
        }
        break
      }
      case ARG_TYPE.COLOR: {
        // no color const, assume expr
        if (mapstrcolor(words[ii]) === undefined) {
          const [value, iii] = readexpr(ii)
          if (isstrcolor(value)) {
            ii = iii
            values.push(value)
          } else {
            didexpect('color', value, words)
          }
        } else {
          const [value, iii] = readcolor(ii)
          if (isstrcolor(value)) {
            ii = iii
            values.push(value)
          } else {
            didexpect('color', value, words)
          }
        }
        break
      }
      case ARG_TYPE.DIR: {
        // no dir const, assume expr
        if (mapstrdir(words[ii]) === undefined) {
          const [value, iii] = readexpr(ii)
          if (isstrdir(value)) {
            ii = iii
            values.push(readdestfromdir(value))
          } else {
            didexpect('direction', value, words)
          }
        } else {
          const [value, iii] = readdir(ii)
          if (isstrdir(value)) {
            ii = iii
            values.push(readdestfromdir(value))
          } else {
            didexpect('direction', value, words)
          }
        }
        break
      }
      case ARG_TYPE.NAME: {
        const value = READ_CONTEXT.words[ii]
        if (!isstring(value)) {
          didexpect('string', value, words)
        }
        ++ii
        values.push(value)
        break
      }
      case ARG_TYPE.NUMBER: {
        const [value, iii] = readexpr(ii)
        if (isstring(value)) {
          const maybevalue = parseFloat(value)
          if (isnumber(maybevalue)) {
            values.push(maybevalue)
          } else {
            didexpect('number', value, words)
          }
        } else if (isnumber(value)) {
          values.push(value)
        } else {
          didexpect('number', value, words)
        }
        ii = iii
        break
      }
      case ARG_TYPE.STRING: {
        const [value, iii] = readexpr(ii)
        if (!isstring(value)) {
          didexpect('string', value, words)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.NUMBER_OR_STRING: {
        const [value, iii] = readexpr(ii)
        let maybevalue = value
        if (isstring(maybevalue)) {
          // can we convert to number ?
          const maybernumber = parseFloat(maybevalue)
          if (isnumber(maybernumber)) {
            maybevalue = maybernumber
          }
        } else if (!isnumber(maybevalue)) {
          didexpect('number or string', maybevalue, words)
        }
        ii = iii
        values.push(maybevalue)
        break
      }
      case ARG_TYPE.COLOR_OR_KIND: {
        const [kind, iii] = readkind(ii)
        if (isstrkind(kind)) {
          ii = iii
          values.push(kind)
        } else if (mapstrcolor(words[ii]) === undefined) {
          // no color const, assume expr
          const [value, iii] = readexpr(ii)
          if (isstrcolor(value)) {
            ii = iii
            values.push(value)
          } else {
            didexpect('color', value, words)
          }
        } else {
          const [value, iii] = readcolor(ii)
          if (isstrcolor(value)) {
            ii = iii
            values.push(value)
          } else {
            didexpect('color or kind', value, words)
          }
        }
        break
      }
      case ARG_TYPE.MAYBE_KIND: {
        const [kind, iii] = readkind(ii)
        if (kind !== undefined && !isstrkind(kind)) {
          didexpect('optional kind', kind, words)
        }
        ii = iii
        values.push(kind)
        break
      }
      case ARG_TYPE.MAYBE_NAME: {
        const value = READ_CONTEXT.words[ii]
        if (value !== undefined && !isstring(value)) {
          didexpect('optional string', value, words)
        }
        ++ii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_NUMBER: {
        const [value, iii] = readexpr(ii)
        if (isstring(value)) {
          const maybevalue = parseFloat(value)
          if (isnumber(maybevalue)) {
            values.push(maybevalue)
          } else {
            didexpect('optional number', value, words)
          }
        } else if (isnumber(value) || value === undefined) {
          values.push(value)
        } else {
          didexpect('optional number', value, words)
        }
        ii = iii
        break
      }
      case ARG_TYPE.MAYBE_STRING: {
        const [value, iii] = readexpr(ii)
        if (value !== undefined && !isstring(value)) {
          didexpect('optional string', value, words)
        }
        ii = iii
        values.push(value)
        break
      }
      case ARG_TYPE.MAYBE_NUMBER_OR_STRING: {
        const [value, iii] = readexpr(ii)
        let maybevalue = value
        if (isstring(maybevalue)) {
          // can we convert to number ?
          const maybernumber = parseFloat(maybevalue)
          if (isnumber(maybernumber)) {
            maybevalue = maybernumber
          }
        } else if (maybevalue !== undefined && !isnumber(maybevalue)) {
          didexpect('number or string', maybevalue, words)
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
