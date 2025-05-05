import JSZip from 'jszip'
import mime from 'mime/lite'
import { api_error, api_info, vm_loader } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ispresent } from 'zss/mapping/types'

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
    default:
      // we are going to assume .xp binary is rexpaint
      if (filename.endsWith('.xp')) {
        return 'application/rexpaint'
      }
      break
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
    api_info(SOFTWARE, player, file.name)
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
    api_info(SOFTWARE, player, file.name)
    const arraybuffer = await file.arrayBuffer()
    onbuffer(new Uint8Array(arraybuffer))
  } catch (err: any) {
    api_error(SOFTWARE, player, 'crash', err.message)
  }
}

export function parsewebfile(player: string, file: File | undefined) {
  function handlefiletype(type: string) {
    if (!ispresent(file)) {
      return
    }
    switch (type) {
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
        parsezipfile(player, file, (ifile) =>
          parsewebfile(player, ifile),
        ).catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
        break
      case 'application/rexpaint':
        parsebinaryfile(file, player, (binaryfile) =>
          vm_loader(
            SOFTWARE,
            player,
            undefined,
            'rexpaint',
            `file:${file.name}`,
            binaryfile,
          ),
        ).catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
        break
      case 'application/octet-stream':
        parsebinaryfile(file, player, (binaryfile) =>
          vm_loader(
            SOFTWARE,
            player,
            undefined,
            'binary',
            `file:${file.name}`,
            binaryfile,
          ),
        ).catch((err) => api_error(SOFTWARE, player, 'crash', err.message))
        break
      default:
        file
          .arrayBuffer()
          .then((arraybuffer) => {
            const type = mimetypeofbytesread(
              file.name,
              new Uint8Array(arraybuffer),
            )
            if (type) {
              handlefiletype(type)
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
        return
    }
  }
  handlefiletype(file?.type ?? '')
}
