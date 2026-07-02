const WANIX_MSG_READY = 'zss-wanix-ready'
const WANIX_MSG_RPC = 'zss-wanix-rpc'
const WANIX_MSG_RPC_RES = 'zss-wanix-rpc-res'

const WANIX_RPC_TIMEOUT_MS = 30_000
const WANIX_READY_TIMEOUT_MS = 180_000

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

function notifychildwindow() {
  const waiters = childwindowwaiters
  childwindowwaiters = []
  for (const notify of waiters) {
    notify()
  }
}

function waitchildwindow(timeoutms = 30_000): Promise<Window> {
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

export async function callwanixrpc<T>(
  method: string,
  args?: unknown[],
  timeoutms = WANIX_RPC_TIMEOUT_MS,
): Promise<T> {
  const target = await waitchildwindow()
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
  g.callwanixrpc = callwanixrpc
}
