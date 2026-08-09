/** Zed airshare wire format (not interoperable with Decimen). */

export const AIRSHARE_MAGIC = 0xa2
export const AIRSHARE_VERSION = 1
export const AIRSHARE_HEADER_SIZE = 50

export type AIRSHARE_HEADER = {
  magic: number
  version: number
  session: number
  seq: number
  blockcount: number
  blocksize: number
  totallen: number
  sha256: Uint8Array
}

export function packairshareheader(header: AIRSHARE_HEADER): Uint8Array {
  if (header.sha256.length !== 32) {
    throw new Error('airshare header sha256 must be 32 bytes')
  }
  const out = new Uint8Array(AIRSHARE_HEADER_SIZE)
  const view = new DataView(out.buffer)
  out[0] = AIRSHARE_MAGIC
  out[1] = AIRSHARE_VERSION
  view.setUint32(2, header.session >>> 0, false)
  view.setUint32(6, header.seq >>> 0, false)
  view.setUint16(10, header.blockcount & 0xffff, false)
  view.setUint16(12, header.blocksize & 0xffff, false)
  view.setUint32(14, header.totallen >>> 0, false)
  out.set(header.sha256, 18)
  return out
}

export function parseairshareheader(bytes: Uint8Array): AIRSHARE_HEADER | null {
  if (bytes.length < AIRSHARE_HEADER_SIZE) {
    return null
  }
  if (bytes[0] !== AIRSHARE_MAGIC || bytes[1] !== AIRSHARE_VERSION) {
    return null
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const sha256 = bytes.slice(18, 50)
  return {
    magic: bytes[0],
    version: bytes[1],
    session: view.getUint32(2, false),
    seq: view.getUint32(6, false),
    blockcount: view.getUint16(10, false),
    blocksize: view.getUint16(12, false),
    totallen: view.getUint32(14, false),
    sha256,
  }
}

/** Stable identity for a stream; any change resets the receiver. */
export function airsharestreamidentity(header: AIRSHARE_HEADER): string {
  const hashhex = Array.from(header.sha256)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return [
    header.magic,
    header.version,
    header.session,
    header.blockcount,
    header.blocksize,
    header.totallen,
    hashhex,
  ].join(':')
}

export function packairshareframe(
  header: AIRSHARE_HEADER,
  payload: Uint8Array,
): Uint8Array {
  if (payload.length !== header.blocksize) {
    throw new Error('airshare frame payload must match blocksize')
  }
  const out = new Uint8Array(AIRSHARE_HEADER_SIZE + header.blocksize)
  out.set(packairshareheader(header), 0)
  out.set(payload, AIRSHARE_HEADER_SIZE)
  return out
}

export function parseairshareframe(bytes: Uint8Array): {
  header: AIRSHARE_HEADER
  payload: Uint8Array
} | null {
  const header = parseairshareheader(bytes)
  if (!header) {
    return null
  }
  if (bytes.length < AIRSHARE_HEADER_SIZE + header.blocksize) {
    return null
  }
  return {
    header,
    payload: bytes.slice(
      AIRSHARE_HEADER_SIZE,
      AIRSHARE_HEADER_SIZE + header.blocksize,
    ),
  }
}
