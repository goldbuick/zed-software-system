/**
 * Book URL compress worker: exported FORMAT_OBJECT wires → remap/trim/msgpack/zstd.
 * No hub, no device. memoryexportbook stays on the sim thread.
 */
import { FORMAT_OBJECT } from 'zss/feature/format'
import { packbookwirestourl } from 'zss/memory/packbookwires'

type CompressRequest = {
  id: string
  main?: string
  wires: FORMAT_OBJECT[]
  protectedids: string[]
}

type CompressResponse =
  | { id: string; result: string }
  | { id: string; error: string }

function iscompressrequest(data: unknown): data is CompressRequest {
  if (!data || typeof data !== 'object') {
    return false
  }
  const msg = data as CompressRequest
  return (
    typeof msg.id === 'string' &&
    Array.isArray(msg.wires) &&
    Array.isArray(msg.protectedids)
  )
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const data = event.data
  if (!iscompressrequest(data)) {
    return
  }
  const { id, main, wires, protectedids } = data
  void packbookwirestourl(main, wires, protectedids)
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
