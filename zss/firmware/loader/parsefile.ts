import JSZip from 'jszip'
import mime from 'mime/lite'
import { api_error, tape_info } from 'zss/device/api'
import { ispresent } from 'zss/mapping/types'
import {
  MEMORY_LABEL,
  memoryensuresoftwarebook,
  memorysetcodepageindex,
} from 'zss/memory'
import { bookreadcodepagewithtype, bookwritecodepage } from 'zss/memory/book'
import {
  codepagereadname,
  codepagereadtype,
  codepagereadtypetostring,
  createcodepage,
} from 'zss/memory/codepage'
import { NAME } from 'zss/words/types'

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

  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  // only create if target doesn't already exist
  const codepagetype = codepagereadtype(codepage)
  const maybepage = bookreadcodepagewithtype(mainbook, codepagetype, pagename)

  if (ispresent(maybepage)) {
    tape_info(
      'memory',
      `${mainbook.name} already has a [${pagetype}] named ${pagename}`,
    )
  } else {
    bookwritecodepage(mainbook, codepage)
    memorysetcodepageindex(codepage.id, mainbook.id)
    tape_info('memory', `created [${pagetype}] ${pagename} in ${mainbook.name}`)
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
    const ext = file.name.split('.').slice(-1)[0] ?? ''
    onbuffer(NAME(ext), new Uint8Array(arraybuffer))
  } catch (err: any) {
    api_error('memory', 'crash', err.message)
  }
}
