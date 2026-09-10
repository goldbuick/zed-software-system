/**
 * Single-purpose book URL compress worker: packed msgpack bytes → zstd+base64url.
 * No hub, no device. Export + id remap stay on the sim thread.
 */
import { bookzstdcompressbase64url } from 'zss/memory/bookzstd'

type CompressRequest = {
  id: string
  bytes: ArrayBuffer
}

type CompressResponse =
  | { id: string; result: string }
  | { id: string; error: string }

function iscompressrequest(data: unknown): data is CompressRequest {
  if (!data || typeof data !== 'object') {
    return false
  }
  const msg = data as CompressRequest
  return typeof msg.id === 'string' && msg.bytes instanceof ArrayBuffer
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const data = event.data
  if (!iscompressrequest(data)) {
    return
  }
  const { id, bytes } = data
  void bookzstdcompressbase64url(new Uint8Array(bytes))
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
