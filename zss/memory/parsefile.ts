import JSZip from 'jszip'
import mime from 'mime/lite'
import { api_error, tape_info } from 'zss/device/api'
import { ensureopenbook } from 'zss/firmware/cli'
import { ispresent } from 'zss/mapping/types'

import { bookreadcodepagewithtype, bookwritecodepage } from './book'
import {
  codepagereadname,
  codepagereadtype,
  codepagereadtypetostring,
  createcodepage,
} from './codepage'

export function mimetypeofbytesread(filename: string, filebytes: Uint8Array) {
  const bytes = [...filebytes.slice(0, 4)]
  const signature = bytes
    .map((item) => item.toString(16))
    .join('')
    .toUpperCase()
  switch (signature) {
    case '89504E47':
      return 'image/png'
    case '47494638':
      return 'image/gif'
    case '25504446':
      return 'application/pdf'
    case 'FFD8FFDB':
    case 'FFD8FFE0':
    case 'FFD8FFE1':
      return 'image/jpeg'
    case '504B0304':
      return 'application/zip'
  }
  return mime.getType(filename) ?? 'application/octet-stream'
}

// create codepage from source text
function createcodepagefromtext(text: string) {
  const codepage = createcodepage(text, {})
  const pagename = codepagereadname(codepage)
  const pagetype = codepagereadtypetostring(codepage)

  // only create if target doesn't already exist
  const book = ensureopenbook()
  const maybepage = bookreadcodepagewithtype(
    book,
    codepagereadtype(codepage),
    pagename,
  )

  if (ispresent(maybepage)) {
    tape_info(
      'memory',
      `${book.name} already has a [${pagetype}] named ${pagename}`,
    )
  } else {
    bookwritecodepage(book, codepage)
    tape_info('memory', `created [${pagetype}] ${pagename} in ${book.name}`)
  }
}

// various handlers
export async function parsetextfile(file: File) {
  const text = await file.text()
  createcodepagefromtext(text)
}

export async function parsezipfile(
  file: File,
  onreadfile: (zipfile: File) => void,
) {
  try {
    tape_info('parsezipfile', file.name)
    const arraybuffer = await file.arrayBuffer()
    const ziplib = new JSZip()
    const zip = await ziplib.loadAsync(arraybuffer)
    zip.forEach((filename, fileitem) => {
      fileitem
        .async('uint8array')
        .then((bytes) => {
          const mimetype = mimetypeofbytesread(filename, bytes)
          const zipfile = new File([bytes], fileitem.name, {
            type: mimetype,
          })
          onreadfile(zipfile)
        })
        .catch((err) => {
          api_error('memory', 'crash', err.message)
        })
    })
  } catch (err: any) {
    api_error('memory', 'crash', err.message)
  }
}

export async function parsebinaryfile(
  file: File,
  onbuffer: (fileext: string, buffer: Uint8Array) => void,
) {
  try {
    tape_info('parsebinaryfile', file.name)
    const arraybuffer = await file.arrayBuffer()
    const ext = file.name.split('.').slice(-1)[0]
    onbuffer((ext ?? '').toLowerCase(), new Uint8Array(arraybuffer))
  } catch (err: any) {
    api_error('memory', 'crash', err.message)
  }
}
