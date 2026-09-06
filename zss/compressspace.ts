/**
 * Single-purpose book URL compress worker: POD envelope → json or zstd+base64url.
 * No hub, no device.
 */
import { compressbookspodenvelope } from 'zss/memory/bookcompresspod'
import type {
  BOOK_COMPRESS_MODE,
  MEMORY_BOOKS_POD_ENVELOPE,
} from 'zss/memory/bookcompresspod'

type CompressRequest = {
  id: string
  envelope: MEMORY_BOOKS_POD_ENVELOPE
  mode: BOOK_COMPRESS_MODE
}

type CompressResponse =
  | { id: string; result: string }
  | { id: string; error: string }

function iscompressmode(value: unknown): value is BOOK_COMPRESS_MODE {
  return value === 'json' || value === 'zstd'
}

function iscompressrequest(data: unknown): data is CompressRequest {
  if (!data || typeof data !== 'object') {
    return false
  }
  const msg = data as CompressRequest
  if (typeof msg.id !== 'string' || !iscompressmode(msg.mode)) {
    return false
  }
  const envelope = msg.envelope
  if (!envelope || typeof envelope !== 'object') {
    return false
  }
  return Array.isArray(envelope.books)
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const data = event.data
  if (!iscompressrequest(data)) {
    return
  }
  const { id, envelope, mode } = data
  void compressbookspodenvelope(envelope, mode)
    .then((result) => {
      const response: CompressResponse = { id, result }
      self.postMessage(response)
    })
    .catch((err: unknown) => {
      const response: CompressResponse = {
        id,
        error: err instanceof Error ? err.message : String(err),
      }
      self.postMessage(response)
    })
}
