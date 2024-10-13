import { decode, encode } from 'base64-arraybuffer'
import { gzip, gunzip } from 'fflate'
import * as bin from 'typed-binary'
import { ispresent } from 'zss/mapping/types'

import { BIN_BOOK } from './binary'
import { exportbook, importbook } from './book'
import { BOOK } from './types'

// data encoding for urls
function base64urltobase64(base64UrlString: string) {
  // Replace non-url compatible chars with base64 standard chars
  const base64 = base64UrlString.replace(/-/g, '+').replace(/_/g, '/')

  // Pad out with standard base64 required padding characters if missing
  const missingPadding = '='.repeat((4 - (base64.length % 4)) % 4)

  return base64 + missingPadding
}

function base64tobase64url(base64String: string) {
  // Replace base64 standard chars with url compatible chars
  return base64String.replace(/\+/g, '-').replace(/\//g, '_')
}

function base64decode(data: string): Uint8Array {
  return new Uint8Array(decode(atob(data)))
}

function base64encode(data: Uint8Array): string {
  return btoa(encode(data))
}

function base64urltouint8array(base64String: string) {
  // base64 de-sanitizing
  const base64 = base64urltobase64(base64String)

  // base64 decoding
  return base64decode(base64)
}

function uint8arraytobase64url(bytes: Uint8Array) {
  const base64 = base64encode(bytes)

  // base64 sanitizing
  return base64tobase64url(base64)
}

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
          resolve(uint8arraytobase64url(asciibytes))
        }
      },
    )
  })
}

// import json into book
export async function decompressbooks(base64bytes: string) {
  return new Promise<BOOK[]>((resolve, reject) => {
    const asciibytes = base64urltouint8array(base64bytes)
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
