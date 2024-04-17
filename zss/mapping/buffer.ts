import { unpack, pack } from 'msgpackr'
import pako from 'pako'

export function valuetobuffer(value: any) {
  return pack(value)
}

export function buffertovalue<T>(buffer: Uint8Array) {
  return unpack(buffer) as T
}

export function compressedtobuffer(zip: Uint8Array) {
  try {
    return pako.inflate(zip)
  } catch (err) {
    console.error(err)
  }
}

export function buffertocompressed(buffer: Uint8Array) {
  try {
    return pako.deflate(buffer)
  } catch (err) {
    console.error(err)
  }
}
