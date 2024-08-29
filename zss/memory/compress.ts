import { fromBase64, toBase64 } from '@smithy/util-base64'
import { gzip, gunzip } from 'fflate'
import * as bin from 'typed-binary'
import { ispresent } from 'zss/mapping/types'

import { BIN_BOOK, BOOK, exportbook, importbook } from './book'

const BIN_BOOKS = bin.dynamicArrayOf(BIN_BOOK)

// Type alias for ease-of-use
export type BIN_BOOKS = bin.Parsed<typeof BIN_BOOKS>

export async function compressbooks(books: BOOK[]) {
  return new Promise<string>((resolve, reject) => {
    const exportedbooks = books.map(exportbook).filter(ispresent)
    const binbooks = new ArrayBuffer(BIN_BOOKS.measure(exportedbooks).size)
    const writer = new bin.BufferWriter(binbooks)
    BIN_BOOKS.write(writer, exportedbooks)
    gzip(
      new Uint8Array(binbooks),
      {
        mtime: 0,
        level: 9,
        filename: '',
      },
      (err, asciibytes) => {
        if (err) {
          reject(err)
        }
        if (asciibytes) {
          resolve(toBase64(asciibytes))
        }
      },
    )
  })
}

// import json into book
export async function decompressbooks(base64bytes: string) {
  return new Promise<BOOK[]>((resolve, reject) => {
    const asciibytes = fromBase64(base64bytes)
    gunzip(asciibytes, {}, (err, binbooks) => {
      if (err) {
        reject(err)
      }
      if (binbooks) {
        const reader = new bin.BufferReader(binbooks.buffer)
        const books = BIN_BOOKS.read(reader).map(importbook).filter(ispresent)
        resolve(books)
      }
    })
  })
}
