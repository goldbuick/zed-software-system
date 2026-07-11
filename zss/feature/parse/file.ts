import JSZip, { JSZipObject } from 'jszip'
import mime from 'mime/lite'
import {
  apierror,
  apilog,
  vmloader,
  vmreadzipfilelist,
  workstatus,
} from 'zss/device/api'
import {
  readwanixbinddropdst,
  readwanixbinddropkind,
  readwanixbinddropperm,
} from 'zss/device/wanixclient/wanixbindpaths'
import { readattachedsession } from 'zss/device/wanixclient/wanixdisplay'
import {
  handlewanixbinddrop,
  handlewanixdrop,
} from 'zss/device/wanixclient/wanixroom'
import { SOFTWARE } from 'zss/device/session'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { memoryreadwanixattached } from 'zss/memory/session'

import { parseansi } from './ansi'
import { parsechr } from './chr'
import { stageimageimport } from './image'
import { parsemidi } from './midi'
import { parsepetscii } from './petscii'
import { parsezzm } from './zzm'
import { parsebrd, parseszt, parsezzt } from './zzt'
import { isszztworldbytes, iszztworldbytes } from './zztmagic'
import { parsezztobj } from './zztobj'

export function mimetypeofbytesread(filename: string, filebytes: Uint8Array) {
  // ZZT/SZT magic is a signed int16 LE at offset 0 (−1 / −2), not a fixed 4-byte tag.
  if (iszztworldbytes(filebytes)) {
    return 'application/x-zzt'
  }
  if (isszztworldbytes(filebytes)) {
    return 'application/x-szt'
  }
  const bytes = [...filebytes.slice(0, 4)]
  const signature = bytes
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  switch (signature) {
    case '4D546864':
      return 'audio/midi'
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
    case '0061736D':
      return 'application/wasm'
  }
  return mime.getType(filename) ?? 'application/octet-stream'
}

export function mapmimetype(mimetype: string, file: File | undefined) {
  if (!ispresent(file)) {
    return ''
  }
  switch (mimetype) {
    case 'model/obj':
      return 'obj'
    case 'text/plain':
      if (/.nfo$/i.test(file.name)) {
        return 'nfotext'
      }
      return 'txt'
    case 'application/json':
      return 'json'
    case 'application/zip':
      return 'zip'
    case 'application/gzip':
    case 'application/x-gzip':
      if (/\.tgz$/i.test(file.name) || /\.tar\.gz$/i.test(file.name)) {
        return 'bundle'
      }
      break
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
      } else if (/.nfo$/i.test(file.name)) {
        return 'nfotext'
      } else if (/.szt$/i.test(file.name)) {
        return 'szt'
      } else if (/.mid$/i.test(file.name)) {
        return 'mid'
      } else if (/.pet$/i.test(file.name)) {
        return 'pet'
      } else if (/.png$/i.test(file.name)) {
        return 'png'
      } else if (/.jpe?g$/i.test(file.name)) {
        return 'jpeg'
      } else if (/.gif$/i.test(file.name)) {
        return 'gif'
      } else if (/.webp$/i.test(file.name)) {
        return 'webp'
      } else if (/.wasm$/i.test(file.name)) {
        return 'wasm'
      } else if (/\.tgz$/i.test(file.name) || /\.tar\.gz$/i.test(file.name)) {
        return 'bundle'
      }
      break
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpeg'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    case 'application/wasm':
      return 'wasm'
    case 'application/x-zzt':
      return 'zzt'
    case 'application/x-szt':
      return 'szt'
    case 'audio/midi':
    case 'audio/mid':
    case 'audio/x-midi':
    case 'audio/x-mid':
      return 'mid'
  }
  return ''
}

// various handlers
let zipfilelist: File[] = []
let zipfilemarks: Record<string, boolean> = {}

export async function parsezipfile(player: string, file: File) {
  try {
    workstatus(SOFTWARE, player, 'parse zip')
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
    apilog(SOFTWARE, player, 'unzip done')
    vmreadzipfilelist(SOFTWARE, player)
  } catch (err: any) {
    apierror(SOFTWARE, player, 'crash', err.message)
  }
}

export function readzipfilelist() {
  const filelist: [string, string][] = []

  for (let i = 0; i < zipfilelist.length; ++i) {
    const file = zipfilelist[i]
    filelist.push([mapmimetype(file.type, file), file.name])
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
}

function imagemimetype(kind: string, file: File): string {
  if (file.type.startsWith('image/')) {
    return file.type
  }
  switch (kind) {
    case 'png':
      return 'image/png'
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    default:
      return file.type || 'application/octet-stream'
  }
}

function stageimagefile(player: string, kind: string, file: File) {
  void file
    .arrayBuffer()
    .then((arraybuffer) => {
      void stageimageimport(
        player,
        file.name,
        imagemimetype(kind, file),
        new Uint8Array(arraybuffer),
      ).catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
    })
    .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
}

function handlefiletype(player: string, type: string, file: File | undefined) {
  if (!ispresent(file)) {
    return
  }
  const filetype = mapmimetype(type, file)
  console.info('handlefiletype !!!', filetype, type)
  switch (filetype) {
    case 'obj':
      file
        .text()
        .then((content) => parsezztobj(player, file.name, content))
        .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
      break
    case 'txt':
      file
        .text()
        .then((content) =>
          vmloader(
            SOFTWARE,
            player,
            undefined,
            'text',
            `file:${file.name}`,
            content,
          ),
        )
        .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
      break
    case 'json':
      file
        .text()
        .then((content) =>
          vmloader(
            SOFTWARE,
            player,
            undefined,
            'json',
            `file:${file.name}`,
            content,
          ),
        )
        .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
      break
    case 'zip':
      parsezipfile(player, file).catch((err) =>
        apierror(SOFTWARE, player, 'crash', err.message),
      )
      break
    case 'zzt':
      file
        .arrayBuffer()
        .then((arraybuffer) => {
          parsezzt(player, new Uint8Array(arraybuffer))
        })
        .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
      break
    case 'szt':
      file
        .arrayBuffer()
        .then((arraybuffer) => {
          parseszt(player, new Uint8Array(arraybuffer))
        })
        .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
      break
    case 'brd':
      file
        .arrayBuffer()
        .then((arraybuffer) => {
          parsebrd(player, new Uint8Array(arraybuffer))
        })
        .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
      break
    case 'chr':
      file
        .arrayBuffer()
        .then((arraybuffer) => {
          parsechr(player, file.name, new Uint8Array(arraybuffer))
        })
        .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
      break
    case 'zzm':
      file
        .text()
        .then((content) => {
          parsezzm(player, content)
        })
        .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
      break
    case 'mid':
      parsemidi(player, file).catch((err) =>
        apierror(SOFTWARE, player, 'crash', err.message),
      )
      break
    case 'pet':
      file
        .arrayBuffer()
        .then((arraybuffer) => {
          parsepetscii(player, file.name, new Uint8Array(arraybuffer))
        })
        .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
      break
    case 'nfotext':
      file
        .arrayBuffer()
        .then((arraybuffer) => {
          parseansi(player, file.name, 'txt', new Uint8Array(arraybuffer))
        })
        .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
      break
    case 'ans':
    case 'adf':
    case 'bin':
    case 'idf':
    case 'pcb':
    case 'tnd':
    case 'xb':
    case 'diz':
      file
        .arrayBuffer()
        .then((arraybuffer) => {
          parseansi(player, file.name, filetype, new Uint8Array(arraybuffer))
        })
        .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
      break
    case 'png':
    case 'jpeg':
    case 'gif':
    case 'webp':
      stageimagefile(player, filetype, file)
      break
    case 'wasm':
      file
        .arrayBuffer()
        .then((arraybuffer) => {
          return handlewanixdrop(
            {
              label: file.name,
              kind: 'wasm',
              bytes: new Uint8Array(arraybuffer),
            },
            SOFTWARE,
            player,
          )
        })
        .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
      break
    case 'bundle':
      file
        .arrayBuffer()
        .then((arraybuffer) => {
          return handlewanixdrop(
            {
              label: file.name,
              kind: 'bundle',
              bytes: new Uint8Array(arraybuffer),
            },
            SOFTWARE,
            player,
          )
        })
        .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
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
              return apierror(
                SOFTWARE,
                player,
                'parsewebfile',
                `unsupported file ${file.name}`,
              )
            }
          })
          .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
      } else if (!filetype) {
        apierror(
          SOFTWARE,
          player,
          'parsewebfile',
          `unsupported mime type ${type} for ${file.name}`,
        )
      }
      return
  }
}

export function parsewebfile(player: string, file: File | undefined) {
  if (!ispresent(file)) {
    return
  }
  if (memoryreadwanixattached()) {
    const sessionkey = readattachedsession()
    if (!sessionkey) {
      apierror(SOFTWARE, player, 'wanix', 'bind-drop: no attached session')
      return
    }
    file
      .arrayBuffer()
      .then((arraybuffer) => {
        const kind = readwanixbinddropkind(file.name)
        return handlewanixbinddrop(
          {
            label: file.name,
            kind,
            bytes: new Uint8Array(arraybuffer),
            dst: readwanixbinddropdst(file.name, kind),
            perm: readwanixbinddropperm(file.name),
          },
          sessionkey,
        )
      })
      .catch((err) => apierror(SOFTWARE, player, 'crash', err.message))
  } else {
    handlefiletype(player, file.type ?? '', file)
  }
}
