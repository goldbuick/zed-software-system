import { WORD_VALUE } from 'zss/chip'
import { BITMAP } from 'zss/gadget/data/bitmap'
import { tokenize } from 'zss/lang/lexer'
import { createguid } from 'zss/mapping/guid'

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
  const token = tokenize(codepage.code)
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
