import { Parsed, object, dynamicArrayOf, i32, string, bool } from 'typed-binary'
import { MAYBE } from 'zss/mapping/types'

import { BOOK, MAYBE_BOOK } from './book'

export function compressbook(book: BOOK): MAYBE<Uint8Array> {
  return undefined
}

// import json into book
export function decompressbook(bytes: Uint8Array): MAYBE_BOOK {
  return undefined
}
