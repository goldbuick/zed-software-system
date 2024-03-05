import { BITMAP } from 'zss/gadget/data/bitmap'

import { BOARD, BOARD_ELEMENT } from './board'

export enum PAGE_TYPE {
  ERROR,
  FUNC,
  BOARD,
  OBJECT,
  TERRAIN,
  CHARSET,
  PALETTE,
}

export type CODE_PAGE_ERROR = {
  id: string
  type: PAGE_TYPE.ERROR
  code: string
  value: string
}

export type CODE_PAGE_FUNC = {
  id: string
  type: PAGE_TYPE.FUNC
  code: string
}

export type CODE_PAGE_BOARD = {
  id: string
  type: PAGE_TYPE.BOARD
  code: string
  value: BOARD
}

export type CODE_PAGE_OBJECT = {
  id: string
  type: PAGE_TYPE.OBJECT
  code: string
  value: BOARD_ELEMENT
}

export type CODE_PAGE_TERRAIN = {
  id: string
  type: PAGE_TYPE.TERRAIN
  code: string
  value: BOARD_ELEMENT
}

export type CODE_PAGE_CHARSET = {
  id: string
  type: PAGE_TYPE.CHARSET
  code: string
  value: BITMAP
}

export type CODE_PAGE_PALETTE = {
  id: string
  type: PAGE_TYPE.PALETTE
  code: string
  value: BITMAP
}

// export type CODE_PAGE =
//   | CODE_PAGE_ERROR
//   | CODE_PAGE_FUNC
//   | CODE_PAGE_BOARD
//   | CODE_PAGE_OBJECT
//   | CODE_PAGE_TERRAIN
//   | CODE_PAGE_CHARSET
//   | CODE_PAGE_PALETTE

// export type CODE_PAGE_TYPE_MAP = {
//   [PAGE_TYPE.ERROR]: string
//   [PAGE_TYPE.FUNC]: string
//   [PAGE_TYPE.BOARD]: BOARD
//   [PAGE_TYPE.OBJECT]: BOARD_ELEMENT
//   [PAGE_TYPE.TERRAIN]: BOARD_ELEMENT
//   [PAGE_TYPE.CHARSET]: BITMAP
//   [PAGE_TYPE.PALETTE]: BITMAP
// }

/*

we need to be able to parse out @attributes and know what the name is

*/

export type CODE_PAGE = {
  name?: string

  ERROR
  FUNC
  BOARD
  OBJECT
  TERRAIN
  CHARSET
  PALETTE
}
