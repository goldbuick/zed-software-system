import { BOARD } from './board'

export enum CODE_PAGE_TYPE {
  CODE,
  BOARD,
}

type CODE_PAGE_DATA =
  | {
      type: CODE_PAGE_TYPE.CODE
      code: string
    }
  | {
      type: CODE_PAGE_TYPE.BOARD
      board: BOARD
    }

export type CODE_PAGE_ENTRY = {
  id: string
  name: string
} & CODE_PAGE_DATA

export type CODE_PAGE = {
  id: string
  name: string
  entries: CODE_PAGE_ENTRY[]
}
