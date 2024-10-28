import JSZip from 'jszip'
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

function decode(data: string): ArrayBuffer {}

function base64decode(data: string): Uint8Array {
  return new Uint8Array(decode(atob(data)))
}

async function encode(data: Uint8Array): string {
  const zip = new JSZip()
  zip.file('bin', data, {
    binary: true,
  })
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

const FIXED_DATE = new Date('1980/09/02')

export async function compressbooks(books: BOOK[]) {
  return new Promise<string>((resolve, reject) => {
    const zip = new JSZip()
    for (let i = 0; i < books.length; ++i) {
      const book = books[i]
      const exportedbook = exportbook(book)
      if (exportedbook) {
        const binbook = new ArrayBuffer(BIN_BOOK.measure(exportedbook).size)
        const writer = new bin.BufferWriter(binbook)
        BIN_BOOK.write(writer, exportedbook)
        zip.file(book.id, binbook, { date: FIXED_DATE })
      }
    }
    zip
      .generateAsync({ type: 'base64' })
      .then((content) => {
        resolve(base64tobase64url(content))
      })
      .catch(reject)
  })
}

// import json into book
export async function decompressbooks(base64bytes: string) {
  return new Promise<BOOK[]>((resolve, reject) => {
    const zip = new JSZip()
    zip
      .loadAsync(base64urltobase64(base64bytes), { base64: true })
      .then(() => {
        const books: BOOK[] = []
        zip.forEach((path, file) => {
          file.async('arraybuffer')
          //
        })
        // for (let i = 0; i < zip.files.length; ++i) {
        //   //
        // }
        // const reader = new bin.BufferReader(binbooks.buffer)
        // const books = BIN_BOOKS.read(reader).map(importbook).filter(ispresent)
      })
      .catch(reject)
    // const asciibytes = base64urltouint8array(base64bytes)
    // gunzip(asciibytes, {}, (err, binbooks) => {
    //   if (err) {
    //     reject(err)
    //   }
    //   if (binbooks) {
    //     resolve(books)
    //   }
    // })
  })
}
