import { BITMAP } from 'zss/gadget/data/bitmap'

import { BOARD, BOARD_ELEMENT } from './board'

export enum CONTENT_TYPE {
  ERROR,
  CODE,
  BOARD,
  OBJECT,
  TERRAIN,
  CHARSET,
  PALETTE,
}

export type CODE_PAGE_ERROR = {
  id: string
  name: string
  type: CONTENT_TYPE.ERROR
  value: string
}

export type CODE_PAGE_CODE = {
  id: string
  name: string
  type: CONTENT_TYPE.CODE
  value: string
}

export type CODE_PAGE_BOARD = {
  id: string
  name: string
  type: CONTENT_TYPE.BOARD
  value: BOARD
}

export type CODE_PAGE_OBJECT = {
  id: string
  name: string
  type: CONTENT_TYPE.OBJECT
  value: BOARD_ELEMENT
}

export type CODE_PAGE_TERRAIN = {
  id: string
  name: string
  type: CONTENT_TYPE.TERRAIN
  value: BOARD_ELEMENT
}

export type CODE_PAGE_CHARSET = {
  id: string
  name: string
  type: CONTENT_TYPE.CHARSET
  value: BITMAP
}

export type CODE_PAGE_PALETTE = {
  id: string
  name: string
  type: CONTENT_TYPE.PALETTE
  value: BITMAP
}

export type CODE_PAGE_ENTRY =
  | CODE_PAGE_ERROR
  | CODE_PAGE_CODE
  | CODE_PAGE_BOARD
  | CODE_PAGE_OBJECT
  | CODE_PAGE_TERRAIN
  | CODE_PAGE_CHARSET
  | CODE_PAGE_PALETTE

export type CODE_PAGE = {
  id: string
  name: string
  entries: CODE_PAGE_ENTRY[]
}

export type CONTENT_TYPE_MAP = {
  [CONTENT_TYPE.ERROR]: string
  [CONTENT_TYPE.CODE]: string
  [CONTENT_TYPE.BOARD]: BOARD
  [CONTENT_TYPE.OBJECT]: BOARD_ELEMENT
  [CONTENT_TYPE.TERRAIN]: BOARD_ELEMENT
  [CONTENT_TYPE.CHARSET]: Uint8Array
  [CONTENT_TYPE.PALETTE]: Uint8Array
}

export function readentry<T extends CONTENT_TYPE>(
  page: CODE_PAGE,
  type: T,
  entryname: string,
): CONTENT_TYPE_MAP[T] | undefined {
  const lentryname = entryname.toLowerCase()
  const entry = page.entries.find(
    (item) =>
      item.type === type &&
      (item.id === entryname || item.name.toLowerCase() === lentryname),
  )
  return entry?.value as CONTENT_TYPE_MAP[T] | undefined
}
