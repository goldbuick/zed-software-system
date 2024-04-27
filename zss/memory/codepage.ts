import { IToken } from 'chevrotain'
import { WORD_VALUE } from 'zss/chip'
import { BITMAP } from 'zss/gadget/data/bitmap'
import { Stat, tokenize } from 'zss/lang/lexer'
import { createguid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'

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
  // console.info(codepage.stats)
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
    if (token.tokenType === Stat) {
      const [maybetype, ...maybevalues] = token.image.slice(1).split(' ')
      const lmaybetype = maybetype.toLowerCase()
      const maybename = maybevalues.join(' ')
      const lmaybename = maybename.toLowerCase()

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
        case 'func':
          codepage.stats.type = CODE_PAGE_TYPE.FUNC
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
        default:
          if (first) {
            // first default is name
            codepage.stats.name = [lmaybetype, ...maybevalues].join(' ')
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

export function codepagereadname(codepage: MAYBE_CODE_PAGE) {
  const stats = codepagereadstats(codepage)
  return (stats.name ?? '').toLowerCase()
}

export function codepagereadstat(codepage: MAYBE_CODE_PAGE, stat: string) {
  const stats = codepagereadstats(codepage)
  return stats[stat]
}
