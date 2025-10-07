import JSZip, { JSZipObject } from 'jszip'
import mime from 'mime/lite'
import {
  api_error,
  api_log,
  vm_loader,
  vm_logout,
  vm_readzipfilelist,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { parseansi } from './ansi'
import { parsechr } from './chr'
import { parsezzm } from './zzm'
import { parsebrd, parsezzt } from './zzt'
import { parsezztobj } from './zztobj'

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

export function mapfiletype(type: string, file: File | undefined) {
  if (!ispresent(file)) {
    return ''
  }
  switch (type) {
    case 'model/obj':
      return 'obj'
    case 'text/plain':
      return 'txt'
    case 'application/json':
      return 'json'
    case 'application/zip':
      return 'zip'
    case 'application/octet-stream':
      if (/.zzt$/i.test(file.name)) {
        return 'zzt'
      } else if (/.brd$/i.test(file.name)) {
        return 'brd'
      } else if (/.chr$/i.test(file.name)) {
        return 'chr'
      } else if (/.zzm$/i.test(file.name)) {
        return 'zzm'
      } else if (/.ans$/i.test(file.name)) {
        return 'ans'
      } else if (/.adf$/i.test(file.name)) {
        return 'adf'
      } else if (/.bin$/i.test(file.name)) {
        return 'bin'
      } else if (/.idf$/i.test(file.name)) {
        return 'idf'
      } else if (/.pcb$/i.test(file.name)) {
        return 'pcb'
      } else if (/.tnd$/i.test(file.name)) {
        return 'tnd'
      } else if (/.xb$/i.test(file.name)) {
        return 'xb'
      } else if (/.diz$/i.test(file.name)) {
        return 'diz'
      } // idf
      break
  }
  return ''
}

// various handlers
let zipfilelist: File[] = []
let zipfilemarks: Record<string, boolean> = {}

export async function parsezipfile(player: string, file: File) {
  try {
    api_log(SOFTWARE, player, 'parsezipfile', file.name)
    const arraybuffer = await file.arrayBuffer()
    const ziplib = new JSZip()
    const zip = await ziplib.loadAsync(arraybuffer)
    zipfilelist = []
    zipfilemarks = {}
    const templist: [string, JSZipObject][] = []
    zip.forEach((filename, fileitem) => templist.push([filename, fileitem]))
    for (let i = 0; i < templist.length; ++i) {
      const [filename, fileitem] = templist[i]
      const bytes = await fileitem.async('uint8array')
      const mimetype = mimetypeofbytesread(filename, bytes)
      const zipfile = new File([bytes as BlobPart], fileitem.name, {
        type: mimetype,
      })
      zipfilelist.push(zipfile)
    }
    // signal scroll to open
    vm_readzipfilelist(SOFTWARE, player)
  } catch (err: any) {
    api_error(SOFTWARE, player, 'crash', err.message)
  }
}

export function readzipfilelist() {
  const filelist: [string, string][] = []

  for (let i = 0; i < zipfilelist.length; ++i) {
    const file = zipfilelist[i]
    filelist.push([mapfiletype(file.type, file), file.name])
  }

  return filelist
}

export function markzipfilelistitem(filename: string, value: boolean) {
  zipfilemarks[filename.toLowerCase()] = value
}

export function readzipfilelistitem(filename: string): MAYBE<boolean> {
  return zipfilemarks[filename.toLowerCase()]
}

export async function parsezipfilelist(player: string) {
  for (let i = 0; i < zipfilelist.length; ++i) {
    const item = zipfilelist[i]
    const marked = zipfilemarks[item.name.toLowerCase()]
    if (marked) {
      parsewebfile(player, item)
      await waitfor(2000)
    }
  }
  // re-login after import
  await waitfor(2000)
  vm_logout(SOFTWARE, player, false)
}

export async function parsebinaryfile(
  file: File,
  player: string,
  onbuffer: (buffer: Uint8Array) => void,
) {
  try {
    api_log(SOFTWARE, player, 'parsebinaryfile', file.name)
    const arraybuffer = await file.arrayBuffer()
    onbuffer(new Uint8Array(arraybuffer))
  } catch (err: any) {
    api_error(SOFTWARE, player, 'crash', err.message)
  }
}

function handlefiletype(player: string, type: string, file: File | undefined) {
  if (!ispresent(file)) {
    return
  }
  const filetype = mapfiletype(type, file)
  switch (filetype) {
    case 'obj':
      file
        .text()
        .then((content) => parsezztobj(player, file.name, content))
        .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      break
    case 'txt':
      file
        .text()
        .then((content) =>
          vm_loader(
            SOFTWARE,
            player,
            undefined,
            'text',
            `file:${file.name}`,
            content,
          ),
        )
        .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      break
    case 'json':
      file
        .text()
        .then((content) =>
          vm_loader(
            SOFTWARE,
            player,
            undefined,
            'json',
            `file:${file.name}`,
            content,
          ),
        )
        .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      break
    case 'zip':
      parsezipfile(player, file).catch((err) =>
        api_error(SOFTWARE, player, 'crash', err.message),
      )
      break
    case 'zzt':
      file
        .arrayBuffer()
        .then((arraybuffer) => {
          parsezzt(player, new Uint8Array(arraybuffer))
        })
        .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      break
    case 'brd':
      file
        .arrayBuffer()
        .then((arraybuffer) => {
          parsebrd(player, new Uint8Array(arraybuffer))
        })
        .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      break
    case 'chr':
      file
        .arrayBuffer()
        .then((arraybuffer) => {
          parsechr(player, file.name, new Uint8Array(arraybuffer))
        })
        .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      break
    case 'zzm':
      file
        .text()
        .then((content) => {
          parsezzm(player, content)
        })
        .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      break
    case 'ans':
    case 'adf':
    case 'bin':
    case 'idf':
    case 'pcb':
    case 'tnd':
    case 'xb':
      file
        .arrayBuffer()
        .then((arraybuffer) => {
          parseansi(player, file.name, filetype, new Uint8Array(arraybuffer))
        })
        .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      break
    default:
      if (!type) {
        file
          .arrayBuffer()
          .then((arraybuffer) => {
            const type = mimetypeofbytesread(
              file.name,
              new Uint8Array(arraybuffer),
            )
            if (type) {
              handlefiletype(player, type, file)
            } else {
              return api_error(
                SOFTWARE,
                player,
                'parsewebfile',
                `unsupported file ${file.name}`,
              )
            }
          })
          .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      }
      return
  }
}

export function parsewebfile(player: string, file: File | undefined) {
  handlefiletype(player, file?.type ?? '', file)
}
