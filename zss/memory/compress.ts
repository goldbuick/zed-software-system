import JSZip, { JSZipObject } from 'jszip'
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
  // return full str
  return base64 + missingPadding
}

function base64tobase64url(base64String: string) {
  // Replace base64 standard chars with url compatible chars
  return base64String.replace(/\+/g, '-').replace(/\//g, '_')
}

const FIXED_DATE = new Date('1980/09/02')

export async function compressbooks(books: BOOK[]) {
  return new Promise<string>((resolve, reject) => {
    const zip = new JSZip()
    for (let i = 0; i < books.length; ++i) {
      const book = books[i]
      const exportedbook = exportbook(book)
      if (exportedbook) {
        // convert to binary
        const binbook = new ArrayBuffer(BIN_BOOK.measure(exportedbook).size)
        const writer = new bin.BufferWriter(binbook)
        BIN_BOOK.write(writer, exportedbook)
        // compress book
        zip.file(book.id, binbook, { date: FIXED_DATE })
      }
    }
    zip
      .generateAsync({
        type: 'base64',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      })
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
      .then(async () => {
        const books: BOOK[] = []
        // extract a normal list
        const files: JSZipObject[] = []
        zip.forEach((_path, file) => files.push(file))
        // unpack books
        for (let i = 0; i < files.length; ++i) {
          const file = files[i]
          // uncompress book
          const binbook = await file.async('arraybuffer')
          // read binary
          const reader = new bin.BufferReader(binbook)
          // convert back to json
          const book = importbook(BIN_BOOK.read(reader))
          if (ispresent(book)) {
            books.push(book)
          }
        }
        // return result
        resolve(books)
      })
      .catch(reject)
  })
}
