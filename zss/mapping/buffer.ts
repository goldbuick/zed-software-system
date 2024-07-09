import { encode as msgencode, decode as msgdecode } from '@msgpack/msgpack'
import { toBase64, fromBase64 } from '@smithy/util-base64'
import { compress as compact, decompress as decompact } from 'compress-json'
import {
  makeCompressionStream,
  makeDecompressionStream,
} from 'compression-streams-polyfill/ponyfill'

import { ispresent } from './types'

const CompressionStream = makeCompressionStream(TransformStream)
const DecompressionStream = makeDecompressionStream(TransformStream)

async function zipbuffer(buffer: Uint8Array): Promise<Uint8Array | undefined> {
  //create the stream
  const cs = new CompressionStream('gzip')
  //create the writer
  const writer = cs.writable.getWriter()
  //write the buffer to the writer
  writer.write(buffer)
  writer.close()
  //create the output
  const output: Uint8Array[] = []
  const reader = cs.readable.getReader()
  let totalSize = 0
  //go through each chunk and add it to the output
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    output.push(value)
    totalSize += value.byteLength
  }
  const concatenated = new Uint8Array(totalSize)
  let offset = 0
  //finally build the compressed array and return it
  for (const array of output) {
    concatenated.set(array, offset)
    offset += array.byteLength
  }
  return concatenated
}

async function unzipbuffer(
  buffer: Uint8Array,
): Promise<Uint8Array | undefined> {
  try {
    //create the stream
    const cs = new CompressionStream('gzip')
    //create the writer
    const writer = cs.writable.getWriter()
    //write the buffer to the writer
    writer.write(buffer)
    writer.close()
  } catch (err) {
    //
  }
}

export async function compresstourlstring(
  value: JSON,
): Promise<string | undefined> {
  try {
    const compactjson = compact(value)
    const buffer = msgencode(compactjson)
    const zipped = await zipbuffer(buffer)
    if (ispresent(zipped)) {
      const urlstring = toBase64(zipped)
      return urlstring
    }
  } catch (err) {
    //
  }
}

/**
 * trimming process:
 *
 * 1. compress-json
 * 2. msg-pack into binary
 * 3. compress binary
 * 4. pack into url-safe-chars
 */

// const compressArrayBuffer = async (input: ArrayBuffer) => {
//   //create the output
//   const output: Uint8Array[] = [];
//   const reader = cs.readable.getReader();
//   let totalSize = 0;
//   //go through each chunk and add it to the output
//   while (true) {
//     const { value, done } = await reader.read();
//     if (done) break;
//     output.push(value);
//     totalSize += value.byteLength;
//   }
//   const concatenated = new Uint8Array(totalSize);
//   let offset = 0;
//   //finally build the compressed array and return it
//   for (const array of output) {
//     concatenated.set(array, offset);
//     offset += array.byteLength;
//   }
//   return concatenated;
// };
