import type { DEVICELIKE } from 'zss/device/api'
import { normalizewanixcmd } from 'zss/feature/wanix/wanixcmd'
import {
  wanixiobridgenotifystdinneed,
  wanixiobridgepush,
  wanixiobridgestart,
  wanixiobridgestop,
} from 'zss/feature/wanix/wanixiobridge'
import { createsid } from 'zss/mapping/guid'

const HOST_URL = '/wanix/host.html'
const READY_TIMEOUT_MS = 120_000
const RPC_TIMEOUT_MS = 300_000

export type WANIX_HOST_STATE = 'idle' | 'starting' | 'ready'

type RpcReply = {
  type: string
  id?: string
  code?: number
  error?: string
  active?: boolean
  ready?: boolean
  taskactive?: boolean
  tid?: string
  line?: string
  entries?: string[]
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

const RPC_DONE_TYPES = new Set([
  'wanix:run:done',
  'wanix:status',
  'wanix:put:done',
  'wanix:halt:done',
  'wanix:mount-archive:done',
  'wanix:ls:done',
  'wanix:stdin:done',
])

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
      case 'wanix:stdin:wait':
        wanixiobridgenotifystdinneed()
        break
      default:
        if (!RPC_DONE_TYPES.has(msg.type)) {
          break
        }
        {
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
        }
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

function postrpc(
  type: string,
  data: Record<string, unknown> = {},
  timeoutms = READY_TIMEOUT_MS,
) {
  const id = createsid()
  const payload = { type, id, ...data }
  return new Promise<RpcReply>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`wanix rpc timeout: ${type}`))
    }, timeoutms)
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

export async function ensurewanixsandbox(
  device: DEVICELIKE,
  player: string,
): Promise<void> {
  if (!iswanixspaceactive()) {
    await spawnwanixspace(device, player)
  }
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

export async function runwanixcommand(cmd: string): Promise<number> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running — drop a .wasm to start')
  }
  const taskcmd = normalizewanixcmd(cmd)
  if (!taskcmd) {
    throw new Error('empty command')
  }
  const reply = await postrpc('wanix:run', { cmd: taskcmd }, RPC_TIMEOUT_MS)
  if (reply.error) {
    throw new Error(reply.error)
  }
  return typeof reply.code === 'number' ? reply.code : 0
}

export async function putwanixfile(name: string, bytes: Uint8Array) {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running')
  }
  const buffer =
    bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
      ? bytes.buffer
      : bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        )
  const reply = await postrpc(
    'wanix:put',
    { name, bytes: buffer },
    RPC_TIMEOUT_MS,
  )
  if (reply.error) {
    throw new Error(reply.error)
  }
}

export async function mountwanixarchive(name: string, bytes: Uint8Array) {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running')
  }
  const buffer =
    bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
      ? bytes.buffer
      : bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        )
  const reply = await postrpc(
    'wanix:mount-archive',
    { name, bytes: buffer },
    RPC_TIMEOUT_MS,
  )
  if (reply.error) {
    throw new Error(reply.error)
  }
}

export async function listwanixdir(path: string): Promise<string[]> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running')
  }
  const reply = await postrpc('wanix:ls', { path }, RPC_TIMEOUT_MS)
  if (reply.error) {
    throw new Error(reply.error)
  }
  return Array.isArray(reply.entries) ? reply.entries.map(String) : []
}

export async function haltwanixtask(): Promise<void> {
  if (state !== 'ready' || !iframe) {
    return
  }
  const reply = await postrpc('wanix:halt', {}, RPC_TIMEOUT_MS)
  if (reply.error) {
    throw new Error(reply.error)
  }
}

export async function sendwanixstdin(line: string): Promise<void> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running')
  }
  const reply = await postrpc('wanix:stdin', { data: line }, RPC_TIMEOUT_MS)
  if (reply.error) {
    throw new Error(reply.error)
  }
}

export async function readwanixstatus(): Promise<{
  active: boolean
  ready: boolean
  state: WANIX_HOST_STATE
  taskactive?: boolean
}> {
  if (!iframe || state !== 'ready') {
    return { active: iswanixspaceactive(), ready: false, state }
  }
  const reply = await postrpc('wanix:status')
  return {
    active: !!reply.active,
    ready: !!reply.ready,
    state,
    taskactive: !!reply.taskactive,
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
