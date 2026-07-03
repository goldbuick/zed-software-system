export type WanixExtractedFile = {
  path: string
  bytes: Uint8Array
}

function readoctalfield(
  header: Uint8Array,
  offset: number,
  length: number,
): number {
  const slice = header.subarray(offset, offset + length)
  let text = ''
  for (let i = 0; i < slice.length; ++i) {
    const code = slice[i]
    if (code === 0 || code === 32) {
      break
    }
    text += String.fromCharCode(code)
  }
  const value = parseInt(text.trim(), 8)
  return Number.isFinite(value) ? value : 0
}

function readtarname(header: Uint8Array): string {
  const namebytes = header.subarray(0, 100)
  let end = namebytes.length
  while (end > 0 && namebytes[end - 1] === 0) {
    end -= 1
  }
  const name = new TextDecoder().decode(namebytes.subarray(0, end))
  const prefixbytes = header.subarray(345, 500)
  let pend = prefixbytes.length
  while (pend > 0 && prefixbytes[pend - 1] === 0) {
    pend -= 1
  }
  const prefix = new TextDecoder().decode(prefixbytes.subarray(0, pend))
  if (prefix) {
    return `${prefix}/${name}`
  }
  return name
}

export function iswanixtarjunkpath(name: string): boolean {
  const normalized = name.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized === '.' || normalized === './') {
    return true
  }
  if (normalized === '.DS_Store' || normalized.endsWith('/.DS_Store')) {
    return true
  }
  const parts = normalized.split('/')
  for (const part of parts) {
    if (part === '__MACOSX' || part.startsWith('._')) {
      return true
    }
  }
  return normalized.startsWith('__MACOSX/')
}

export function sanitizewanixtarpath(name: string): string {
  const normalized = name.replace(/\\/g, '/').replace(/^\/+/, '')
  const parts = normalized.split('/').filter((part) => part.length > 0 && part !== '.')
  return parts.join('/')
}

function joinprefixpath(prefix: string, tarpath: string): string {
  const trimmedprefix = prefix.replace(/\/+$/, '')
  const trimmedpath = sanitizewanixtarpath(tarpath)
  if (!trimmedpath) {
    return trimmedprefix
  }
  return `${trimmedprefix}/${trimmedpath}`
}

export function extractwanixtarbytes(
  tarbytes: Uint8Array,
  prefix: string,
): WanixExtractedFile[] {
  const files: WanixExtractedFile[] = []
  let offset = 0

  while (offset + 512 <= tarbytes.length) {
    const header = tarbytes.subarray(offset, offset + 512)
    offset += 512

    const empty = header.every((byte) => byte === 0)
    if (empty) {
      break
    }

    const name = readtarname(header)
    const typeflag = header[156]
    const size = readoctalfield(header, 124, 12)
    const paddedsize = Math.ceil(size / 512) * 512

    if (typeflag === 53 || name.endsWith('/')) {
      offset += paddedsize
      continue
    }

    if (typeflag === 50 || typeflag === 49 || typeflag === 75) {
      offset += paddedsize
      continue
    }

    if (typeflag !== 48 && typeflag !== 0) {
      offset += paddedsize
      continue
    }

    const body = tarbytes.subarray(offset, offset + size)
    offset += paddedsize

    if (iswanixtarjunkpath(name)) {
      continue
    }

    files.push({
      path: joinprefixpath(prefix, name),
      bytes: body.slice(),
    })
  }

  return files
}

async function gunzipbytes(input: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('gzip decompression is not available')
  }
  const stream = new Blob([input as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

export async function extractwanixtgz(
  bytes: Uint8Array,
  prefix: string,
): Promise<WanixExtractedFile[]> {
  const tarbytes = await gunzipbytes(bytes)
  return extractwanixtarbytes(tarbytes, prefix)
}
