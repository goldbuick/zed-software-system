import { CODE_PAGE } from './codepage'

export type BOOK_CONFIG = {
  id: string
  name: string
  value: string | number
}

export type BOOK = {
  id: string
  name: string
  pages: CODE_PAGE[]
  config: BOOK_CONFIG[]
}
