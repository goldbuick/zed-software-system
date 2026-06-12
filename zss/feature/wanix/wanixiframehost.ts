import type { DEVICELIKE } from 'zss/device/api'
import { normalizewanixcmd } from 'zss/feature/wanix/wanixcmd'
import {
  wanixiobridgepush,
  wanixiobridgestart,
  wanixiobridgestop,
} from 'zss/feature/wanix/wanixiobridge'
import { createsid } from 'zss/mapping/guid'

const HOST_URL = '/wanix/host.html'
const READY_TIMEOUT_MS = 120_000
const RPC_TIMEOUT_MS = 300_000

export type WANIX_HOST_STATE = 'idle' | 'starting' | 'ready' | 'stopping'

type RpcReply = {
  type: string
  id?: string
  code?: number
  error?: string
  active?: boolean
  ready?: boolean
  line?: string
}

let iframe: HTMLIFrameElement | undefined
let state: WANIX_HOST_STATE = 'idle'
let messagehandler: ((ev: MessageEvent) => void) | undefined
const pending = new Map<
  string,
  {
    resolve: (reply: RpcReply) => void
    reject: (err: Error) => void
    timer: ReturnType<typeof setTimeout>
  }
>()

function originok(origin: string) {
  return typeof window !== 'undefined' && origin === window.location.origin
}

function rejectallpending(reason: string) {
  for (const [id, entry] of pending.entries()) {
    clearTimeout(entry.timer)
    entry.reject(new Error(reason))
    pending.delete(id)
  }
}

function ensuremount(): HTMLElement {
  let mount = document.getElementById('zss-wanix-display')
  if (!mount) {
    mount = document.createElement('div')
    mount.id = 'zss-wanix-display'
    mount.style.display = 'none'
    mount.style.position = 'fixed'
    mount.style.inset = '0'
    mount.style.pointerEvents = 'none'
    document.body.appendChild(mount)
  }
  return mount
}

function wiremessages() {
  if (messagehandler) {
    return
  }
  messagehandler = (ev: MessageEvent) => {
    if (!originok(ev.origin)) {
      return
    }
    const msg = ev.data as RpcReply
    if (!msg || typeof msg.type !== 'string') {
      return
    }
    switch (msg.type) {
      case 'wanix:ready':
        if (state === 'starting') {
          state = 'ready'
        }
        break
      case 'wanix:log':
        if (typeof msg.line === 'string') {
          wanixiobridgepush(msg.line)
        }
        break
      case 'wanix:run:done':
      case 'wanix:status':
      case 'wanix:stopped': {
        const id = msg.id
        if (!id || !pending.has(id)) {
          break
        }
        const entry = pending.get(id)
        if (!entry) {
          break
        }
        clearTimeout(entry.timer)
        pending.delete(id)
        entry.resolve(msg)
        break
      }
      default:
        break
    }
  }
  window.addEventListener('message', messagehandler)
}

function unwirmessages() {
  if (!messagehandler) {
    return
  }
  window.removeEventListener('message', messagehandler)
  messagehandler = undefined
}

function postrpc(type: string, data: Record<string, unknown> = {}) {
  const id = createsid()
  const payload = { type, id, ...data }
  return new Promise<RpcReply>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`wanix rpc timeout: ${type}`))
    }, type === 'wanix:run' ? RPC_TIMEOUT_MS : READY_TIMEOUT_MS)
    pending.set(id, { resolve, reject, timer })
    const win = iframe?.contentWindow
    if (!win) {
      clearTimeout(timer)
      pending.delete(id)
      reject(new Error('wanix iframe missing'))
      return
    }
    win.postMessage(payload, window.location.origin)
  })
}

export function readwanixhoststate(): WANIX_HOST_STATE {
  return state
}

export function iswanixspaceactive(): boolean {
  return state === 'ready' || state === 'starting'
}

export async function spawnwanixspace(
  device: DEVICELIKE,
  player: string,
): Promise<void> {
  if (iswanixspaceactive()) {
    throw new Error('wanix already active')
  }
  wiremessages()
  state = 'starting'
  const mount = ensuremount()
  const frame = document.createElement('iframe')
  frame.src = HOST_URL
  frame.title = 'wanix'
  frame.style.display = 'none'
  frame.style.border = '0'
  frame.style.width = '100%'
  frame.style.height = '100%'
  mount.appendChild(frame)
  iframe = frame
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('wanix ready timeout'))
    }, READY_TIMEOUT_MS)
    const onready = (ev: MessageEvent) => {
      if (!originok(ev.origin)) {
        return
      }
      if (ev.data?.type === 'wanix:ready') {
        clearTimeout(timer)
        window.removeEventListener('message', onready)
        state = 'ready'
        wanixiobridgestart(device, player)
        resolve()
      }
    }
    window.addEventListener('message', onready)
    frame.addEventListener('error', () => {
      clearTimeout(timer)
      window.removeEventListener('message', onready)
      cleanup()
      reject(new Error('wanix iframe failed to load'))
    })
  })
}

function cleanup() {
  rejectallpending('wanix halted')
  wanixiobridgestop()
  if (iframe) {
    iframe.remove()
    iframe = undefined
  }
  state = 'idle'
}

export async function haltwanixspace(): Promise<void> {
  if (!iframe) {
    state = 'idle'
    return
  }
  state = 'stopping'
  try {
    await postrpc('wanix:stop')
  } catch {
    // iframe may already be gone
  }
  cleanup()
  unwirmessages()
}

export async function runwanixcommand(cmd: string): Promise<number> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running — use #wanix start')
  }
  const taskcmd = normalizewanixcmd(cmd)
  if (!taskcmd) {
    throw new Error('empty command')
  }
  const reply = await postrpc('wanix:run', { cmd: taskcmd })
  if (reply.error) {
    throw new Error(reply.error)
  }
  return typeof reply.code === 'number' ? reply.code : 0
}

export async function readwanixstatus(): Promise<{
  active: boolean
  ready: boolean
  state: WANIX_HOST_STATE
}> {
  if (!iframe || state !== 'ready') {
    return { active: iswanixspaceactive(), ready: false, state }
  }
  const reply = await postrpc('wanix:status')
  return {
    active: !!reply.active,
    ready: !!reply.ready,
    state,
  }
}

/** Test hook — reset module state without a live iframe. */
export function resetwanixhostfortest() {
  rejectallpending('test reset')
  wanixiobridgestop()
  if (iframe) {
    iframe.remove()
    iframe = undefined
  }
  state = 'idle'
  unwirmessages()
}
