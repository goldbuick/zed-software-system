import { createmessage } from 'zss/device'
import { type MESSAGE, ismessage } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { isdevbuild } from 'zss/feature/devbuild'
import { awaitwanixreply } from 'zss/feature/wanix/wanixdeviceclient'
import {
  WANIX_MSG_IDLE,
  WANIX_MSG_READY,
} from 'zss/feature/wanix/wanixrpcmessages'

import {
  registerwanixsessioncloseprune as registersessioncloseprune,
  resetwanixattachforidle,
} from './wanixdisplay'
import { handlewanixexportmessage } from './wanixexportwait'
import { clearwanixtermbuffers } from './wanixtermbuffer'

const WANIX_RPC_TIMEOUT_MS = 30_000
const WANIX_READY_TIMEOUT_MS = 180_000
const WANIX_RPC_PING_TIMEOUT_MS = 15_000
const WANIX_RPC_PING_POLL_MS = 100

const WANIX_BRIDGE_STATE_KEY = '__zss_wanix_bridge_state__'

type WanixBridgeState = {
  childwindow: Window | null
  childwindowwaiters: (() => void)[]
  wanixisready: boolean
  readyresolve: (() => void) | null
  readypromise: Promise<void> | null
}

function readbridgestate(): WanixBridgeState {
  const g = globalThis as Record<string, unknown>
  let state = g[WANIX_BRIDGE_STATE_KEY] as WanixBridgeState | undefined
  if (!state) {
    state = {
      childwindow: null,
      childwindowwaiters: [],
      wanixisready: false,
      readyresolve: null,
      readypromise: null,
    }
    g[WANIX_BRIDGE_STATE_KEY] = state
    state.readypromise = new Promise<void>((resolve) => {
      state!.readyresolve = resolve
    })
  }
  return state
}

function resetready() {
  const state = readbridgestate()
  state.wanixisready = false
  state.readypromise = new Promise<void>((resolve) => {
    state.readyresolve = resolve
  })
}

let deliverwanixmessage: ((message: MESSAGE) => void) | null = null

export function registerwanixsessioncloseprune(
  fn: (sessionkey: string) => void,
) {
  registersessioncloseprune(fn)
}

export function setwanixmessagedeliver(
  fn: ((message: MESSAGE) => void) | null,
) {
  deliverwanixmessage = fn
}

export function postmessagetowanixiframe(message: MESSAGE): boolean {
  const { childwindow } = readbridgestate()
  if (!childwindow) {
    return false
  }
  childwindow.postMessage(message, window.location.origin)
  return true
}

export function postreadytowanixiframe(): void {
  const session = SOFTWARE.session()
  const { childwindow } = readbridgestate()
  if (!session || !childwindow) {
    return
  }
  childwindow.postMessage(
    createmessage(session, '', 'platform', 'ready', undefined),
    window.location.origin,
  )
}

function handleparentmessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) {
    return
  }
  const data = event.data
  if (!data || typeof data !== 'object') {
    return
  }
  if (ismessage(data)) {
    deliverwanixmessage?.(data)
    return
  }
  const state = readbridgestate()
  if (data.type === WANIX_MSG_READY) {
    state.wanixisready = true
    state.readyresolve?.()
    return
  }
  if (data.type === WANIX_MSG_IDLE) {
    resetready()
    clearwanixtermbuffers()
    resetwanixattachforidle()
    return
  }
  if (handlewanixexportmessage(data as Record<string, unknown>)) {
    return
  }
}

function notifychildwindow() {
  const state = readbridgestate()
  const waiters = state.childwindowwaiters
  state.childwindowwaiters = []
  for (const notify of waiters) {
    notify()
  }
}

export function waitwanixiframe(timeoutms = 30_000): Promise<Window> {
  const state = readbridgestate()
  if (state.childwindow) {
    return Promise.resolve(state.childwindow)
  }
  return new Promise<Window>((resolve, reject) => {
    const timer = setTimeout(() => {
      const current = readbridgestate()
      current.childwindowwaiters = current.childwindowwaiters.filter(
        (notify) => notify !== onready,
      )
      reject(new Error('wanix iframe not loaded'))
    }, timeoutms)
    // Only resolve when a window is bound. A null bind must not reject waiters.
    const onready = () => {
      const current = readbridgestate()
      if (!current.childwindow) {
        return
      }
      clearTimeout(timer)
      current.childwindowwaiters = current.childwindowwaiters.filter(
        (notify) => notify !== onready,
      )
      resolve(current.childwindow)
    }
    state.childwindowwaiters.push(onready)
    if (state.childwindow) {
      onready()
    }
  })
}

export function bindwanixparentmessage() {
  window.addEventListener('message', handleparentmessage)
  return () => {
    window.removeEventListener('message', handleparentmessage)
  }
}

export function setwanixchildwindow(next: Window | null) {
  const state = readbridgestate()
  state.childwindow = next
  resetready()
  if (next) {
    notifychildwindow()
    postreadytowanixiframe()
  }
}

/** Clear only if the singleton still points at this iframe window (HMR-safe). */
export function clearwanixchildwindowifcurrent(expected: Window | null) {
  const state = readbridgestate()
  if (expected && state.childwindow === expected) {
    state.childwindow = null
    resetready()
  }
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
  const state = readbridgestate()
  if (state.wanixisready) {
    return Promise.resolve()
  }
  const promise = state.readypromise ?? Promise.resolve()
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
  await waitwanixiframe()
  postreadytowanixiframe()
  return awaitwanixreply<T>(registerreadplayer(), method, args, timeoutms)
}

if (isdevbuild()) {
  const g = globalThis as Record<string, unknown>
  g.waitwanixready = waitwanixready
  g.waitwanixrpcping = waitwanixrpcping
  g.callwanixrpc = callwanixrpc
}
