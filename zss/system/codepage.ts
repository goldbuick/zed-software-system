/*

what is a codepage ??
named with key value pairs

*/

export enum CODE_PAGE_TYPE {
  ZSS,
}

type CODE_PAGE_CONTENT = {
  type: CODE_PAGE_TYPE.ZSS
  code: string
}

export type CODE_PAGE = CODE_PAGE_CONTENT & {
  name: string
}
