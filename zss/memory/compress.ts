import * as bin from 'typed-binary'
import { MAYBE } from 'zss/mapping/types'

import { BOOK, MAYBE_BOOK } from './book'

const binword = bin.generic(
  {
    //
  },
  {
    //
  },
)

const binbook = bin.object({
  id: bin.string,
  name: bin.string,
  tags: bin.dynamicArrayOf(bin.string),
  flags: bin.dynamicArrayOf(
    bin.object({
      player: bin.string,
      values: bin.dynamicArrayOf(
        bin.object({
          name: bin.string,
          number: bin.optional(bin.f32),
          string: bin.optional(bin.string),
          array: bin.optional(bin.dynamicArrayOf()),
        }),
      ),
    }),
  ),
})

type BIN_BOOK = bin.Parsed<typeof binbook>

export async function compressbook(book: BOOK): Promise<MAYBE<Uint8Array>> {
  return undefined
}

// import json into book
export async function decompressbook(bytes: Uint8Array): Promise<MAYBE_BOOK> {
  return undefined
}
