/** Shared postMessage RPC helpers — parent iframe host + child controller. */

export const WANIX_IFRAME_RPC_TIMEOUT_MS = 600_000
export const WANIX_IFRAME_CHILD_RPC_RES = 'zss-wanix-term-rpc-res' as const
export const WANIX_PROBE_RPC_RES = 'zss-wanix-term-probe-rpc-res' as const

export type WanixIframeRpcMethod =
  | 'prepvm'
  | 'preptask'
  | 'spawnvm'
  | 'spawntask'
  | 'haltvm'
  | 'halttask'
  | 'putfile'
  | 'listdir'
  | 'mountarchive'
  | 'dommount'
  | 'teardown'

export type WanixRpcMsgType = 'zss-wanix-term-rpc' | 'zss-wanix-term-probe-rpc'

export type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

export function createdeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export function replychildrpc(
  source: MessageEventSource | null,
  id: number,
  payload: { result?: unknown; error?: string },
) {
  if (!source || typeof (source as Window).postMessage !== 'function') {
    return
  }
  ;(source as Window).postMessage(
    { type: WANIX_IFRAME_CHILD_RPC_RES, id, ...payload },
    window.location.origin,
  )
}

export type ParentRpcWaiters = Map<
  number,
  { resolve: (value: unknown) => void; reject: (err: Error) => void }
>

export function resolveparentrpc(
  waiters: ParentRpcWaiters,
  id: number,
  result: unknown,
) {
  const waiter = waiters.get(id)
  if (!waiter) {
    return
  }
  waiters.delete(id)
  waiter.resolve(result)
}

export function rejectparentrpc(
  waiters: ParentRpcWaiters,
  id: number,
  error: string,
) {
  const waiter = waiters.get(id)
  if (!waiter) {
    return
  }
  waiters.delete(id)
  waiter.reject(new Error(error))
}

export async function callchildrpc<T>(opts: {
  target: Window
  msgtype: WanixRpcMsgType
  method: string
  args?: unknown[]
  timeoutms: number
  nextid: () => number
  waiters: ParentRpcWaiters
  label: string
}): Promise<T> {
  const id = opts.nextid()
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      opts.waiters.delete(id)
      reject(new Error(`wanix term ${opts.label} rpc timeout: ${opts.method}`))
    }, opts.timeoutms)
    opts.waiters.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value as T)
      },
      reject: (err) => {
        clearTimeout(timer)
        reject(err)
      },
    })
    opts.target.postMessage(
      { type: opts.msgtype, id, method: opts.method, args: opts.args ?? [] },
      window.location.origin,
    )
  })
}
