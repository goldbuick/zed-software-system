/**
 * Sim-owned client for the single-purpose compressspace worker.
 * Lazy spawn; transferable packed bytes in; base64url string out.
 */
import { bookzstdcompressbase64url } from 'zss/memory/bookzstd'

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

function copytoarraybuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

/**
 * Off-thread zstd of already-packed book bytes. Falls back in-process if
 * Worker cannot start.
 */
export async function compressbookbytesoffthread(
  bytes: Uint8Array,
): Promise<string> {
  const w = ensurecompressworker()
  if (!w) {
    return bookzstdcompressbase64url(bytes)
  }
  const id = `c${++nextid}`
  const buffer = copytoarraybuffer(bytes)
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    try {
      w.postMessage({ id, bytes: buffer }, [buffer])
    } catch {
      pending.delete(id)
      void bookzstdcompressbase64url(bytes).then(resolve, reject)
    }
  })
}
