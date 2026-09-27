/**
 * Sim-owned client for the compressspace worker.
 * Serialize posts a book snapshot and returns a base64url string.
 * Deserialize posts a base64 string and returns a book snapshot.
 * If the worker cannot start or postMessage fails, the call throws.
 */
import type { MEMORY_BOOKS_BUNDLE } from 'zss/memory/memorysnapshotio'

import CompressWorker from './compressspace??worker'

type WorkerResult = string | MEMORY_BOOKS_BUNDLE

type Pending = {
  resolve: (value: WorkerResult) => void
  reject: (reason: Error) => void
}

let worker: Worker | undefined
let nextid = 0
const pending = new Map<string, Pending>()
let workerfailed = false

function attachcompressworkerhandlers(w: Worker) {
  w.onmessage = (event: MessageEvent) => {
    const data = event.data as {
      id?: string
      result?: string
      snapshot?: MEMORY_BOOKS_BUNDLE
      error?: string
    }
    if (typeof data?.id !== 'string') {
      return
    }
    const wait = pending.get(data.id)
    if (!wait) {
      return
    }
    pending.delete(data.id)
    if (typeof data.error === 'string') {
      wait.reject(new Error(data.error))
      return
    }
    if (typeof data.result === 'string') {
      wait.resolve(data.result)
      return
    }
    if (data.snapshot && Array.isArray(data.snapshot.books)) {
      wait.resolve(data.snapshot)
      return
    }
    wait.reject(new Error('compress worker response missing result'))
  }
  w.onerror = (event: ErrorEvent) => {
    workerfailed = true
    const err = new Error(event.message || 'compress worker error')
    for (const wait of pending.values()) {
      wait.reject(err)
    }
    pending.clear()
    haltcompressworker()
  }
}

function ensurecompressworker(): Worker {
  if (worker) {
    return worker
  }
  if (workerfailed || typeof Worker === 'undefined') {
    throw new Error('compress worker unavailable')
  }
  try {
    worker = new CompressWorker({ name: 'compress' })
    attachcompressworkerhandlers(worker)
    return worker
  } catch (err) {
    workerfailed = true
    worker = undefined
    if (err instanceof Error) {
      throw err
    }
    throw new Error('compress worker unavailable')
  }
}

/** Tear down nested compress worker (optional; sim terminate also kills it). */
export function haltcompressworker() {
  if (worker) {
    worker.terminate()
    worker = undefined
  }
  for (const wait of pending.values()) {
    wait.reject(new Error('compress worker halted'))
  }
  pending.clear()
}

function postcompressworker(
  message: {
    id: string
    op: 'serialize'
    snapshot: MEMORY_BOOKS_BUNDLE
    json?: boolean
  } | {
    id: string
    op: 'deserialize'
    data: string
  },
): Promise<WorkerResult> {
  const w = ensurecompressworker()
  return new Promise<WorkerResult>((resolve, reject) => {
    pending.set(message.id, { resolve, reject })
    try {
      w.postMessage(message)
    } catch (err) {
      pending.delete(message.id)
      reject(
        err instanceof Error ? err : new Error('compress worker post failed'),
      )
    }
  })
}

/** Off-thread serialize of a book snapshot. Throws if the worker cannot run. */
export async function serializesnapshotoffthread(
  snapshot: MEMORY_BOOKS_BUNDLE,
  json = false,
): Promise<string> {
  const id = `c${++nextid}`
  const result = await postcompressworker({
    id,
    op: 'serialize',
    snapshot,
    json,
  })
  if (typeof result !== 'string') {
    throw new Error('compress worker serialize missing result')
  }
  return result
}

/** Off-thread deserialize of a base64 save string. Throws if the worker cannot run. */
export async function deserializesnapshotoffthread(
  data: string,
): Promise<MEMORY_BOOKS_BUNDLE> {
  const id = `c${++nextid}`
  const result = await postcompressworker({ id, op: 'deserialize', data })
  if (typeof result === 'string' || !result || !Array.isArray(result.books)) {
    throw new Error('compress worker deserialize missing snapshot')
  }
  return result
}
