import { fromBase64, toBase64 } from '@smithy/util-base64'
import { gzipSync, gunzipSync } from 'fflate'
import * as bin from 'typed-binary'
import { ispresent } from 'zss/mapping/types'

import { BIN_BOOK, BOOK, exportbook, importbook } from './book'

const BIN_BOOKS = bin.dynamicArrayOf(BIN_BOOK)

// Type alias for ease-of-use
export type BIN_BOOKS = bin.Parsed<typeof BIN_BOOKS>

export function compressbooks(books: BOOK[]): string {
  try {
    const mappedbooks = books.map(exportbook)
    const buffer = new ArrayBuffer(BIN_BOOKS.measure(mappedbooks).size)
    const writer = new bin.BufferWriter(buffer)
    BIN_BOOKS.write(writer, mappedbooks)
    const bytes = gunzipSync(new Uint8Array(buffer))
    return toBase64(bytes)
  } catch (err) {
    console.error(err)
    return ''
  }
}

// import json into book
export function decompressbooks(base64bytes: string): BOOK[] {
  try {
    const bytes = fromBase64(base64bytes)
    const reader = new bin.BufferReader(bytes.buffer)
    const mappedbooks = BIN_BOOKS.read(reader)
    return mappedbooks.map(importbook).filter(ispresent)
  } catch (err) {
    console.error(err)
    return []
  }
}
