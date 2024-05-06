import { compress, decompress } from 'compress-json'
import {
  compressToEncodedURIComponent,
  compressToUint8Array,
  decompressFromEncodedURIComponent,
  decompressFromUint8Array,
} from 'lz-string'

export function valuetostring(value: any) {
  return JSON.stringify(compress(value))
}

export function stringtovalue<T>(value: string) {
  return decompress(JSON.parse(value)) as T
}

export function valuetobuffer(value: any) {
  return compressToUint8Array(valuetostring(value))
}

export function buffertovalue<T>(buffer: Uint8Array) {
  return stringtovalue<T>(decompressFromUint8Array(buffer))
}

export function valuetoencodeduri(value: any) {
  return compressToEncodedURIComponent(valuetostring(value))
}

export function encodeduritovalue<T>(encodeduri: string) {
  return stringtovalue<T>(decompressFromEncodedURIComponent(encodeduri))
}
