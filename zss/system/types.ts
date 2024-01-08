/*

what is system/types

these are types & helpers for codepages and books

*/

import { nanoid } from 'nanoid'

import { BOARD } from './board'

export function createId() {
  return nanoid()
}

export enum CONTENT_TYPE {
  ERROR,
  CODE,
  BOARD,
  CHARSET,
  PALETTE,
}

type CODE_PAGE_META = {
  id: string
  name: string
}

export type CODE_PAGE_DATA = CODE_PAGE_META &
  (
    | {
        type: CONTENT_TYPE.ERROR
        error: string
      }
    | {
        type: CONTENT_TYPE.CODE
        code: string
      }
    | {
        type: CONTENT_TYPE.BOARD
        board: BOARD
      }
    | {
        type: CONTENT_TYPE.CHARSET
        charset: Uint8Array
      }
    | {
        type: CONTENT_TYPE.PALETTE
        palette: Uint8Array
      }
  )

export type CODE_PAGE_ENTRY = {
  id: string
  name: string
} & CODE_PAGE_DATA

export type CODE_PAGE = {
  id: string
  name: string
  entries: CODE_PAGE_ENTRY[]
}

export type BOOK = {
  id: string
  name: string
  pages: CODE_PAGE[]
}
