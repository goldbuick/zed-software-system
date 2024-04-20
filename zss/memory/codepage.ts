import { IToken } from 'chevrotain'
import { WORD_VALUE } from 'zss/chip'
import { BITMAP } from 'zss/gadget/data/bitmap'
import { Newline, Stat, tokenize } from 'zss/lang/lexer'
import { createguid } from 'zss/mapping/guid'
import { MAYBE, isdefined } from 'zss/mapping/types'

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

export type MAYBE_CODE_PAGE = MAYBE<CODE_PAGE>

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
  // console.info({ stat, target, args })
  if (isdefined(codepage.stats) && isdefined(stat)) {
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
        if (isdefined(target)) {
          const ltarget = target.image.toLowerCase()
          codepage.stats[ltarget] = tokenstostrings(args ?? [])
        }
        break
      default:
        // default is range ??
        break
    }
  }
  // console.info(codepage.stats)
}

export function codepagereadstats(codepage: MAYBE_CODE_PAGE): CODE_PAGE_STATS {
  if (!isdefined(codepage)) {
    return {}
  }

  if (isdefined(codepage.stats?.type)) {
    return codepage.stats
  }

  codepage.stats = {}
  const parse = tokenize(codepage.code)

  // extract @stat lines
  for (let i = 0; i < parse.tokens.length; ++i) {
    const token = parse.tokens[i]
    if (token.tokenType === Stat) {
      const [maybetype, ...maybevalues] = token.image.slice(1).split(' ')
      const maybename = maybevalues.join(' ')

      switch (maybetype.toLowerCase()) {
        case 'stat': {
          // stat content is prefixed with hyperlink !
          const stat = tokenize(`!${maybename}`)
          // console.info('ttttt', stat)
          if (stat.tokens.length) {
            tokenstostats(codepage, stat.tokens)
          }
          break
        }
        case 'flags':
          // simple space separated local flag names
          codepage.stats.flags = maybename
          break
        case 'func':
          codepage.stats.type = CODE_PAGE_TYPE.FUNC
          codepage.stats.name = maybename
          break
        case 'board':
          codepage.stats.type = CODE_PAGE_TYPE.BOARD
          codepage.stats.name = maybename
          break
        case 'object':
          codepage.stats.type = CODE_PAGE_TYPE.OBJECT
          codepage.stats.name = maybename
          break
        case 'terrain':
          codepage.stats.type = CODE_PAGE_TYPE.TERRAIN
          codepage.stats.name = maybename
          break
        case 'charset':
          codepage.stats.type = CODE_PAGE_TYPE.CHARSET
          codepage.stats.name = maybename
          break
        case 'palette':
          codepage.stats.type = CODE_PAGE_TYPE.PALETTE
          codepage.stats.name = maybename
          break
        default:
          codepage.stats.type = CODE_PAGE_TYPE.OBJECT
          codepage.stats.name = [maybetype, ...maybevalues].join(' ')
          break
      }
    }
  }

  // default to object type
  if (!isdefined(codepage.stats.type)) {
    codepage.stats.type = CODE_PAGE_TYPE.OBJECT
  }

  return codepage.stats
}

export function codepagereadtype(codepage: MAYBE_CODE_PAGE) {
  const stats = codepagereadstats(codepage)
  return stats.type ?? CODE_PAGE_TYPE.ERROR
}

export function codepagereadname(codepage: MAYBE_CODE_PAGE) {
  const stats = codepagereadstats(codepage)
  return (stats.name ?? '').toLowerCase()
}

export function codepagereadstat(codepage: MAYBE_CODE_PAGE, stat: string) {
  const stats = codepagereadstats(codepage)
  return stats[stat]
}
