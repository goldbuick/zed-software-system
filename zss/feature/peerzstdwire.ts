import { compress, decompress } from '@bokuweb/zstd-wasm'
import { pack, unpack } from 'msgpackr'
import type { MESSAGE } from 'zss/device/api'

/** Interactive peer wire; books use 15 in memorycompressbooks. */
const PEER_WIRE_ZSTD_LEVEL = 4

/** Requires prior `await ensurezstdwasm()` (e.g. DataConnection open). */
export function encodepeerwire(message: MESSAGE): Uint8Array {
  return compress(pack(message), PEER_WIRE_ZSTD_LEVEL)
}

/** Requires prior `await ensurezstdwasm()`. */
export function decodepeerwire(bytes: Uint8Array): MESSAGE {
  return unpack(decompress(bytes))
}

export async function netmsgtounit8(
  data: unknown,
): Promise<Uint8Array | undefined> {
  if (data instanceof Uint8Array) {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }
  if (ArrayBuffer.isView(data)) {
    const v = data
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength)
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer())
  }
  return undefined
}

/** Wire byte length for perf counters (compressed frame or other binary). */
export function peerwirebytelength(payload: unknown): number {
  try {
    if (payload instanceof ArrayBuffer) {
      return payload.byteLength
    }
    if (ArrayBuffer.isView(payload)) {
      return payload.byteLength
    }
    if (typeof Blob !== 'undefined' && payload instanceof Blob) {
      return payload.size
    }
    if (typeof payload === 'string') {
      return new TextEncoder().encode(payload).length
    }
    return new TextEncoder().encode(JSON.stringify(payload)).length
  } catch {
    return 0
  }
}
