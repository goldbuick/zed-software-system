import JSZip from 'jszip'
import mime from 'mime/lite'
import { api_error, api_log, vm_loader } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ispresent } from 'zss/mapping/types'

import { parsezzl } from './zzl'
import { parsezzm } from './zzm'
import { parsezzt } from './zzt'
import { parsezztbrd } from './zztbrd'
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

// various handlers
export async function parsezipfile(
  player: string,
  file: File,
  onreadfile: (zipfile: File) => void,
) {
  try {
    api_log(SOFTWARE, player, 'parsezipfile', file.name)
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
          api_error(SOFTWARE, player, 'crash', err.message)
        })
    })
  } catch (err: any) {
    api_error(SOFTWARE, player, 'crash', err.message)
  }
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
  // console.info(type, file)
  if (!ispresent(file)) {
    return
  }
  switch (type) {
    case 'model/obj':
      file
        .text()
        .then((content) => parsezztobj(player, content))
        .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      break
    case 'text/plain':
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
    case 'application/json':
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
    case 'application/zip':
      parsezipfile(player, file, (ifile) => parsewebfile(player, ifile)).catch(
        (err) => api_error(SOFTWARE, player, 'crash', err.message),
      )
      break
    case 'application/octet-stream':
      if (/.zzt$/i.test(file.name)) {
        file
          .arrayBuffer()
          .then((arraybuffer) => {
            parsezzt(player, new Uint8Array(arraybuffer))
          })
          .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      } else if (/.brd$/i.test(file.name)) {
        file
          .arrayBuffer()
          .then((arraybuffer) => {
            parsezztbrd(player, new Uint8Array(arraybuffer))
          })
          .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      } else if (/.zzl$/i.test(file.name)) {
        file
          .text()
          .then((content) => {
            parsezzl(player, content)
          })
          .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      } else if (/.zzm$/i.test(file.name)) {
        file
          .text()
          .then((content) => {
            parsezzm(player, content)
          })
          .catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
      }
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
