/**
 * Book snapshot worker.
 * Serialize: MEMORY_BOOKS_BUNDLE in, base64url (or climode JSON) out.
 * Deserialize: base64 string in, MEMORY_BOOKS_BUNDLE out.
 */
import {
  type MEMORY_BOOKS_BUNDLE,
  memorydeserializesnapshot,
  memoryserializesnapshot,
} from 'zss/memory/memorysnapshotio'

type SerializeRequest = {
  id: string
  op: 'serialize'
  snapshot: MEMORY_BOOKS_BUNDLE
  json?: boolean
}

type DeserializeRequest = {
  id: string
  op: 'deserialize'
  data: string
}

type SnapshotRequest = SerializeRequest | DeserializeRequest

type SnapshotResponse =
  | { id: string; result: string }
  | { id: string; snapshot: MEMORY_BOOKS_BUNDLE }
  | { id: string; error: string }

function isserializerequest(data: unknown): data is SerializeRequest {
  if (!data || typeof data !== 'object') {
    return false
  }
  const msg = data as SerializeRequest
  return (
    msg.op === 'serialize' &&
    typeof msg.id === 'string' &&
    !!msg.snapshot &&
    Array.isArray(msg.snapshot.books)
  )
}

function isdeserializerequest(data: unknown): data is DeserializeRequest {
  if (!data || typeof data !== 'object') {
    return false
  }
  const msg = data as DeserializeRequest
  return (
    msg.op === 'deserialize' &&
    typeof msg.id === 'string' &&
    typeof msg.data === 'string'
  )
}

function issnapshotrequest(data: unknown): data is SnapshotRequest {
  return isserializerequest(data) || isdeserializerequest(data)
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const data = event.data
  if (!issnapshotrequest(data)) {
    return
  }
  const pending = isserializerequest(data)
    ? memoryserializesnapshot(data.snapshot, data.json === true).then(
        (result) => {
          const response: SnapshotResponse = { id: data.id, result }
          return response
        },
      )
    : memorydeserializesnapshot(data.data).then((snapshot) => {
        const response: SnapshotResponse = { id: data.id, snapshot }
        return response
      })
  void pending
    .then((response) => {
      self.postMessage(response)
    })
    .catch((err: unknown) => {
      const response: SnapshotResponse = {
        id: data.id,
        error: err instanceof Error ? err.message : String(err),
      }
      self.postMessage(response)
    })
}
