import { encode, decode } from 'base65536'

import {
  buffertovalue,
  buffertocompressed,
  valuetobuffer,
  compressedtobuffer,
} from './buffer'

export function buffertourlhash(buffer: Uint8Array) {
  return encode(buffer)
}

export function urlhashtobuffer(urlhash: string) {
  return decode(urlhash)
}

export function valuetourlhash(value: any) {
  const buffer = valuetobuffer(value)
  const content = buffertocompressed(buffer)
  if (content) {
    return buffertourlhash(content)
  }
}

export function urlhashtovalue<T>(urlhash: string) {
  const content = urlhashtobuffer(urlhash)
  const buffer = compressedtobuffer(content)
  if (buffer) {
    return buffertovalue<T>(content)
  }
}
