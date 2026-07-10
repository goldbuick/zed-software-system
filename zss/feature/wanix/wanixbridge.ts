import {
  onwanixtermsessionopen,
  readattachedsession,
  resetwanixattachforidle,
  setwanixactivesession,
} from 'zss/feature/wanix/wanixattachstate'
import {
  handlewanixexportmessage,
  waitwanixexportcontentready,
} from 'zss/feature/wanix/wanixexportwait'
import { revealwanixtapeifhidden } from 'zss/feature/wanix/wanixtapevisibility'
import {
  WANIX_MSG_CELLS,
  WANIX_MSG_IDLE,
  WANIX_MSG_PARENT_RPC,
  WANIX_MSG_PARENT_RPC_RES,
  WANIX_MSG_READY,
  WANIX_MSG_RPC,
  WANIX_MSG_RPC_RES,
  WANIX_MSG_SESSION,
} from 'zss/feature/wanix/wanixrpcmessages'
import {
  applywanixtermread,
  clearwanixtermbuffers,
  registerwanixtermsessionopen,
  unregisterwanixtermsession,
} from 'zss/feature/wanix/wanixtermbuffer'
import type { WanixTermCellsSnapshot } from 'zss/feature/wanix/wanixtermgridstate'

const WANIX_RPC_TIMEOUT_MS = 30_000
const WANIX_READY_TIMEOUT_MS = 180_000
const WANIX_RPC_PING_TIMEOUT_MS = 15_000
const WANIX_RPC_PING_POLL_MS = 100

type RpcWaiter = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
}

let childwindow: Window | null = null
let childwindowwaiters: (() => void)[] = []
let rpcseq = 0
const rpcwaiters = new Map<number, RpcWaiter>()

let wanixisready = false
let readyresolve: (() => void) | null = null
let readypromise: Promise<void> | null = null

function resetready() {
  wanixisready = false
  readypromise = new Promise<void>((resolve) => {
    readyresolve = resolve
  })
}

resetready()

let onwanixsessioncloseprune: ((sessionkey: string) => void) | null = null

export function registerwanixsessioncloseprune(
  fn: (sessionkey: string) => void,
) {
  onwanixsessioncloseprune = fn
}

function handleparentmessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) {
    return
  }
  const data = event.data
  if (!data || typeof data !== 'object') {
    return
  }
  if (data.type === WANIX_MSG_READY) {
    wanixisready = true
    readyresolve?.()
    return
  }
  if (data.type === WANIX_MSG_IDLE) {
    resetready()
    clearwanixtermbuffers()
    resetwanixattachforidle()
    return
  }
  if (data.type === WANIX_MSG_CELLS) {
    const payload = data as {
      sessionkey?: unknown
      snapshot?: WanixTermCellsSnapshot
    }
    if (
      typeof payload.sessionkey === 'string' &&
      payload.snapshot &&
      typeof payload.snapshot === 'object'
    ) {
      applywanixtermread(payload.sessionkey, payload.snapshot)
    }
    return
  }
  if (data.type === WANIX_MSG_SESSION) {
    const payload = data as {
      event?: unknown
      sessionkey?: unknown
    }
    if (typeof payload.sessionkey !== 'string') {
      return
    }
    const sessionkey = payload.sessionkey
    if (payload.event === 'open') {
      registerwanixtermsessionopen(sessionkey)
      if (readattachedsession() == null) {
        revealwanixtapeifhidden()
        onwanixtermsessionopen(sessionkey)
      } else {
        setwanixactivesession(sessionkey)
      }
      return
    }
    if (payload.event === 'active') {
      setwanixactivesession(sessionkey)
      return
    }
    if (payload.event === 'close') {
      if (sessionkey === readattachedsession()) {
        return
      }
      unregisterwanixtermsession(sessionkey)
      onwanixsessioncloseprune?.(sessionkey)
      return
    }
    return
  }
  if (handlewanixexportmessage(data as Record<string, unknown>)) {
    return
  }
  if (data.type === WANIX_MSG_PARENT_RPC) {
    void handleiframeparentrpc(data as Record<string, unknown>, event.source)
    return
  }
  if (data.type !== WANIX_MSG_RPC_RES) {
    return
  }
  const id = (data as { id?: unknown }).id
  if (typeof id !== 'number') {
    return
  }
  const waiter = rpcwaiters.get(id)
  if (!waiter) {
    return
  }
  rpcwaiters.delete(id)
  const error = (data as { error?: unknown }).error
  if (typeof error === 'string' && error.length > 0) {
    waiter.reject(new Error(error))
    return
  }
  waiter.resolve((data as { result?: unknown }).result)
}

function replyiframeparentrpc(
  source: MessageEventSource | null,
  id: unknown,
  payload: Record<string, unknown>,
) {
  if (
    !source ||
    typeof id !== 'number' ||
    typeof (source as Window).postMessage !== 'function'
  ) {
    return
  }
  ;(source as Window).postMessage(
    { type: WANIX_MSG_PARENT_RPC_RES, id, ...payload },
    window.location.origin,
  )
}

async function handleiframeparentrpc(
  data: Record<string, unknown>,
  source: MessageEventSource | null,
) {
  const id = data.id
  const method = data.method
  if (typeof method !== 'string') {
    replyiframeparentrpc(source, id, { error: 'parent rpc: missing method' })
    return
  }
  try {
    if (method === 'requestzedcafestate') {
      const { SOFTWARE } = await import('zss/device/session')
      const { memoryreadoperator } = await import('zss/memory/session')
      const {
        exportfilestoguestfiles,
        readhostexportfilesasync,
      } = await import('zss/feature/wanix/wanixzedcafe')
      const files = await readhostexportfilesasync(
        SOFTWARE,
        memoryreadoperator(),
      )
      replyiframeparentrpc(source, id, {
        result: exportfilestoguestfiles(files),
      })
      return
    }
    replyiframeparentrpc(source, id, { error: `unknown parent rpc: ${method}` })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    replyiframeparentrpc(source, id, { error: detail })
  }
}

function notifychildwindow() {
  const waiters = childwindowwaiters
  childwindowwaiters = []
  for (const notify of waiters) {
    notify()
  }
}

export function waitwanixiframe(timeoutms = 30_000): Promise<Window> {
  if (childwindow) {
    return Promise.resolve(childwindow)
  }
  return new Promise<Window>((resolve, reject) => {
    const timer = setTimeout(() => {
      childwindowwaiters = childwindowwaiters.filter(
        (notify) => notify !== onload,
      )
      reject(new Error('wanix iframe not loaded'))
    }, timeoutms)
    const onload = () => {
      clearTimeout(timer)
      if (childwindow) {
        resolve(childwindow)
        return
      }
      reject(new Error('wanix iframe not loaded'))
    }
    childwindowwaiters.push(onload)
  })
}

export function bindwanixparentmessage() {
  window.addEventListener('message', handleparentmessage)
  return () => {
    window.removeEventListener('message', handleparentmessage)
  }
}

export function setwanixchildwindow(next: Window | null) {
  childwindow = next
  resetready()
  notifychildwindow()
}

export async function waitwanixrpcping(
  timeoutms = WANIX_RPC_PING_TIMEOUT_MS,
): Promise<void> {
  await waitwanixiframe(timeoutms)
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    try {
      const pong = await callwanixrpc<{ ok: boolean }>('ping', [], 2_000)
      if (pong?.ok) {
        return
      }
    } catch {
      // iframe module may still be loading
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_RPC_PING_POLL_MS),
    )
  }
  throw new Error('wanix rpc handler not ready')
}

export function waitwanixready(
  timeoutms = WANIX_READY_TIMEOUT_MS,
): Promise<void> {
  if (wanixisready) {
    return Promise.resolve()
  }
  const promise = readypromise ?? Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('wanix ready timeout'))
    }, timeoutms)
    void promise.then(
      () => {
        clearTimeout(timer)
        resolve()
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err instanceof Error ? err : new Error(String(err)))
      },
    )
  })
}

export { waitwanixexportcontentready }

export type WanixTermFitResult = {
  ok: boolean
  cols?: number
  rows?: number
  noop?: boolean
}

export async function callwanixtermfit(
  cols: number,
  rows: number,
  sessionkey?: string,
): Promise<WanixTermFitResult> {
  await waitwanixready()
  const args: unknown[] = [cols, rows]
  if (sessionkey != null && sessionkey !== '') {
    args.push(sessionkey)
  }
  return callwanixrpc<WanixTermFitResult>('termfit', args)
}

export async function callwanixtermwrite(
  data: string,
  sessionkey?: string,
): Promise<{ ok: boolean }> {
  await waitwanixready()
  const args: unknown[] = [data]
  if (sessionkey != null && sessionkey !== '') {
    args.push(sessionkey)
  }
  return callwanixrpc<{ ok: boolean }>('termwrite', args)
}

export async function callwanixrpc<T>(
  method: string,
  args?: unknown[],
  timeoutms = WANIX_RPC_TIMEOUT_MS,
): Promise<T> {
  const target = await waitwanixiframe()
  const id = ++rpcseq
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      rpcwaiters.delete(id)
      reject(new Error(`wanix rpc timeout: ${method}`))
    }, timeoutms)
    rpcwaiters.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value as T)
      },
      reject: (err) => {
        clearTimeout(timer)
        reject(err)
      },
    })
    target.postMessage(
      { type: WANIX_MSG_RPC, id, method, args },
      window.location.origin,
    )
  })
}

if (import.meta.env.DEV) {
  const g = globalThis as Record<string, unknown>
  g.waitwanixready = waitwanixready
  g.waitwanixrpcping = waitwanixrpcping
  g.callwanixrpc = callwanixrpc
}
