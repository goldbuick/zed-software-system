import { encode as msgencode, decode as msgdecode } from '@msgpack/msgpack'
import { toBase64, fromBase64 } from '@smithy/util-base64'
import {
  makeCompressionStream,
  makeDecompressionStream,
} from 'compression-streams-polyfill/ponyfill'
import { api_error } from 'zss/device/api'

import { ispresent } from './types'

const CompressionStream = makeCompressionStream(TransformStream)
const DecompressionStream = makeDecompressionStream(TransformStream)

async function zipstream<
  T extends typeof CompressionStream | typeof DecompressionStream,
>(Stream: T, buffer: Uint8Array) {
  try {
    // create the stream
    const bufferstream = new Stream('gzip')
    // create the writer
    const writer = bufferstream.writable.getWriter()

    //write the buffer to the writer
    await writer.write(buffer)
    await writer.close()

    return bufferstream
  } catch (err) {
    //
  }
}

async function zipreader(reader: ReadableStreamDefaultReader<Uint8Array>) {
  try {
    let result
    let compressedData = new Uint8Array()
    while ((result = await reader.read())) {
      if (result.done) {
        return compressedData
      } else {
        compressedData = new Uint8Array([...compressedData, ...result.value])
      }
    }
    return compressedData
  } catch (err) {
    //
  }
}

async function zipbuffer(buffer: Uint8Array): Promise<Uint8Array | undefined> {
  const bs = await zipstream(CompressionStream, buffer)
  if (!ispresent(bs)) {
    return
  }

  return await zipreader(bs.readable.getReader())
}

async function unzipbuffer(
  buffer: Uint8Array,
): Promise<Uint8Array | undefined> {
  const bs = await zipstream(DecompressionStream, buffer)
  if (!ispresent(bs)) {
    return
  }

  return await zipreader(bs.readable.getReader())
}

export async function compresstobuffer(
  value: any,
): Promise<Uint8Array | undefined> {
  try {
    const buffer = msgencode(value)
    if (ispresent(buffer)) {
      return await zipbuffer(buffer)
    }
  } catch (err: any) {
    api_error('buffer', 'crash', err.message)
  }
}

export async function decompressfrombuffer(
  zipped: Uint8Array,
): Promise<any | undefined> {
  try {
    const msg = await unzipbuffer(zipped)
    if (ispresent(msg)) {
      return msgdecode(msg)
    }
  } catch (err: any) {
    api_error('buffer', 'crash', err.message)
  }
}

export async function compresstourlhash(value: any) {
  return toBase64((await compresstobuffer(value)) ?? '')
}

export async function decompressfromurlhash(value: string) {
  return await decompressfrombuffer(fromBase64(value))
}
