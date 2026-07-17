import { createmessage } from 'zss/device'
import { SOFTWARE } from 'zss/device/session'
import type { MESSAGE } from 'zss/device/types'
import { ismessage } from 'zss/device/types'
import {
  type WanixReadyCallback,
  readbridgestate,
  iswanixready as readwanixreadyflag,
  registerwanixsessioncloseprune as registersessioncloseprune,
  resetwanixattachforidle,
  setwanixreadyflag,
} from 'zss/device/wanixclient/state'
import { clearwanixtermbuffers } from 'zss/device/wanixclient/wanixtermbuffer'
import { isdevbuild } from 'zss/feature/devbuild'

function resetready() {
  setwanixreadyflag(false)
}

function notifyreadylisteners() {
  const state = readbridgestate()
  const listeners = state.readylisteners
  state.readylisteners = []
  for (const cb of listeners) {
    cb()
  }
}

export function iswanixready(): boolean {
  return readwanixreadyflag()
}

/** Register a one-shot callback when iframe becomes ready (not a Promise API). */
export function onwanixready(cb: WanixReadyCallback): void {
  if (readwanixreadyflag()) {
    cb()
    return
  }
  readbridgestate().readylisteners.push(cb)
}

export function markwanixready(): void {
  setwanixreadyflag(true)
  notifyreadylisteners()
}

/** Clear ready without tearing down term UI — hard remount invalidates system.isReady. */
export function invalidatewanixready(): void {
  resetready()
}

export function markwanixidle(): void {
  resetready()
  clearwanixtermbuffers()
  resetwanixattachforidle()
  void import('zss/device/wanixclient/wanixzedsync').then((mod) => {
    if (mod.iszedsyncreadywaitpending()) {
      mod.cancelzedsyncreadywait('wanix idle')
    }
  })
}

export function registerwanixsessioncloseprune(
  fn: (sessionkey: string) => void,
) {
  registersessioncloseprune(fn)
}

export function setwanixmessagedeliver(
  fn: ((message: MESSAGE) => void) | null,
) {
  readbridgestate().deliverwanixmessage = fn
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
    readbridgestate().deliverwanixmessage?.(data)
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

if (isdevbuild()) {
  const g = globalThis as Record<string, unknown>
  g.iswanixready = iswanixready
  g.onwanixready = onwanixready
}
