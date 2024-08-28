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
    const exportedbooks = books.map(exportbook).filter(ispresent)
    const binbooks = new ArrayBuffer(BIN_BOOKS.measure(exportedbooks).size)
    const writer = new bin.BufferWriter(binbooks)
    BIN_BOOKS.write(writer, exportedbooks)
    const asciibytes = gzipSync(new Uint8Array(binbooks))
    return toBase64(asciibytes)
  } catch (err) {
    console.error(err)
    return ''
  }
}

// import json into book
export function decompressbooks(base64bytes: string): BOOK[] {
  try {
    const asciibytes = fromBase64(base64bytes)
    const binbooks = gunzipSync(asciibytes)
    const reader = new bin.BufferReader(binbooks.buffer)
    return BIN_BOOKS.read(reader).map(importbook).filter(ispresent)
  } catch (err) {
    console.error(err)
    return []
  }
}
