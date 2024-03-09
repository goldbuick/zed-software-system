import { IToken } from 'chevrotain'
import { WORD_VALUE } from 'zss/chip'
import { BITMAP } from 'zss/gadget/data/bitmap'
import { Newline, Stat, tokenize } from 'zss/lang/lexer'
import { createguid } from 'zss/mapping/guid'

import { isdefined } from '../mapping/types'

import { BOARD, BOARD_ELEMENT } from './board'

export enum CODE_PAGE_TYPE {
  ERROR,
  FUNC,
  BOARD,
  OBJECT,
  TERRAIN,
  CHARSET,
  PALETTE,
}

export type CODE_PAGE_STATS = {
  type?: CODE_PAGE_TYPE
  name?: string
  [key: string]: WORD_VALUE
}

export type CODE_PAGE = {
  id: string
  code: string
  stats?: CODE_PAGE_STATS
  error?: string
  func?: string
  board?: BOARD
  object?: BOARD_ELEMENT
  terrain?: BOARD_ELEMENT
  charset?: BITMAP
  palette?: BITMAP
}

export type CODE_PAGE_TYPE_MAP = {
  [CODE_PAGE_TYPE.ERROR]: string
  [CODE_PAGE_TYPE.FUNC]: string
  [CODE_PAGE_TYPE.BOARD]: BOARD
  [CODE_PAGE_TYPE.OBJECT]: BOARD_ELEMENT
  [CODE_PAGE_TYPE.TERRAIN]: BOARD_ELEMENT
  [CODE_PAGE_TYPE.CHARSET]: BITMAP
  [CODE_PAGE_TYPE.PALETTE]: BITMAP
}

export function createcodepage(
  code: string,
  content: Partial<Omit<CODE_PAGE, 'id' | 'code'>>,
) {
  return {
    id: createguid(),
    code,
    ...content,
  }
}

function tokenstostrings(tokens: IToken[]) {
  return tokens.map((token) => token.image)
}

function tokenstostats(codepage: CODE_PAGE, tokens: IToken[]) {
  const [stat, target, ...args] = tokens
  if (isdefined(codepage.stats) && isdefined(stat)) {
    const lstat = stat.image.toLowerCase()
    switch (lstat) {
      // code page types
      default:
        codepage.stats.name = tokenstostrings(tokens).join(' ')
        break
      case 'func':
        codepage.stats.type = CODE_PAGE_TYPE.FUNC
        codepage.stats.name = target.image
        break
      case 'board':
        codepage.stats.type = CODE_PAGE_TYPE.BOARD
        codepage.stats.name = target.image
        break
      case 'object':
        codepage.stats.type = CODE_PAGE_TYPE.OBJECT
        codepage.stats.name = target.image
        break
      case 'terrain':
        codepage.stats.type = CODE_PAGE_TYPE.TERRAIN
        codepage.stats.name = target.image
        break
      case 'charset':
        codepage.stats.type = CODE_PAGE_TYPE.CHARSET
        codepage.stats.name = target.image
        break
      case 'palette':
        codepage.stats.type = CODE_PAGE_TYPE.PALETTE
        codepage.stats.name = target.image
        break
      // user inputs
      case 'rn':
      case 'range':
      case 'sl':
      case 'select':
      case 'nm':
      case 'number':
      case 'tx':
      case 'text':
        if (isdefined(target)) {
          const ltarget = target.image.toLowerCase()
          codepage.stats[ltarget] = tokenstostrings(args ?? [])
        }
        break
    }
  }
}

export function codepagereadstats(codepage: CODE_PAGE): CODE_PAGE_STATS {
  if (isdefined(codepage.stats?.type)) {
    return codepage.stats
  }

  codepage.stats = {}
  const parse = tokenize(codepage.code)

  // extract @stat lines
  let statbegin = -1
  let statend = -1
  for (let i = 0; i < parse.tokens.length; ++i) {
    const token = parse.tokens[i]
    if (token.tokenType === Stat) {
      statbegin = i + 1
    }
    if (token.tokenType === Newline) {
      statend = i
    }
    if (statbegin !== -1 && statend !== -1) {
      tokenstostats(codepage, parse.tokens.slice(statbegin, statend))
      statbegin = -1
      statend = -1
    }
  }

  // default to object type
  if (!isdefined(codepage.stats.type)) {
    codepage.stats.type = CODE_PAGE_TYPE.OBJECT
  }

  return codepage.stats
}

export function codepagereadtype(codepage: CODE_PAGE) {
  const stats = codepagereadstats(codepage)
  return stats.type ?? CODE_PAGE_TYPE.ERROR
}

export function codepagereadname(codepage: CODE_PAGE) {
  const stats = codepagereadstats(codepage)
  return (stats.name ?? '').toLowerCase()
}

export function codepagereadstat(codepage: CODE_PAGE, stat: string) {
  const stats = codepagereadstats(codepage)
  return stats[stat]
}
