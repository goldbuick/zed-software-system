/**
 * Sim-owned client for the single-purpose compressspace worker.
 * Lazy spawn; structuredClone POD envelope in; result string out.
 */
import { compressbookspodenvelope } from 'zss/memory/bookcompresspod'
import type {
  BOOK_COMPRESS_MODE,
  MEMORY_BOOKS_POD_ENVELOPE,
} from 'zss/memory/bookcompresspod'

import CompressWorker from './compressspace??worker'

type Pending = {
  resolve: (value: string) => void
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

function ensurecompressworker(): Worker | undefined {
  if (worker) {
    return worker
  }
  if (workerfailed || typeof Worker === 'undefined') {
    return undefined
  }
  try {
    worker = new CompressWorker({ name: 'compress' })
    attachcompressworkerhandlers(worker)
    return worker
  } catch {
    workerfailed = true
    worker = undefined
    return undefined
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

/**
 * Off-thread POD compress. Falls back in-process if Worker cannot start.
 */
export async function compressbookspodenvelopeoffthread(
  envelope: MEMORY_BOOKS_POD_ENVELOPE,
  mode: BOOK_COMPRESS_MODE,
): Promise<string> {
  const w = ensurecompressworker()
  if (!w) {
    return compressbookspodenvelope(envelope, mode)
  }
  const id = `c${++nextid}`
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    try {
      w.postMessage({ id, envelope, mode })
    } catch {
      pending.delete(id)
      void compressbookspodenvelope(envelope, mode).then(resolve, reject)
    }
  })
}
