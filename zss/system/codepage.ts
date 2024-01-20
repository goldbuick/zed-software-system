import { BITMAP } from '../gadget/data/bitmap'

import { BOARD } from './board'

export enum CONTENT_TYPE {
  ERROR,
  CODE,
  BOARD,
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
  | CODE_PAGE_CHARSET
  | CODE_PAGE_PALETTE

export type CODE_PAGE = {
  id: string
  name: string
  entries: CODE_PAGE_ENTRY[]
}

type readentrymap = {
  [CONTENT_TYPE.ERROR]: string
  [CONTENT_TYPE.CODE]: string
  [CONTENT_TYPE.BOARD]: BOARD
  [CONTENT_TYPE.CHARSET]: Uint8Array
  [CONTENT_TYPE.PALETTE]: Uint8Array
}

export function readentry<T extends CONTENT_TYPE>(
  page: CODE_PAGE,
  type: T,
  name: string,
): readentrymap[T] | undefined {
  const lname = name.toLowerCase()
  const entry = page.entries.find(
    (item) => item.type === type && item.name.toLowerCase() === lname,
  )
  return entry?.value as readentrymap[T] | undefined
}
