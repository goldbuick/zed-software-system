/**
 * Shared zstd level + in-process pack payload → base64url for book URL saves.
 * Used by sim (fallback) and compressspace worker (off-thread).
 */
import { compress } from '@bokuweb/zstd-wasm'
import { ensurezstdwasm } from 'zss/feature/zstdwasm'
import {
  arraybuffertobase64,
  base64tobase64url,
} from 'zss/mapping/encode'

/** zstd level for URL book payloads (measured: 19 vs 15 ~0.8%, 22 triples CPU). */
export const BOOK_ZSTD_LEVEL = 19

/** Sync zstd + base64url after wasm init. Same bytes on sim or compress worker. */
export async function bookzstdcompressbase64url(
  bin: Uint8Array,
): Promise<string> {
  await ensurezstdwasm()
  const binsquash = compress(bin, BOOK_ZSTD_LEVEL)
  const bytes =
    binsquash instanceof Uint8Array
      ? binsquash
      : new Uint8Array(binsquash as ArrayBuffer)
  return base64tobase64url(
    arraybuffertobase64(
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
    ),
  )
}
