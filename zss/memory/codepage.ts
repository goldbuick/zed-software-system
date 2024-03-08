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
    if (statbegin !== -1 && statend !== -1) {
      const tokens = parse.tokens.slice(statbegin, statend)

      statbegin = -1
      statend = -1
    }
    const token = parse.tokens[i]
    if (token.tokenType === Stat) {
      //
    }
    if (token.tokenType === Newline) {
      //
    }
  }

  console.info('codepagereadstats', token)
  return {}
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
