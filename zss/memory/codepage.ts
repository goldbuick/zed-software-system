import { IToken } from 'chevrotain'
import { WORD } from 'zss/firmware/wordtypes'
import { BITMAP } from 'zss/gadget/data/bitmap'
import { stat, tokenize } from 'zss/lang/lexer'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { BOARD, createboard, exportboard, importboard } from './board'
import {
  BOARD_ELEMENT,
  createboardelement,
  exportboardelement,
  importboardelement,
} from './boardelement'
import { EIGHT_TRACK } from './eighttrack'

export enum CODE_PAGE_TYPE {
  ERROR,
  CLI,
  LOADER,
  // all of these types support os.once() invoke as well
  BOARD,
  OBJECT,
  TERRAIN,
  CHARSET,
  PALETTE,
  EIGHT_TRACK,
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
  tags: Set<string>
  // non-code data
  error?: string
  func?: string
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
  [CODE_PAGE_TYPE.CLI]: string
  [CODE_PAGE_TYPE.LOADER]: string
  // core content types
  [CODE_PAGE_TYPE.BOARD]: BOARD
  [CODE_PAGE_TYPE.OBJECT]: BOARD_ELEMENT
  [CODE_PAGE_TYPE.TERRAIN]: BOARD_ELEMENT
  [CODE_PAGE_TYPE.CHARSET]: BITMAP
  [CODE_PAGE_TYPE.PALETTE]: BITMAP
  [CODE_PAGE_TYPE.EIGHT_TRACK]: EIGHT_TRACK
}

export function createcodepage(
  code: string,
  content: Partial<Omit<CODE_PAGE, 'id' | 'code' | 'tags'>>,
) {
  return {
    id: createsid(),
    tags: new Set<string>(),
    code,
    ...content,
  }
}

// safe to serialize copy of codepage
export function exportcodepage(codepage: MAYBE_CODE_PAGE): MAYBE_CODE_PAGE {
  if (!ispresent(codepage)) {
    return
  }
  return {
    id: codepage.id,
    code: codepage.code,
    tags: [...codepage.tags] as any,
    // non-code data
    func: codepage.func,
    board: exportboard(codepage.board),
    object: exportboardelement(codepage.object),
    terrain: exportboardelement(codepage.terrain),
    // charset: exportcharset(codepage.charset),
    // palette: exportpalette(codepage.palette), TODO: scrub these values too
    // eighttrack: exporteighttrack(codepage.eighttrack), TODO: scrub these values too
  }
}

// safe to serialize copy of codepage
export function importcodepage(codepage: MAYBE_CODE_PAGE): MAYBE_CODE_PAGE {
  if (!ispresent(codepage)) {
    return
  }
  return {
    id: codepage.id,
    code: codepage.code,
    tags: new Set([...codepage.tags]),
    // non-code data
    func: codepage.func,
    board: importboard(codepage.board),
    object: importboardelement(codepage.object),
    terrain: importboardelement(codepage.terrain),
    // charset: importcharset(codepage.charset),
    // palette: importpalette(codepage.palette),
    // eighttrack: importeighttrack(codepage.eighttrack),
  }
}

export function codepagereadtags(codepage: MAYBE_CODE_PAGE) {
  return [...(codepage?.tags ?? [])]
}

export function codepageaddtags(codepage: MAYBE_CODE_PAGE, tags: string[]) {
  if (!ispresent(codepage)) {
    return
  }
  tags.forEach((item) => codepage.tags.add(item))
}

export function codepageremovetags(codepage: MAYBE_CODE_PAGE, tags: string[]) {
  if (!ispresent(codepage)) {
    return
  }
  tags.forEach((item) => codepage.tags.delete(item))
}

export function codepagehastags(
  codepage: MAYBE_CODE_PAGE,
  tags: string[],
): boolean {
  if (!ispresent(codepage)) {
    return false
  }
  return tags.every((tag) => codepage.tags.has(tag))
}

export function codepagehasmatch(
  codepage: MAYBE_CODE_PAGE,
  type: CODE_PAGE_TYPE,
  ids: string[],
  tags: string[],
): boolean {
  if (!ispresent(codepage) || codepagereadtype(codepage) !== type) {
    return false
  }
  if (ids.some((id) => id === codepage.id)) {
    return true
  }
  if (tags.includes(codepagereadname(codepage))) {
    return true
  }
  return codepagehastags(codepage, tags)
}

function tokenstostrings(tokens: IToken[]) {
  return tokens.map((token) => token.image)
}

function tokenstostats(codepage: CODE_PAGE, tokens: IToken[]) {
  const [stat, target, ...args] = tokens
  if (ispresent(codepage.stats) && ispresent(stat)) {
    switch (stat.image.toLowerCase()) {
      case 'rn':
      case 'range':
      case 'sl':
      case 'select':
      case 'nm':
      case 'number':
      case 'tx':
      case 'text':
      case 'ln': // link to another board
      case 'link':
        if (ispresent(target)) {
          const ltarget = target.image.toLowerCase()
          codepage.stats[ltarget] = tokenstostrings(args ?? [])
        }
        break
      default:
        // default is range ??
        break
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
        case 'flags':
          // simple space separated local flag names
          codepage.stats.flags = lmaybename
          break
        case 'cli':
          codepage.stats.type = CODE_PAGE_TYPE.CLI
          codepage.stats.name = lmaybename
          break
        case 'board':
          codepage.stats.type = CODE_PAGE_TYPE.BOARD
          codepage.stats.name = lmaybename
          break
        case 'object':
          codepage.stats.type = CODE_PAGE_TYPE.OBJECT
          codepage.stats.name = lmaybename
          break
        case 'terrain':
          codepage.stats.type = CODE_PAGE_TYPE.TERRAIN
          codepage.stats.name = lmaybename
          break
        case 'charset':
          codepage.stats.type = CODE_PAGE_TYPE.CHARSET
          codepage.stats.name = lmaybename
          break
        case 'palette':
          codepage.stats.type = CODE_PAGE_TYPE.PALETTE
          codepage.stats.name = lmaybename
          break
        case '8track':
          codepage.stats.type = CODE_PAGE_TYPE.EIGHT_TRACK
          codepage.stats.name = lmaybename
          break
        case 'loader':
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

export function codepagereadtype(codepage: MAYBE_CODE_PAGE) {
  const stats = codepagereadstats(codepage)
  return stats.type ?? CODE_PAGE_TYPE.ERROR
}

export function codepagereadtypetostring(codepage: MAYBE_CODE_PAGE) {
  switch (codepagereadtype(codepage)) {
    default:
    case CODE_PAGE_TYPE.ERROR:
      return 'error'
    case CODE_PAGE_TYPE.CLI:
      return 'cli'
    case CODE_PAGE_TYPE.BOARD:
      return 'board'
    case CODE_PAGE_TYPE.OBJECT:
      return 'object'
    case CODE_PAGE_TYPE.TERRAIN:
      return 'terrain'
    case CODE_PAGE_TYPE.CHARSET:
      return 'charset'
    case CODE_PAGE_TYPE.PALETTE:
      return 'palette'
    case CODE_PAGE_TYPE.EIGHT_TRACK:
      return '8track'
  }
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
      return (codepage?.error ?? '') as MAYBE<CODE_PAGE_TYPE_MAP[T]>
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
    case CODE_PAGE_TYPE.LOADER: {
      // validate and shape loader into usable state
      if (!ispresent(codepage.func)) {
        codepage.func = ''
      }
      return codepage.func as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
  }
}
