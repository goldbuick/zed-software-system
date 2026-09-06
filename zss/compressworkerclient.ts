/**
 * Sim-owned client for the single-purpose compressspace worker.
 * Lazy spawn; transferable ArrayBuffer in; base64url out.
 */
import CompressWorker from './compressspace??worker'
import { bookzstdcompressbase64url } from 'zss/memory/bookzstd'

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
      base64url?: string
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
    if (typeof data.base64url === 'string') {
      wait.resolve(data.base64url)
      return
    }
    wait.reject(new Error('compress worker response missing base64url'))
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

function transferablepackbuffer(bin: Uint8Array): ArrayBuffer {
  if (
    bin.byteOffset === 0 &&
    bin.byteLength === bin.buffer.byteLength &&
    bin.buffer instanceof ArrayBuffer
  ) {
    return bin.buffer
  }
  return bin.buffer.slice(
    bin.byteOffset,
    bin.byteOffset + bin.byteLength,
  ) as ArrayBuffer
}

/**
 * Off-thread zstd+base64url. Falls back in-process if Worker cannot start.
 */
export async function compresspackedbooksoffthread(
  bin: Uint8Array,
): Promise<string> {
  const w = ensurecompressworker()
  if (!w) {
    return bookzstdcompressbase64url(bin)
  }
  const id = `c${++nextid}`
  const copy = transferablepackbuffer(bin)
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    try {
      w.postMessage({ id, bin: copy }, [copy])
    } catch {
      pending.delete(id)
      void bookzstdcompressbase64url(bin).then(resolve, reject)
    }
  })
}
