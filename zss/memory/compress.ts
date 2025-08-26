import { compress, decompress, init } from '@bokuweb/zstd-wasm'
import JSZip, { JSZipObject } from 'jszip'
import { ispresent } from 'zss/mapping/types'

import { exportbook, importbook } from './book'
import { packformat, unpackformat } from './format'
import { BOOK } from './types'

let zstdenabled = false
async function getzstdlib(): Promise<void> {
  if (!zstdenabled) {
    await init()
    zstdenabled = true
  }
}

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
  await getzstdlib()

  console.info('saved', books)
  const zip = new JSZip()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    const exportedbook = exportbook(book)
    if (exportedbook) {
      // convert to bin
      const bin = packformat(exportedbook)
      if (ispresent(bin)) {
        // https://github.com/bokuweb/zstd-wasm?tab=readme-ov-file#using-dictionary
        const binsquash = compress(bin, 15)
        zip.file(book.id, binsquash, { date: FIXED_DATE })
      }
    }
  }

  // TODO: do we need this still ??
  const content = await zip.generateAsync({
    type: 'base64',
    compression: 'STORE',
  })

  return base64tobase64url(content)
}

// import json into book
export async function decompressbooks(base64bytes: string) {
  await getzstdlib()

  const content = base64urltobase64(base64bytes)
  const zip = await JSZip.loadAsync(content, { base64: true })

  const books: BOOK[] = []

  // extract a normal list
  const files: JSZipObject[] = []
  zip.forEach((_path, file) => files.push(file))

  // unpack books
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]

    // first check is for binary
    const maybebinsquash = await file.async('uint8array')
    if (ispresent(maybebinsquash)) {
      try {
        const bin = decompress(maybebinsquash)
        const maybebookfrombin = unpackformat(bin)
        if (ispresent(maybebookfrombin)) {
          const book = importbook(maybebookfrombin)
          if (ispresent(book)) {
            books.push(book)
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error: any) {
        // fallback to just msgpackr
        const maybebookfrombin = unpackformat(maybebinsquash)
        if (ispresent(maybebookfrombin)) {
          const book = importbook(maybebookfrombin)
          if (ispresent(book)) {
            books.push(book)
          }
        }
      }
    } else {
      const str = await file.async('string')
      const maybebookfromstr = unpackformat(str)
      if (ispresent(maybebookfromstr)) {
        const book = importbook(maybebookfromstr)
        if (ispresent(book)) {
          books.push(book)
        }
      }
    }
  }

  return books
}
