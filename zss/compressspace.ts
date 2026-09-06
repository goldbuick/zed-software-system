/**
 * Single-purpose book URL compress worker: zstd + base64url only.
 * No hub, no device. Request/response: { id, bin } -> { id, base64url } | { id, error }.
 */
import { bookzstdcompressbase64url } from 'zss/memory/bookzstd'

type CompressRequest = {
  id: string
  bin: ArrayBuffer
}

type CompressResponse =
  | { id: string; base64url: string }
  | { id: string; error: string }

function iscompressrequest(data: unknown): data is CompressRequest {
  if (!data || typeof data !== 'object') {
    return false
  }
  const msg = data as CompressRequest
  return typeof msg.id === 'string' && msg.bin instanceof ArrayBuffer
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const data = event.data
  if (!iscompressrequest(data)) {
    return
  }
  const { id, bin } = data
  void bookzstdcompressbase64url(new Uint8Array(bin))
    .then((base64url) => {
      const response: CompressResponse = { id, base64url }
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
