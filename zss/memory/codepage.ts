import { IToken } from 'chevrotain'
import * as bin from 'typed-binary'
import {
  BIN_BITMAP,
  BITMAP,
  exportbitmap,
  importbitmap,
} from 'zss/gadget/data/bitmap'
import { stat, tokenize } from 'zss/lang/lexer'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'

import {
  BIN_BOARD,
  BOARD,
  createboard,
  exportboard,
  importboard,
} from './board'
import {
  BIN_BOARD_ELEMENT,
  BOARD_ELEMENT,
  createboardelement,
  exportboardelement,
  importboardelement,
} from './boardelement'
import {
  BIN_EIGHT_TRACK,
  EIGHT_TRACK,
  exporteighttrack,
  importeighttrack,
} from './eighttrack'
import { WORD } from './word'

export enum CODE_PAGE_TYPE {
  ERROR,
  LOADER,
  BOARD,
  OBJECT,
  TERRAIN,
  CHARSET,
  PALETTE,
  EIGHT_TRACK,
}

export enum CODE_PAGE_LABEL {
  LOADER = 'loader',
  BOARD = 'board',
  OBJECT = 'object',
  TERRAIN = 'terrain',
  CHARSET = 'charset',
  PALETTE = 'palette',
  EIGHT_TRACK = '8track',
}

export type CODE_PAGE_STATS = {
  type?: CODE_PAGE_TYPE
  name?: string
  [key: string]: WORD
}

export type CODE_PAGE = {
  // all pages have id & code
  id: string
  code: string
  // content data
  board?: BOARD
  object?: BOARD_ELEMENT
  terrain?: BOARD_ELEMENT
  charset?: BITMAP
  palette?: BITMAP
  eighttrack?: EIGHT_TRACK
  // common parsed values
  stats?: CODE_PAGE_STATS
}

export type MAYBE_CODE_PAGE = MAYBE<CODE_PAGE>

export type CODE_PAGE_TYPE_MAP = {
  [CODE_PAGE_TYPE.ERROR]: string
  [CODE_PAGE_TYPE.LOADER]: string
  [CODE_PAGE_TYPE.BOARD]: BOARD
  [CODE_PAGE_TYPE.OBJECT]: BOARD_ELEMENT
  [CODE_PAGE_TYPE.TERRAIN]: BOARD_ELEMENT
  [CODE_PAGE_TYPE.CHARSET]: BITMAP
  [CODE_PAGE_TYPE.PALETTE]: BITMAP
  [CODE_PAGE_TYPE.EIGHT_TRACK]: EIGHT_TRACK
}

export function createcodepage(
  code: string,
  content: Partial<Omit<CODE_PAGE, 'id' | 'code'>>,
) {
  return {
    id: createsid(),
    code,
    ...content,
  }
}

export const BIN_CODEPAGE = bin.object({
  // all pages have id, and code
  id: bin.string,
  code: bin.string,
  // content data
  board: bin.optional(BIN_BOARD),
  object: bin.optional(BIN_BOARD_ELEMENT),
  terrain: bin.optional(BIN_BOARD_ELEMENT),
  charset: bin.optional(BIN_BITMAP),
  palette: bin.optional(BIN_BITMAP),
  eighttrack: bin.optional(BIN_EIGHT_TRACK),
})
type BIN_CODEPAGE = bin.Parsed<typeof BIN_CODEPAGE>

// safe to serialize copy of codepage
export function exportcodepage(codepage: MAYBE_CODE_PAGE): MAYBE<BIN_CODEPAGE> {
  if (!ispresent(codepage)) {
    return
  }
  return {
    id: codepage.id,
    code: codepage.code,
    // content data
    board: exportboard(codepage.board),
    object: exportboardelement(codepage.object),
    terrain: exportboardelement(codepage.terrain),
    charset: exportbitmap(codepage.charset),
    palette: exportbitmap(codepage.palette),
    eighttrack: exporteighttrack(codepage.eighttrack),
  }
}

// safe to serialize copy of codepage
export function importcodepage(codepage: MAYBE<BIN_CODEPAGE>): MAYBE_CODE_PAGE {
  if (!ispresent(codepage)) {
    return
  }

  return {
    id: codepage.id,
    code: codepage.code,
    // content data
    board: importboard(codepage.board),
    object: importboardelement(codepage.object),
    terrain: importboardelement(codepage.terrain),
    charset: importbitmap(codepage.charset),
    palette: importbitmap(codepage.palette),
    eighttrack: importeighttrack(codepage.eighttrack),
  }
}

export function codepagehasmatch(
  codepage: MAYBE_CODE_PAGE,
  type: CODE_PAGE_TYPE,
  ids: string[],
): boolean {
  if (!ispresent(codepage) || codepagereadtype(codepage) !== type) {
    return false
  }
  if (ids.some((id) => id === codepage.id)) {
    return true
  }
  return false
}

function tokenstostrings(tokens: IToken[]) {
  return tokens.map((token) => token.image)
}

function tokenstostats(codepage: CODE_PAGE, tokens: IToken[]) {
  const [stat, target, ...args] = tokens
  if (ispresent(codepage.stats) && ispresent(stat)) {
    switch (stat.image.toLowerCase()) {
      case 'rn': // 1 - 9 with optional min / max labels
      case 'range':
      case 'sl': // select from a list of values
      case 'select':
      case 'nm': // number input with optional min / max
      case 'number':
      case 'tx': // text input
      case 'text':
      case 'ln': // link to another board
      case 'link':
        if (ispresent(target)) {
          const ltarget = target.image.toLowerCase()
          codepage.stats[ltarget] = tokenstostrings(args ?? [])
        }
        break
      default: {
        // default is list of stat names
        const names = tokens.slice(1).map((token) => token.image)
        for (let i = 0; i < names.length; ++i) {
          codepage.stats[names[i]] = ''
        }
        break
      }
    }
  }
}

export function codepagereadstatdefaults(
  codepage: MAYBE_CODE_PAGE,
): CODE_PAGE_STATS {
  const stats = { ...codepagereadstats(codepage) }

  // extract defaults
  Object.keys(stats).forEach((key) => {
    switch (key) {
      case 'type':
      case 'name':
        // trim
        delete stats[key]
        break
    }
  })

  // send it
  return stats
}

export function codepageresetstats(codepage: MAYBE_CODE_PAGE): CODE_PAGE_STATS {
  if (!ispresent(codepage)) {
    return {}
  }
  codepage.stats = undefined
  return codepagereadstats(codepage)
}

export function codepagereadstats(codepage: MAYBE_CODE_PAGE): CODE_PAGE_STATS {
  if (!ispresent(codepage)) {
    return {}
  }

  // cached results !
  if (ispresent(codepage.stats?.type)) {
    return codepage.stats
  }

  codepage.stats = {}
  const parse = tokenize(codepage.code)

  // extract @stat lines
  let first = true
  for (let i = 0; i < parse.tokens.length; ++i) {
    const token = parse.tokens[i]
    if (token.tokenType === stat) {
      const [maybetype, ...maybevalues] = token.image.slice(1).split(' ')
      const lmaybetype = maybetype.toLowerCase()
      const maybename = maybevalues.join(' ')
      const lmaybename = maybename.toLowerCase().trim()

      switch (lmaybetype) {
        case 'stat': {
          // stat content is prefixed with hyperlink !
          const stat = tokenize(`!${maybename}`)
          if (stat.tokens.length) {
            tokenstostats(codepage, stat.tokens)
          }
          break
        }
        case CODE_PAGE_LABEL.BOARD as string:
          codepage.stats.type = CODE_PAGE_TYPE.BOARD
          codepage.stats.name = lmaybename
          break
        case CODE_PAGE_LABEL.OBJECT as string:
          codepage.stats.type = CODE_PAGE_TYPE.OBJECT
          codepage.stats.name = lmaybename
          break
        case CODE_PAGE_LABEL.TERRAIN as string:
          codepage.stats.type = CODE_PAGE_TYPE.TERRAIN
          codepage.stats.name = lmaybename
          break
        case CODE_PAGE_LABEL.CHARSET as string:
          codepage.stats.type = CODE_PAGE_TYPE.CHARSET
          codepage.stats.name = lmaybename
          break
        case CODE_PAGE_LABEL.PALETTE as string:
          codepage.stats.type = CODE_PAGE_TYPE.PALETTE
          codepage.stats.name = lmaybename
          break
        case CODE_PAGE_LABEL.EIGHT_TRACK as string:
          codepage.stats.type = CODE_PAGE_TYPE.EIGHT_TRACK
          codepage.stats.name = lmaybename
          break
        case CODE_PAGE_LABEL.LOADER as string:
          codepage.stats.type = CODE_PAGE_TYPE.LOADER
          codepage.stats.name = lmaybename
          break
        default:
          if (first) {
            // first default is name
            codepage.stats.name = [lmaybetype, ...maybevalues].join(' ').trim()
          } else {
            // second default is boolean stats
            codepage.stats[lmaybetype] = 1
          }
          break
      }

      first = false
    }
  }

  // default to object type
  if (!ispresent(codepage.stats.type)) {
    codepage.stats.type = CODE_PAGE_TYPE.OBJECT
  }

  // results !
  return codepage.stats
}

export function codepagetypetostring(type: MAYBE<CODE_PAGE_TYPE>): string {
  switch (type) {
    default:
    case CODE_PAGE_TYPE.ERROR:
      return 'error'
    case CODE_PAGE_TYPE.LOADER:
      return CODE_PAGE_LABEL.LOADER
    case CODE_PAGE_TYPE.BOARD:
      return CODE_PAGE_LABEL.BOARD
    case CODE_PAGE_TYPE.OBJECT:
      return CODE_PAGE_LABEL.OBJECT
    case CODE_PAGE_TYPE.TERRAIN:
      return CODE_PAGE_LABEL.TERRAIN
    case CODE_PAGE_TYPE.CHARSET:
      return CODE_PAGE_LABEL.CHARSET
    case CODE_PAGE_TYPE.PALETTE:
      return CODE_PAGE_LABEL.PALETTE
    case CODE_PAGE_TYPE.EIGHT_TRACK:
      return CODE_PAGE_LABEL.EIGHT_TRACK
  }
}

export function codepagereadtype(codepage: MAYBE_CODE_PAGE) {
  const stats = codepagereadstats(codepage)
  return stats.type ?? CODE_PAGE_TYPE.ERROR
}

export function codepagereadtypetostring(codepage: MAYBE_CODE_PAGE) {
  return codepagetypetostring(codepagereadtype(codepage))
}

export function codepagereadname(codepage: MAYBE_CODE_PAGE) {
  const stats = codepagereadstats(codepage)
  return (stats.name ?? '').toLowerCase()
}

export function codepagereadstat(codepage: MAYBE_CODE_PAGE, stat: string) {
  const stats = codepagereadstats(codepage)
  return stats[stat]
}

export function codepagereaddata<T extends CODE_PAGE_TYPE>(
  codepage: MAYBE_CODE_PAGE,
): MAYBE<CODE_PAGE_TYPE_MAP[T]> {
  switch (codepage?.stats?.type) {
    default: {
      // empty / invalid
      return undefined
    }
    case CODE_PAGE_TYPE.ERROR: {
      return (codepage?.code ?? '') as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.LOADER: {
      return (codepage?.code ?? '') as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.BOARD: {
      // validate and shape board into usable state
      if (!ispresent(codepage.board)) {
        codepage.board = createboard()
      }
      codepage.board.id = codepage.id
      return codepage.board as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.OBJECT: {
      // validate and shape object into usable state
      if (!ispresent(codepage.object)) {
        codepage.object = createboardelement()
      }
      codepage.object.name = codepagereadname(codepage)
      return codepage.object as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.TERRAIN: {
      // validate and shape terrain into usable state
      if (!ispresent(codepage.terrain)) {
        codepage.terrain = createboardelement()
      }
      codepage.terrain.name = codepagereadname(codepage)
      return codepage.terrain as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.CHARSET: {
      // validate and shape charset into usable state
      if (!ispresent(codepage.charset)) {
        // codepage.charset = {}
      }
      return codepage.charset as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.PALETTE: {
      // validate and shape palette into usable state
      if (!ispresent(codepage.palette)) {
        // codepage.palette = {}
      }
      return codepage.palette as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.EIGHT_TRACK: {
      // validate and shape eighttrack into usable state
      if (!ispresent(codepage.eighttrack)) {
        // codepage.eighttrack = {}
      }
      return codepage.eighttrack as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
  }
}
