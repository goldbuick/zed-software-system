import JSZip from 'jszip'
import mime from 'mime/lite'
import { api_error, tape_info, vm_loader } from 'zss/device/api'
import { ispresent } from 'zss/mapping/types'
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

// various handlers
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
            vm_loader('parsefile', 'text', file.name, content, player),
          )
          .catch((err) => api_error('fileloader', 'crash', err.message))
        break
      case 'application/zip':
        parsezipfile(file, (ifile) => parsewebfile(player, ifile)).catch(
          (err) => api_error('fileloader', 'crash', err.message),
        )
        break
      case 'application/octet-stream':
        parsebinaryfile(file, (fileext, binaryfile) =>
          vm_loader('parsefile', 'binary', fileext, binaryfile, player),
        ).catch((err) => api_error('memory', 'crash', err.message))
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
                'memory',
                'loadfile',
                `unsupported file ${file.name}`,
              )
            }
          })
          .catch((err) => api_error('memory', 'crash', err.message))
        return
    }
  }
  handlefiletype(file?.type ?? '')
}
