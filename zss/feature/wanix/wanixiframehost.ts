import type { DEVICELIKE } from 'zss/device/api'
import {
  makewanixtaskid,
  normalizewanixcmd,
  uniquewanixtaskid,
} from 'zss/feature/wanix/wanixcmd'
import {
  wanixiobridgepush,
  wanixiobridgepushterm,
  wanixiobridgestart,
  wanixiobridgestop,
} from 'zss/feature/wanix/wanixiobridge'
import {
  readwanixattached,
  readwanixattachedkind,
  setwanixattached,
  type WANIX_ATTACH_KIND,
} from 'zss/feature/wanix/wanixsession'
import {
  readwanixvmasseturls,
  type WANIX_VM_ASSET_URLS,
} from 'zss/feature/wanix/wanixvmassets'
import { createsid } from 'zss/mapping/guid'

const HOST_URL = '/wanix/host.html'
const READY_TIMEOUT_MS = 120_000
const RPC_TIMEOUT_MS = 300_000
const VM_PREP_TIMEOUT_MS = 600_000
const VM_RUN_TIMEOUT_MS = 600_000

export type WANIX_HOST_STATE = 'idle' | 'starting' | 'ready'

export type WANIX_BIND_ENTRY = {
  id: string
  kind: string
  dst: string
  label: string
  removable: boolean
}

export type WANIX_TASK_ENTRY = {
  id: string
  cmd: string
  rid?: string
  running: boolean
  attached: boolean
}

export type WANIX_VM_ENTRY = {
  id: string
  mem: string
  vrid?: string
  running: boolean
  attached: boolean
}

type RpcReply = {
  type: string
  id?: string
  code?: number
  error?: string
  active?: boolean
  ready?: boolean
  taskactive?: boolean
  tid?: string
  termpath?: string
  taskId?: string
  vmId?: string
  attachedTaskId?: string
  attachedId?: string
  attachedKind?: WANIX_ATTACH_KIND
  attachKind?: WANIX_ATTACH_KIND
  attachId?: string
  line?: string
  chunk?: string
  entries?: string[]
  binds?: WANIX_BIND_ENTRY[]
  tasks?: WANIX_TASK_ENTRY[]
  vms?: WANIX_VM_ENTRY[]
  bindId?: string
  removed?: string[]
  raw?: boolean
  vmactive?: boolean
  vmbindsready?: boolean
}

type TaskExitHandler = (taskid: string, code: number) => void
type VmExitHandler = (vmid: string, code: number) => void

let iframe: HTMLIFrameElement | undefined
let state: WANIX_HOST_STATE = 'idle'
let messagehandler: ((ev: MessageEvent) => void) | undefined
let taskexithandler: TaskExitHandler | undefined
let vmexithandler: VmExitHandler | undefined
const pending = new Map<
  string,
  {
    resolve: (reply: RpcReply) => void
    reject: (err: Error) => void
    timer: ReturnType<typeof setTimeout>
  }
>()
const taskwaiters = new Map<
  string,
  {
    resolve: (code: number) => void
    reject: (err: Error) => void
  }
>()
const vmwaiters = new Map<
  string,
  {
    resolve: (code: number) => void
    reject: (err: Error) => void
  }
>()

const RPC_DONE_TYPES = new Set([
  'wanix:run:done',
  'wanix:run:started',
  'wanix:status',
  'wanix:put:done',
  'wanix:halt:done',
  'wanix:vm-halt:done',
  'wanix:vm-prep:done',
  'wanix:vm-run:done',
  'wanix:vm-run:started',
  'wanix:attach:done',
  'wanix:mount-archive:done',
  'wanix:ls:done',
  'wanix:list-binds',
  'wanix:list-tasks',
  'wanix:list-vms',
  'wanix:unmount:done',
  'wanix:unmount-all:done',
  'wanix:term-write:done',
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
  for (const [, entry] of taskwaiters.entries()) {
    entry.reject(new Error(reason))
  }
  taskwaiters.clear()
  for (const [, entry] of vmwaiters.entries()) {
    entry.reject(new Error(reason))
  }
  vmwaiters.clear()
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
      case 'wanix:term-out': {
        if (typeof msg.chunk !== 'string') {
          break
        }
        const attachid = readwanixattached()
        const attachkind = readwanixattachedkind()
        const kind =
          msg.attachKind === 'vm'
            ? 'vm'
            : msg.attachKind === 'task'
              ? 'task'
              : typeof msg.taskId === 'string'
                ? 'task'
                : null
        const id =
          typeof msg.attachId === 'string'
            ? msg.attachId
            : typeof msg.taskId === 'string'
              ? msg.taskId
              : null
        if (id === attachid && kind === attachkind) {
          wanixiobridgepushterm(msg.chunk)
        }
        break
      }
      case 'wanix:attached-changed':
        if (!msg.attachedId || !msg.attachedKind) {
          setwanixattached(null, null)
        } else if (
          msg.attachedKind === 'task' ||
          msg.attachedKind === 'vm'
        ) {
          setwanixattached(msg.attachedKind, msg.attachedId)
        }
        break
      case 'wanix:task-exit': {
        const taskid = msg.taskId
        const code = msg.code
        if (typeof taskid !== 'string' || typeof code !== 'number') {
          break
        }
        const waiter = taskwaiters.get(taskid)
        if (waiter) {
          taskwaiters.delete(taskid)
          waiter.resolve(code)
        }
        taskexithandler?.(taskid, code)
        break
      }
      case 'wanix:vm-exit': {
        const vmid = msg.vmId
        const code = msg.code
        if (typeof vmid !== 'string' || typeof code !== 'number') {
          break
        }
        const waiter = vmwaiters.get(vmid)
        if (waiter) {
          vmwaiters.delete(vmid)
          waiter.resolve(code)
        }
        vmexithandler?.(vmid, code)
        break
      }
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

export function setwanixtaskexithandler(handler: TaskExitHandler | undefined) {
  taskexithandler = handler
}

export function setwanixvmexithandler(handler: VmExitHandler | undefined) {
  vmexithandler = handler
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
  taskexithandler = undefined
  vmexithandler = undefined
  wanixiobridgestop()
  if (iframe) {
    iframe.remove()
    iframe = undefined
  }
  state = 'idle'
}

export type SPAWN_WANIX_TASK_OPTS = {
  taskid?: string
  attach?: boolean
  wait?: boolean
}

export async function spawnwanixtask(
  cmd: string,
  opts: SPAWN_WANIX_TASK_OPTS = {},
): Promise<{ taskid: string; code?: number }> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running — drop a .wasm to start')
  }
  const taskcmd = normalizewanixcmd(cmd)
  if (!taskcmd) {
    throw new Error('empty command')
  }
  const taskid =
    opts.taskid ??
    uniquewanixtaskid(makewanixtaskid(taskcmd), [
      ...(await listwanixtasks()).map((task) => task.id),
    ])
  if (opts.wait) {
    const reply = await postrpc(
      'wanix:run',
      {
        cmd: taskcmd,
        taskId: taskid,
        wait: true,
        attach: opts.attach !== false,
      },
      RPC_TIMEOUT_MS,
    )
    if (reply.error) {
      throw new Error(reply.error)
    }
    return {
      taskid: typeof reply.taskId === 'string' ? reply.taskId : taskid,
      code: typeof reply.code === 'number' ? reply.code : 0,
    }
  }
  const reply = await postrpc(
    'wanix:run',
    {
      cmd: taskcmd,
      taskId: taskid,
      wait: false,
      attach: opts.attach !== false,
    },
    RPC_TIMEOUT_MS,
  )
  if (reply.error) {
    throw new Error(reply.error)
  }
  const spawned =
    typeof reply.taskId === 'string' ? reply.taskId : taskid
  if (opts.attach !== false) {
    setwanixattached('task', spawned)
  }
  return { taskid: spawned }
}

export function waitwanixtaskexit(taskid: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (taskwaiters.has(taskid)) {
      reject(new Error(`task already waiting: ${taskid}`))
      return
    }
    taskwaiters.set(taskid, { resolve, reject })
  })
}

export async function runwanixcommand(cmd: string): Promise<number> {
  const result = await spawnwanixtask(cmd, { wait: true, attach: true })
  return typeof result.code === 'number' ? result.code : 0
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

export async function mountwanixarchive(
  name: string,
  bytes: Uint8Array,
  mountdst?: string,
) {
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
    { name, bytes: buffer, mountDst: mountdst },
    RPC_TIMEOUT_MS,
  )
  if (reply.error) {
    throw new Error(reply.error)
  }
  return typeof reply.bindId === 'string' ? reply.bindId : undefined
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

export async function listwanixbinds(): Promise<WANIX_BIND_ENTRY[]> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running')
  }
  const reply = await postrpc('wanix:list-binds', {}, RPC_TIMEOUT_MS)
  if (reply.error) {
    throw new Error(reply.error)
  }
  return Array.isArray(reply.binds) ? reply.binds : []
}

export async function listwanixtasks(): Promise<WANIX_TASK_ENTRY[]> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running')
  }
  const reply = await postrpc('wanix:list-tasks', {}, RPC_TIMEOUT_MS)
  if (reply.error) {
    throw new Error(reply.error)
  }
  return Array.isArray(reply.tasks) ? reply.tasks : []
}

export async function unmountwanixbind(bindid: string): Promise<void> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running')
  }
  const reply = await postrpc('wanix:unmount', { bindId: bindid }, RPC_TIMEOUT_MS)
  if (reply.error) {
    throw new Error(reply.error)
  }
}

export async function unmountallwanixbinds(): Promise<string[]> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running')
  }
  const reply = await postrpc('wanix:unmount-all', {}, RPC_TIMEOUT_MS)
  if (reply.error) {
    throw new Error(reply.error)
  }
  return Array.isArray(reply.removed) ? reply.removed.map(String) : []
}

export async function haltwanixtask(taskid?: string): Promise<void> {
  if (state !== 'ready' || !iframe) {
    return
  }
  const reply = await postrpc(
    'wanix:halt',
    taskid ? { taskId: taskid } : {},
    RPC_TIMEOUT_MS,
  )
  if (reply.error) {
    throw new Error(reply.error)
  }
}

export async function attachwanixtarget(
  kind: WANIX_ATTACH_KIND,
  id: string,
): Promise<void> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running')
  }
  const reply = await postrpc(
    'wanix:attach',
    {
      attachKind: kind,
      attachId: id,
      taskId: kind === 'task' ? id : undefined,
      vmId: kind === 'vm' ? id : undefined,
    },
    RPC_TIMEOUT_MS,
  )
  if (reply.error) {
    throw new Error(reply.error)
  }
  setwanixattached(kind, id)
}

export async function attachwanixtask(taskid: string): Promise<void> {
  await attachwanixtarget('task', taskid)
}

export async function attachwanixvm(vmid: string): Promise<void> {
  await attachwanixtarget('vm', vmid)
}

export async function sendwanixtermwrite(
  line: string,
  opts: { raw?: boolean } = {},
): Promise<void> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running')
  }
  const raw = opts.raw === true || readwanixattachedkind() === 'vm'
  const reply = await postrpc(
    'wanix:term-write',
    { data: line, raw },
    RPC_TIMEOUT_MS,
  )
  if (reply.error) {
    throw new Error(reply.error)
  }
}

export async function prepwanixvm(
  urls: WANIX_VM_ASSET_URLS = readwanixvmasseturls(),
): Promise<void> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running')
  }
  const reply = await postrpc(
    'wanix:vm-prep',
    { urls },
    VM_PREP_TIMEOUT_MS,
  )
  if (reply.error) {
    throw new Error(reply.error)
  }
}

export type SPAWN_WANIX_VM_OPTS = {
  vmid?: string
  mem?: string
  attach?: boolean
  wait?: boolean
}

export async function spawnwanixvm(
  opts: SPAWN_WANIX_VM_OPTS = {},
): Promise<{ vmid: string; code?: number }> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running — use #wanix vm to start')
  }
  const vmid = opts.vmid
  if (opts.wait) {
    const reply = await postrpc(
      'wanix:vm-run',
      {
        vmId: vmid,
        mem: opts.mem,
        wait: true,
        attach: opts.attach !== false,
      },
      VM_RUN_TIMEOUT_MS,
    )
    if (reply.error) {
      throw new Error(reply.error)
    }
    return {
      vmid: typeof reply.vmId === 'string' ? reply.vmId : vmid ?? 'linux-vm',
      code: typeof reply.code === 'number' ? reply.code : 0,
    }
  }
  const reply = await postrpc(
    'wanix:vm-run',
    {
      vmId: vmid,
      mem: opts.mem,
      wait: false,
      attach: opts.attach !== false,
    },
    VM_RUN_TIMEOUT_MS,
  )
  if (reply.error) {
    throw new Error(reply.error)
  }
  const spawned =
    typeof reply.vmId === 'string' ? reply.vmId : vmid ?? 'linux-vm'
  if (opts.attach !== false) {
    setwanixattached('vm', spawned)
  }
  return { vmid: spawned }
}

export function waitwanixvmexit(vmid: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (vmwaiters.has(vmid)) {
      reject(new Error(`vm already waiting: ${vmid}`))
      return
    }
    vmwaiters.set(vmid, { resolve, reject })
  })
}

export async function haltwanixvm(vmid?: string): Promise<void> {
  if (state !== 'ready' || !iframe) {
    return
  }
  const reply = await postrpc(
    'wanix:vm-halt',
    vmid ? { vmId: vmid } : {},
    RPC_TIMEOUT_MS,
  )
  if (reply.error) {
    throw new Error(reply.error)
  }
}

export async function listwanixvms(): Promise<WANIX_VM_ENTRY[]> {
  if (state !== 'ready' || !iframe) {
    throw new Error('wanix not running')
  }
  const reply = await postrpc('wanix:list-vms', {}, RPC_TIMEOUT_MS)
  if (reply.error) {
    throw new Error(reply.error)
  }
  return Array.isArray(reply.vms) ? reply.vms : []
}

export async function readwanixstatus(): Promise<{
  active: boolean
  ready: boolean
  state: WANIX_HOST_STATE
  taskactive?: boolean
  vmactive?: boolean
  vmbindsready?: boolean
  attachedId?: string
  attachedKind?: WANIX_ATTACH_KIND
  attachedTaskId?: string
  tasks?: WANIX_TASK_ENTRY[]
  vms?: WANIX_VM_ENTRY[]
  binds?: WANIX_BIND_ENTRY[]
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
    vmactive: !!reply.vmactive,
    vmbindsready: !!reply.vmbindsready,
    attachedId:
      typeof reply.attachedId === 'string' ? reply.attachedId : undefined,
    attachedKind:
      reply.attachedKind === 'task' || reply.attachedKind === 'vm'
        ? reply.attachedKind
        : undefined,
    attachedTaskId:
      typeof reply.attachedTaskId === 'string'
        ? reply.attachedTaskId
        : undefined,
    tasks: Array.isArray(reply.tasks) ? reply.tasks : undefined,
    vms: Array.isArray(reply.vms) ? reply.vms : undefined,
    binds: Array.isArray(reply.binds) ? reply.binds : undefined,
  }
}

/** Test hook — reset module state without a live iframe. */
export function resetwanixhostfortest() {
  rejectallpending('test reset')
  taskexithandler = undefined
  vmexithandler = undefined
  wanixiobridgestop()
  if (iframe) {
    iframe.remove()
    iframe = undefined
  }
  state = 'idle'
  unwirmessages()
}
