/**
 * In-page Wanix host (0.4 `<wanix-system>` API).
 *
 * Upstream recipes (tractordev/wanix main — not wanix.run v0.3 bundles):
 * - Tasks: `#ramfs` boot (`bootwanixsystem`) + `<wanix-task type="wasi" term>`
 * - VM: `basic-vm.html` binds before first ready (`spawnwanixvmspace` / `bootwanixsystemforvm`)
 * - Term: `#…/term/data` via tile bridge (replaces `<wanix-term>`)
 */
import type { DEVICELIKE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import {
  makewanixtaskid,
  normalizewanixcmd,
  uniquewanixtaskid,
} from 'zss/feature/wanix/wanixcmd'
import {
  iframechildlistdir,
  iframechildmountarchive,
  iframechildputfile,
  iframehaltvm,
  iframehalttask,
  iframepreptaskspace,
  iframeprepvmspace,
  iframespawnvm,
  iframespawntask,
  iframeterminput,
  iframetermline,
  iswanixtermiframeactive,
  iswanixtermiframemode,
  readwanixtermiframelayout,
  readwanixtermiframserial,
  readwanixtermiframepreperror,
  readwanixtermiframeprepstage,
  registervmtermiframehooks,
  teardownwanixtermiframe,
} from 'zss/feature/wanix/wanixtermiframehost'
import {
  wanixiobridgepush,
  wanixiobridgestart,
  wanixiobridgestop,
} from 'zss/feature/wanix/wanixiobridge'
import {
  readwanixattached,
  readwanixattachedkind,
  readwanixtasks,
  registervm,
  setwanixattached,
  type WANIX_ATTACH_KIND,
} from 'zss/feature/wanix/wanixsession'
import {
  enterwanixattachedterminal,
  leavewanixattachedterminal,
  readterminalmodeattached,
} from 'zss/feature/wanix/wanixterminalmode'
import { wanixtermscreenwrite } from 'zss/feature/wanix/wanixtermscreen'
import { wanixtrace } from 'zss/feature/wanix/wanixtrace'
import {
  applywanixsystemkernelattrs,
  buildwanixvmprehtml,
  DEFAULT_WANIX_VM_ID,
  DEFAULT_WANIX_VM_MEM,
  readwanixkernelwasmurl,
  readwanixruntimeurls,
  readwanixvmasseturls,
  type WANIX_VM_ASSET_URLS,
} from 'zss/feature/wanix/wanixvmassets'

const { js: WANIX_JS_URL } = readwanixruntimeurls()
const DATA_WAIT_MS = 30_000
const BIND_MOUNT_TIMEOUT_MS = 120_000
const VM_TERM_WAIT_MS = 60_000
const VM_SPAWN_STEP_MS = 120_000
const VM_TERM_READY_MS = 90_000
const VM_PREP_WAIT_MS = 180_000
const VM_V86_DRIVER_PATH = '#vm/v86/v86-vm.wasm'
const VM_LAYOUT_RELOAD_KEY = 'zss-wanix-vm-layout-reload'
const READY_TIMEOUT_MS = 120_000
const WASM_PANIC_RE = /unreachable|panic|arg 0 is not/i

export type WANIX_VM_PREP_STAGE =
  | 'idle'
  | 'mounting'
  | 'mount_ok'
  | 'spawn'
  | 'serial'
  | 'failed'

let vmprepstage: WANIX_VM_PREP_STAGE = 'idle'
let vmpreperror: string | undefined
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

type WanixRoot = {
  waitFor(path: string, ms: number): Promise<void>
  openReadable(path: string): Promise<ReadableStream<Uint8Array>>
  openWritable(path: string): Promise<WritableStream<Uint8Array>>
  writeFile(path: string, data: Uint8Array | string): Promise<void>
  readText(path: string): Promise<string>
  readDir(path: string): Promise<string[]>
}

type WanixSystemElement = HTMLElement & {
  root: WanixRoot
  _setupNamespace(id: string, path: string, binds: Element[]): Promise<void>
}

type WanixTaskElement = HTMLElement & {
  rid: string
  allocate(): Promise<void>
  start(): Promise<void>
}

type WanixVmElement = HTMLElement & {
  rid: string
  term?: string
  task: { rid: string }
  allocate(): Promise<void>
  start(): Promise<void>
}

type BindEntry = {
  el: Element
  id: string
  kind: string
  dst: string
  label: string
  removable: boolean
}

type WanixTermElement = HTMLElement & {
  path?: string
  connect(): Promise<void>
  disconnect(): void
  _term?: {
    write: (data: string | Uint8Array, callback?: () => void) => void
    input: (data: string) => void
  }
}

type TermTargetEntry = {
  el: HTMLElement
  id: string
  cmd?: string
  mem?: string
  rid: string | null
  vrid: string | null
  innertaskrid: string | null
  termpath: string | null
  termridpath: string | null
  termaliaspath: string | null
  termdatapath: string | null
  termwriter: WritableStreamDefaultWriter<Uint8Array> | null
  termreading: Promise<void> | null
  /** VM only — upstream `<wanix-term raw>` owns the duplex pipe (basic-vm.html). */
  wanixtermel: WanixTermElement | null
  wanixtermunwire: (() => void) | null
  serialbuffer: string
  autotiletriggered: boolean
  /** Strip one serial echo of the last submitted line (local tile already echoed). */
  pendingvmline: string | null
  exitpoll: Promise<number> | null
}

type TaskExitHandler = (taskid: string, code: number) => void
type VmExitHandler = (vmid: string, code: number) => void

let state: WANIX_HOST_STATE = 'idle'
let wanixscriptloaded = false
let wanixloadpromise: Promise<void> | null = null

function waitforwanixscriptel(script: HTMLScriptElement): Promise<void> {
  if (wanixscriptloaded || customElements.get('wanix-system')) {
    wanixscriptloaded = true
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const done = () => {
      wanixscriptloaded = true
      resolve()
    }
    if (script.dataset.zssWanixLoaded === '1') {
      done()
      return
    }
    script.addEventListener(
      'load',
      () => {
        script.dataset.zssWanixLoaded = '1'
        done()
      },
      { once: true },
    )
    script.addEventListener(
      'error',
      () => reject(new Error('wanix.min.js failed to load')),
      { once: true },
    )
  })
}

async function ensurewanixruntime() {
  if (iswanixtermiframemode()) {
    return
  }
  if (wanixscriptloaded || customElements.get('wanix-system')) {
    wanixscriptloaded = true
    return
  }
  if (wanixloadpromise) {
    await wanixloadpromise
    return
  }
  wanixloadpromise = Promise.race([
    (async () => {
      const existing = document.querySelector(
        'script[src*="wanix.min.js"]',
      ) as HTMLScriptElement | null
      if (existing) {
        await waitforwanixscriptel(existing)
        return
      }
      const script = document.createElement('script')
      script.type = 'module'
      script.src = WANIX_JS_URL
      document.head.appendChild(script)
      await waitforwanixscriptel(script)
    })(),
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('wanix.min.js load timeout (30s)')),
        30_000,
      )
    }),
  ])
  await wanixloadpromise
}
let sys: WanixSystemElement | null = null
let root: WanixRoot | null = null
let active = false
let bindseq = 0
let termwritechain: Promise<void> = Promise.resolve()
let terminputchain: Promise<void> = Promise.resolve()
/** Serializes term/data read handling vs writes (gojs duplex mux is not re-entrant). */
let termduplexchain: Promise<void> = Promise.resolve()
let termencoder: TextEncoder | undefined

function chaintermduplex<T>(fn: () => Promise<T>): Promise<T> {
  const job = termduplexchain.then(fn, fn)
  termduplexchain = job.then(
    () => {},
    () => {},
  )
  return job
}

async function writetermpayload(payload: Uint8Array) {
  await chaintermduplex(async () => {
    const writer = await getattachedtermwriter()
    await Promise.race([
      writer.write(payload),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('wanix term write timeout (30s)')),
          30_000,
        )
      }),
    ])
  })
}

function gettermencoder(): TextEncoder {
  if (typeof TextEncoder !== 'undefined') {
    termencoder ??= new TextEncoder()
    return termencoder
  }
  return {
    encode(value: string) {
      const out = new Uint8Array(value.length)
      for (let i = 0; i < value.length; i++) {
        out[i] = value.charCodeAt(i)
      }
      return out
    },
  } as TextEncoder
}

let taskexithandler: TaskExitHandler | undefined
let vmexithandler: VmExitHandler | undefined

const taskwaiters = new Map<
  string,
  { resolve: (code: number) => void; reject: (err: Error) => void }
>()
const vmwaiters = new Map<
  string,
  { resolve: (code: number) => void; reject: (err: Error) => void }
>()

const registry = {
  binds: [] as BindEntry[],
  tasks: new Map<string, TermTargetEntry>(),
  vms: new Map<string, TermTargetEntry>(),
  attached: null as string | null,
  attachedKind: null as WANIX_ATTACH_KIND | null,
  vmbindsready: false,
}

function requireactive() {
  if (iswanixtermiframemode() && iswanixtermiframeactive()) {
    return
  }
  if (state !== 'ready' || !root || !sys) {
    throw new Error('wanix not running — drop a .wasm to start')
  }
}

function rejectallwaiters(reason: string) {
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

/** VM/v86 needs a live layout but must not cover the tape UI (v86 VGA paints blue). */
function ensurevmmount(): HTMLElement {
  let mount = document.getElementById('zss-wanix-display')
  if (mount) {
    mount.remove()
  }
  mount = document.createElement('div')
  mount.id = 'zss-wanix-display'
  document.body.appendChild(mount)
  mount.style.position = 'fixed'
  mount.style.left = '0'
  mount.style.top = '0'
  mount.style.width = '800px'
  mount.style.height = '600px'
  mount.style.opacity = '0'
  mount.style.overflow = 'hidden'
  mount.style.pointerEvents = 'none'
  mount.style.zIndex = '-1'
  return mount
}

function newbindid() {
  bindseq += 1
  return `bind-${bindseq}`
}

function bindmeta(entry: BindEntry): WANIX_BIND_ENTRY {
  return {
    id: entry.id,
    kind: entry.kind,
    dst: entry.dst,
    label: entry.label,
    removable: entry.removable,
  }
}

function taskmeta(entry: TermTargetEntry): WANIX_TASK_ENTRY {
  return {
    id: entry.id,
    cmd: entry.cmd ?? '',
    rid: entry.rid ?? undefined,
    running: entry.rid != null,
    attached:
      registry.attachedKind === 'task' && registry.attached === entry.id,
  }
}

function vmmeta(entry: TermTargetEntry): WANIX_VM_ENTRY {
  return {
    id: entry.id,
    mem: entry.mem ?? '',
    vrid: entry.vrid ?? undefined,
    running: entry.innertaskrid != null,
    attached: registry.attachedKind === 'vm' && registry.attached === entry.id,
  }
}

function readregistry() {
  const tasks = [...registry.tasks.values()].map(taskmeta)
  const vms = [...registry.vms.values()].map(vmmeta)
  const attached = registry.attached
  const attachedkind = registry.attachedKind
  let termpath: string | undefined
  if (attachedkind === 'task' && attached) {
    termpath = registry.tasks.get(attached)?.termpath ?? undefined
  } else if (attachedkind === 'vm' && attached) {
    termpath = registry.vms.get(attached)?.termpath ?? undefined
  }
  return {
    binds: registry.binds.map(bindmeta),
    tasks,
    vms,
    attachedId: attached ?? undefined,
    attachedKind: attachedkind ?? undefined,
    attachedTaskId:
      attachedkind === 'task' ? attached ?? undefined : undefined,
    taskactive: tasks.some((task) => task.running),
    vmactive: vms.some((vm) => vm.running),
    vmbindsready: registry.vmbindsready,
    tid:
      attachedkind === 'task'
        ? registry.tasks.get(attached ?? '')?.rid ?? undefined
        : undefined,
    termpath,
  }
}

function sanitizetaskid(label: string) {
  const base = String(label || 'task')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'task'
}

function uniquetaskid(label: string) {
  const base = sanitizetaskid(label)
  let candidate = base
  let seq = 2
  while (registry.tasks.has(candidate)) {
    candidate = `${base}-${seq}`
    seq += 1
  }
  return candidate
}

function uniquevmid(label: string) {
  const base = sanitizetaskid(label)
  let candidate = base
  let seq = 2
  while (registry.vms.has(candidate)) {
    candidate = `${base}-${seq}`
    seq += 1
  }
  return candidate
}

function registerbootbind(el: Element) {
  const id = newbindid()
  registry.binds.push({
    el,
    id,
    kind: 'boot',
    dst: '.',
    label: '#ramfs',
    removable: false,
  })
  ;(el as HTMLElement).dataset.wanixBindId = id
}

const BIND_DOM_ATTRS = ['dst', 'src', 'type', 'mode', 'union'] as const

function applybindattrs(bindel: Element, attrs: Record<string, unknown>) {
  for (const key of BIND_DOM_ATTRS) {
    const value = attrs[key]
    if (value != null) {
      bindel.setAttribute(key, String(value))
    }
  }
}

function createbindentry(attrs: Record<string, unknown>): BindEntry {
  const bindel = document.createElement('wanix-bind')
  applybindattrs(bindel, attrs)
  const id = newbindid()
  const entry: BindEntry = {
    el: bindel,
    id,
    kind: String(attrs.type ?? 'ns'),
    dst: String(attrs.dst ?? '.'),
    label: String(attrs.label ?? attrs.dst ?? id),
    removable: attrs.removable !== false,
  }
  bindel.dataset.wanixBindId = id
  return entry
}

function removebindentries(entries: BindEntry[]) {
  for (const entry of entries) {
    entry.el.remove()
    const idx = registry.binds.indexOf(entry)
    if (idx !== -1) {
      registry.binds.splice(idx, 1)
    }
  }
}

async function mountbindels(
  bindels: Element[],
  label: string,
  opts: { prefix?: string; timeoutms?: number } = {},
) {
  if (!sys) {
    throw new Error('wanix system missing')
  }
  if (bindels.length === 0) {
    throw new Error('no bind elements to mount')
  }
  const timeoutms = opts.timeoutms ?? BIND_MOUNT_TIMEOUT_MS
  const prefix = opts.prefix ? `${opts.prefix}: ` : ''
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      sys._setupNamespace('1', '', bindels),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`bind mount timeout (${timeoutms}ms)`)),
          timeoutms,
        )
      }),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`${prefix}failed to mount ${label}: ${message}`)
  } finally {
    clearTimeout(timer)
  }
}

async function mountbindelement(
  bindel: Element,
  label: string,
  opts: { prefix?: string; timeoutms?: number } = {},
) {
  await mountbindels([bindel], label, opts)
}

async function addbind(attrs: Record<string, unknown>) {
  if (!sys) {
    throw new Error('wanix system missing')
  }
  const entry = createbindentry(attrs)
  sys.appendChild(entry.el)
  registry.binds.push(entry)
  try {
    await mountbindelement(entry.el, entry.label, {
      prefix:
        typeof attrs.mountprefix === 'string' ? attrs.mountprefix : undefined,
      timeoutms:
        typeof attrs.mounttimeoutms === 'number'
          ? attrs.mounttimeoutms
          : BIND_MOUNT_TIMEOUT_MS,
    })
  } catch (err) {
    removebindentries([entry])
    throw err
  }
  return entry.id
}

function removebind(bindid: string) {
  const idx = registry.binds.findIndex((entry) => entry.id === bindid)
  if (idx === -1) {
    throw new Error(`unknown bind: ${bindid}`)
  }
  const entry = registry.binds[idx]
  if (!entry.removable) {
    throw new Error(`bind not removable: ${bindid}`)
  }
  entry.el.remove()
  registry.binds.splice(idx, 1)
  return entry.id
}

function removeallbinds() {
  const removed: string[] = []
  for (const entry of [...registry.binds]) {
    if (!entry.removable) {
      continue
    }
    entry.el.remove()
    removed.push(entry.id)
    const idx = registry.binds.indexOf(entry)
    if (idx !== -1) {
      registry.binds.splice(idx, 1)
    }
  }
  return removed
}

function getentry(kind: WANIX_ATTACH_KIND, id: string) {
  return kind === 'task' ? registry.tasks.get(id) : registry.vms.get(id)
}

function getattachedentry() {
  if (!registry.attached || !registry.attachedKind) {
    return null
  }
  return getentry(registry.attachedKind, registry.attached)
}

async function getattachedtermwriter() {
  const entry = getattachedentry()
  if (!entry?.termwriter) {
    throw new Error('no attached term writer')
  }
  return entry.termwriter
}

function flushentryserialbuffer(entry: TermTargetEntry) {
  if (entry.serialbuffer.length > 0) {
    wanixtermscreenwrite(entry.serialbuffer)
  }
}

function stripvmlineecho(entry: TermTargetEntry, chunk: string): string {
  const line = entry.pendingvmline
  if (!line || !chunk.startsWith(line)) {
    return chunk
  }
  let rest = chunk.slice(line.length)
  if (rest.startsWith('\r\n')) {
    rest = rest.slice(2)
  } else if (rest.startsWith('\n')) {
    rest = rest.slice(1)
  } else if (rest.startsWith('\r')) {
    rest = rest.slice(1)
  }
  entry.pendingvmline = null
  return rest
}

function handletermchunk(kind: WANIX_ATTACH_KIND, id: string, chunk: string) {
  if (!chunk.length) {
    return
  }
  const entry = getentry(kind, id)
  if (!entry) {
    return
  }
  if (kind === 'vm') {
    chunk = stripvmlineecho(entry, chunk)
    if (!chunk.length) {
      return
    }
  }
  entry.serialbuffer += chunk
  if (registry.attached !== id || registry.attachedKind !== kind) {
    return
  }
  if (readterminalmodeattached()) {
    wanixtermscreenwrite(chunk)
    return
  }
  if (!entry.autotiletriggered) {
    entry.autotiletriggered = true
    vmprepstage = 'serial'
    void enterwanixattachedterminal()
    flushentryserialbuffer(entry)
  }
}

function disconnectterm(entry: TermTargetEntry | null | undefined) {
  if (!entry) {
    return
  }
  entry.termreading = null
  if (entry.wanixtermunwire) {
    entry.wanixtermunwire()
    entry.wanixtermunwire = null
  }
  if (entry.wanixtermel) {
    try {
      entry.wanixtermel.disconnect()
    } catch {
      // term may already be torn down
    }
    entry.wanixtermel.remove()
    entry.wanixtermel = null
  } else if (entry.termwriter) {
    try {
      entry.termwriter.releaseLock()
    } catch {
      // writer may already be closed
    }
  }
  entry.termwriter = null
  entry.termdatapath = null
  entry.termpath = null
  entry.termridpath = null
  entry.termaliaspath = null
  entry.serialbuffer = ''
  entry.autotiletriggered = false
  entry.pendingvmline = null
}

function notifyattached() {
  if (registry.attached && registry.attachedKind) {
    setwanixattached(registry.attachedKind, registry.attached)
  } else {
    setwanixattached(null, null)
    leavewanixattachedterminal()
  }
}

function clearattachedif(kind: WANIX_ATTACH_KIND, id: string) {
  if (registry.attachedKind === kind && registry.attached === id) {
    registry.attached = null
    registry.attachedKind = null
    notifyattached()
  }
}

async function removetask(taskid: string) {
  const entry = registry.tasks.get(taskid)
  if (!entry) {
    return
  }
  disconnectterm(entry)
  entry.el.remove()
  registry.tasks.delete(taskid)
  clearattachedif('task', taskid)
}

async function removevm(vmid: string) {
  const entry = registry.vms.get(vmid)
  if (!entry) {
    return
  }
  disconnectterm(entry)
  entry.el.remove()
  registry.vms.delete(vmid)
  clearattachedif('vm', vmid)
}

function createtask(cmd: string, taskid: string) {
  if (!sys) {
    throw new Error('wanix system missing')
  }
  const task = document.createElement('wanix-task') as WanixTaskElement
  task.setAttribute('id', taskid)
  task.setAttribute('type', 'wasi')
  task.setAttribute('term', '')
  task.setAttribute('cmd', cmd)
  sys.appendChild(task)
  return task
}

type WanixWakeElement = WanixVmElement & {
  rid?: string | null
  _awake(): Promise<void>
}

function findwanixvmel(vmid: string): WanixVmElement | null {
  if (!sys) {
    return null
  }
  return sys.querySelector(`wanix-vm#${vmid}`) as WanixVmElement | null
}

function createvm(vmid: string, mem: string) {
  if (!sys) {
    throw new Error('wanix system missing')
  }
  sys.insertAdjacentHTML(
    'beforeend',
    `<wanix-vm id="${vmid}" export="ttyS0" term mem="${mem}"></wanix-vm>`,
  )
  const vm = findwanixvmel(vmid)
  if (!vm) {
    throw new Error(`wanix vm run: failed to create wanix-vm ${vmid}`)
  }
  return vm
}

async function waitforgadgetidle() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function allocatewanixvmel(el: WanixVmElement) {
  if (el.rid) {
    return
  }
  // Allocate only — ttyS0 → #vm/…/term binds before gojs start (basic-vm.html order).
  await el.allocate()
}

/** allocate + start in one _awake (matches smoke-basic-vm.html); use when term is not connected. */
async function startwanixvmel(el: WanixVmElement) {
  const wake = el as WanixWakeElement
  if (wake.rid && wake.term) {
    await el.start()
    return
  }
  el.setAttribute('start', '')
  await wake._awake()
}

async function startwanixvmgojs(el: WanixVmElement) {
  await el.start()
}

async function waitforv86driver(timeoutms: number) {
  if (!root) {
    throw new Error('wanix root missing')
  }
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    try {
      const entries = await root.readDir('#vm/v86')
      if (
        entries.some((name) => name.replace(/\/$/, '') === 'v86-vm.wasm')
      ) {
        return
      }
    } catch {
      // #vm/v86 not mounted yet
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('wanix vm prep: v86 driver not found after mount — check CDN/network')
}

async function waitforwanixvmready(vmid: string, timeoutms: number) {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    const vm = findwanixvmel(vmid) as WanixWakeElement | null
    if (vm?.rid && vm?.term) {
      return vm
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 250))
  }
  let termdir: string[] = []
  try {
    termdir = await root!.readDir('#term')
  } catch {
    termdir = []
  }
  const partial = findwanixvmel(vmid) as WanixWakeElement | null
  throw new Error(
    `wanix vm prep: ${vmid} not ready (rid=${partial?.rid ?? 'none'} term=${partial?.term ?? 'none'} #term=${termdir.join(',')})`,
  )
}

function streamtermout(
  kind: WANIX_ATTACH_KIND,
  id: string,
  stream: ReadableStream<Uint8Array>,
) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const reading = (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          break
        }
        if (value && value.byteLength > 0) {
          const chunk = decoder.decode(value, { stream: true })
          await chaintermduplex(async () => {
            handletermchunk(kind, id, chunk)
          })
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      wanixtrace('term-out:read-error', { kind, id, message })
      if (
        registry.attached === id &&
        registry.attachedKind === kind &&
        readterminalmodeattached()
      ) {
        wanixtermscreenwrite(
          '\n$redwanix: vm serial read lost (gojs worker may have crashed)$white\n',
        )
      }
    } finally {
      reader.releaseLock()
    }
  })()
  return { reading }
}

async function resolvedatapath(
  ridpath: string,
  aliaspath: string,
  waitms: number,
) {
  if (!root) {
    throw new Error('wanix root missing')
  }
  const riddata = `${ridpath}/data`
  try {
    await root.waitFor(riddata, waitms)
    return { termpath: ridpath, datapath: riddata }
  } catch {
    const aliasdata = `${aliaspath}/data`
    await root.waitFor(aliasdata, waitms)
    return { termpath: aliaspath, datapath: aliasdata }
  }
}

async function connecttaskterm(entry: TermTargetEntry) {
  if (!root || entry.rid == null) {
    throw new Error('task not allocated')
  }
  const ridpath = `#task/${entry.rid}/term`
  const aliaspath = `#task/${entry.id}/term`
  entry.termridpath = ridpath
  entry.termaliaspath = aliaspath
  const { termpath, datapath } = await resolvedatapath(
    ridpath,
    aliaspath,
    DATA_WAIT_MS,
  )
  entry.termpath = termpath
  wanixtrace('connecttaskterm', {
    id: entry.id,
    termpath,
    termridpath: ridpath,
    termaliaspath: aliaspath,
  })
  const readable = await root.openReadable(datapath)
  const { reading } = streamtermout('task', entry.id, readable)
  entry.termreading = reading
  const writable = await root.openWritable(datapath)
  entry.termwriter = writable.getWriter()
  return { reading }
}

async function openvmtermwriter(entry: TermTargetEntry, datapath: string) {
  if (!root) {
    throw new Error('wanix root missing')
  }
  const writable = await root.openWritable(datapath)
  entry.termwriter = writable.getWriter()
}

async function openvmtermreader(entry: TermTargetEntry, datapath: string) {
  if (!root) {
    throw new Error('wanix root missing')
  }
  const readable = await root.openReadable(datapath)
  const { reading } = streamtermout('vm', entry.id, readable)
  entry.termreading = reading
}

type WanixTermHostElement = HTMLElement & {
  _term?: {
    buffer: {
      active: {
        length: number
        getLine: (index: number) => { translateToString: (trim?: boolean) => string } | undefined
      }
    }
    input: (data: string) => void
  } | null
}

function readwanixtermserial(term: NonNullable<WanixTermHostElement['_term']>): string {
  const active = term.buffer.active
  const lines: string[] = []
  for (let i = 0; i < active.length; i++) {
    const line = active.getLine(i)
    if (line) {
      lines.push(line.translateToString(true))
    }
  }
  return lines.join('\n')
}

function ensurevmtermel(entry: TermTargetEntry) {
  if (!sys || entry.vrid == null || entry.wanixtermel) {
    return
  }
  const term = document.createElement('wanix-term') as WanixTermHostElement
  term.setAttribute('path', `#vm/${entry.vrid}/term`)
  term.setAttribute('raw', '')
  term.dataset.zssVmTerm = entry.id
  term.style.cssText =
    'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden'
  sys.appendChild(term)
  entry.wanixtermel = term as unknown as WanixTermElement
  let lastserial = ''
  const poll = () => {
    if (!registry.vms.has(entry.id)) {
      return
    }
    const xterm = term._term
    if (xterm) {
      const serial = readwanixtermserial(xterm)
      if (serial.length > lastserial.length) {
        handletermchunk('vm', entry.id, serial.slice(lastserial.length))
        lastserial = serial
      }
    }
    window.setTimeout(poll, 100)
  }
  window.setTimeout(poll, 250)
}

async function writetermviawanixterm(text: string) {
  const entry = getattachedentry()
  const term = entry?.wanixtermel as WanixTermHostElement | null | undefined
  if (term?._term) {
    term._term.input(text)
    return
  }
  await writetermpayload(gettermencoder().encode(text))
}

async function connectvmterm(entry: TermTargetEntry) {
  if (!sys || !root || entry.vrid == null) {
    throw new Error('vm not allocated')
  }
  const ridpath = `#vm/${entry.vrid}/term`
  const aliaspath = `#vm/${entry.id}/term`
  entry.termridpath = ridpath
  entry.termaliaspath = aliaspath
  entry.termpath = ridpath

  const { termpath, datapath } = await resolvedatapath(
    ridpath,
    aliaspath,
    VM_TERM_WAIT_MS,
  )
  entry.termpath = termpath
  entry.termdatapath = datapath

  wanixtrace('connectvmterm', {
    id: entry.id,
    vrid: entry.vrid,
    termpath,
    termridpath: ridpath,
    termaliaspath: aliaspath,
    via: 'stream',
  })

  await openvmtermwriter(entry, datapath)
}

async function startvmtermread(entry: TermTargetEntry) {
  if (!entry.termdatapath || entry.termreading) {
    return
  }
  await openvmtermreader(entry, entry.termdatapath)
}

function queuetermwrite(writefn: () => Promise<void>) {
  const job = termwritechain.then(writefn)
  termwritechain = job.catch(() => {})
  return job
}

function polltaskexit(taskid: string) {
  return (async () => {
    if (!root) {
      return 1
    }
    const entry = registry.tasks.get(taskid)
    if (!entry?.rid) {
      return 1
    }
    const taskpath = `#task/${entry.rid}`
    const reading = entry.termreading
    while (true) {
      try {
        const exit = (await root.readText(`${taskpath}/exit`)).trim()
        if (exit !== '') {
          const code = Number(exit) || 0
          if (
            registry.attachedKind === 'task' &&
            registry.attached === taskid &&
            reading
          ) {
            await Promise.race([
              reading,
              new Promise((resolve) => setTimeout(resolve, 250)),
            ])
          }
          taskexithandler?.(taskid, code)
          const waiter = taskwaiters.get(taskid)
          if (waiter) {
            taskwaiters.delete(taskid)
            waiter.resolve(code)
          }
          await removetask(taskid)
          return code
        }
      } catch {
        // task still running
      }
      if (!registry.tasks.has(taskid)) {
        return 1
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  })()
}

function pollvmexit(vmid: string) {
  return (async () => {
    if (!root) {
      return 1
    }
    const entry = registry.vms.get(vmid)
    if (!entry?.innertaskrid) {
      return 1
    }
    const taskpath = `#task/${entry.innertaskrid}`
    const reading = entry.termreading
    while (true) {
      try {
        const exit = (await root.readText(`${taskpath}/exit`)).trim()
        if (exit !== '') {
          const code = Number(exit) || 0
          wanixtrace('vm-exit', { vmid, code })
          if (
            registry.attachedKind === 'vm' &&
            registry.attached === vmid &&
            reading
          ) {
            await Promise.race([
              reading,
              new Promise((resolve) => setTimeout(resolve, 250)),
            ])
          }
          vmexithandler?.(vmid, code)
          const waiter = vmwaiters.get(vmid)
          if (waiter) {
            vmwaiters.delete(vmid)
            waiter.resolve(code)
          }
          await removevm(vmid)
          return code
        }
      } catch {
        // vm still running
      }
      if (!registry.vms.has(vmid)) {
        return 1
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  })()
}

async function attachtarget(kind: WANIX_ATTACH_KIND, id: string) {
  if (kind === 'task') {
    const entry = registry.tasks.get(id)
    if (!entry?.rid) {
      throw new Error(`unknown task: ${id}`)
    }
  } else {
    const entry = registry.vms.get(id)
    if (!entry?.innertaskrid) {
      throw new Error(`unknown vm: ${id}`)
    }
  }
  registry.attached = id
  registry.attachedKind = kind
  const entry = getattachedentry()
  wanixtrace('attach', {
    kind,
    id,
    termpath: entry?.termpath ?? undefined,
    termridpath: entry?.termridpath ?? undefined,
    termaliaspath: entry?.termaliaspath ?? undefined,
  })
  notifyattached()
}

async function spawntask(
  cmd: string,
  taskid: string | undefined,
  opts: { wait?: boolean; attach?: boolean } = {},
) {
  requireactive()
  const taskcmd = (cmd || '').trim()
  if (!taskcmd) {
    throw new Error('empty command')
  }
  const id = taskid || uniquetaskid(taskcmd)
  if (registry.tasks.has(id)) {
    throw new Error(`task already exists: ${id}`)
  }
  const el = createtask(taskcmd, id)
  const entry: TermTargetEntry = {
    el,
    id,
    cmd: taskcmd,
    rid: null,
    vrid: null,
    innertaskrid: null,
    termpath: null,
    termridpath: null,
    termaliaspath: null,
    termdatapath: null,
    termwriter: null,
    termreading: null,
    wanixtermel: null,
    wanixtermunwire: null,
    serialbuffer: '',
    autotiletriggered: false,
    pendingvmline: null,
    exitpoll: null,
  }
  registry.tasks.set(id, entry)
  await el.allocate()
  entry.rid = el.rid
  await el.start()
  await connecttaskterm(entry)
  entry.exitpoll = polltaskexit(id)
  if (opts.attach !== false) {
    await attachtarget('task', id)
  }
  if (opts.wait) {
    const code = await entry.exitpoll
    return { taskId: id, code }
  }
  return id
}

async function spawnwithtimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`wanix vm run: ${label} timeout (${ms}ms)`)),
        ms,
      )
    }),
  ])
}

async function spawnvm(
  vmid: string | undefined,
  opts: {
    wait?: boolean
    attach?: boolean
    mem?: string
  } = {},
) {
  requireactive()
  if (!registry.vmbindsready) {
    throw new Error('vm assets not prepared')
  }
  const mem = typeof opts.mem === 'string' ? opts.mem : DEFAULT_WANIX_VM_MEM
  const id = vmid || uniquevmid('linux-vm')
  if (registry.vms.has(id)) {
    throw new Error(`vm already exists: ${id}`)
  }
  const el = findwanixvmel(id) ?? createvm(id, mem)
  el.setAttribute('start', '')
  const entry: TermTargetEntry = {
    el,
    id,
    mem,
    rid: null,
    vrid: null,
    innertaskrid: null,
    termpath: null,
    termridpath: null,
    termaliaspath: null,
    termdatapath: null,
    termwriter: null,
    termreading: null,
    wanixtermel: null,
    wanixtermunwire: null,
    serialbuffer: '',
    autotiletriggered: false,
    pendingvmline: null,
    exitpoll: null,
  }
  registry.vms.set(id, entry)
  registervm({
    id,
    label: id,
    mem,
  })
  try {
    const wake = el as WanixWakeElement
    await waitforgadgetidle()
    await spawnwithtimeout(wake._awake?.() ?? el.start(), VM_SPAWN_STEP_MS, 'start')
    await waitforwanixvmready(id, VM_TERM_READY_MS)
    entry.vrid = el.rid
    entry.innertaskrid = el.task.rid
    ensurevmtermel(entry)
  } catch (err) {
    await removevm(id)
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`wanix vm run: ${message}`)
  }
  entry.exitpoll = pollvmexit(id)
  if (opts.attach !== false) {
    await attachtarget('vm', id)
    await enterwanixattachedterminal()
    flushentryserialbuffer(entry)
  }
  vmprepstage = 'spawn'
  if (opts.wait) {
    const code = await entry.exitpoll
    return { vmId: id, code }
  }
  return id
}

async function stoptask(taskid: string) {
  if (!root) {
    return
  }
  const entry = registry.tasks.get(taskid)
  if (!entry) {
    return
  }
  if (entry.rid) {
    try {
      await root.writeFile(`#task/${entry.rid}/ctl`, 'stop')
    } catch {
      // task may already be gone
    }
  }
  if (entry.exitpoll) {
    try {
      await Promise.race([
        entry.exitpoll,
        new Promise((resolve) => setTimeout(resolve, 500)),
      ])
    } catch {
      // exit poll may reject if task already removed
    }
  }
  await removetask(taskid)
}

async function stopvm(vmid: string) {
  if (!root) {
    return
  }
  const entry = registry.vms.get(vmid)
  if (!entry) {
    return
  }
  if (entry.innertaskrid) {
    try {
      await root.writeFile(`#task/${entry.innertaskrid}/ctl`, 'stop')
    } catch {
      // inner task may already be gone
    }
  }
  if (entry.exitpoll) {
    try {
      await Promise.race([
        entry.exitpoll,
        new Promise((resolve) => setTimeout(resolve, 500)),
      ])
    } catch {
      // exit poll may reject if vm already removed
    }
  }
  await removevm(vmid)
}

async function halttask(taskid?: string) {
  if (taskid) {
    await stoptask(taskid)
    return
  }
  for (const id of [...registry.tasks.keys()]) {
    await stoptask(id)
  }
}

async function haltvm(vmid?: string) {
  if (vmid) {
    await stopvm(vmid)
    return
  }
  for (const id of [...registry.vms.keys()]) {
    await stopvm(id)
  }
}

function setvmprepstage(
  stage: WANIX_VM_PREP_STAGE,
  device?: DEVICELIKE,
  player?: string,
  line?: string,
  err?: unknown,
) {
  vmprepstage = stage
  if (stage === 'failed') {
    vmpreperror =
      err instanceof Error ? err.message : err != null ? String(err) : 'unknown'
  } else if (stage === 'mount_ok') {
    vmpreperror = undefined
  }
  if (line && device && player) {
    apilog(device, player, line)
  }
}

function readwasmpanicmessage(event: ErrorEvent | PromiseRejectionEvent): string {
  if ('reason' in event) {
    const reason = event.reason
    if (reason instanceof Error) {
      return reason.message
    }
    return String(reason)
  }
  if (event.error instanceof Error) {
    return event.error.message
  }
  return event.message ?? ''
}

function iswasmpanicmessage(message: string): boolean {
  return WASM_PANIC_RE.test(message)
}

export function readwanixvmprepstage(): WANIX_VM_PREP_STAGE {
  if (iswanixtermiframemode()) {
    return readwanixtermiframeprepstage()
  }
  return vmprepstage
}

export function readwanixvmpreperror(): string | undefined {
  if (iswanixtermiframemode()) {
    return readwanixtermiframepreperror()
  }
  return vmpreperror
}

export async function spawnwanixvmspace(
  device: DEVICELIKE,
  player: string,
  urls: WANIX_VM_ASSET_URLS = readwanixvmasseturls(),
): Promise<void> {
  if (iswanixtermiframemode()) {
    if (iswanixtermiframeactive()) {
      wanixiobridgestart(device, player)
      vmprepstage = 'mount_ok'
      return
    }
    state = 'starting'
    vmprepstage = 'mounting'
    vmpreperror = undefined
    await iframeprepvmspace(device, player, urls, wanixiobridgestart)
    state = 'ready'
    registry.vmbindsready = true
    return
  }
  if (registry.vmbindsready && iswanixspaceactive()) {
    wanixiobridgestart(device, player)
    vmprepstage = 'mount_ok'
    return
  }
  if (iswanixspaceactive()) {
    cleanup()
    if (typeof sessionStorage !== 'undefined') {
      if (!sessionStorage.getItem(VM_LAYOUT_RELOAD_KEY)) {
        setvmprepstage(
          'mounting',
          device,
          player,
          'wanix vm prep: reloading page for clean vm host (then run #wanix vm again)...',
        )
        sessionStorage.setItem(VM_LAYOUT_RELOAD_KEY, '1')
        window.location.reload()
        return await new Promise<void>(() => {})
      }
      sessionStorage.removeItem(VM_LAYOUT_RELOAD_KEY)
    }
  }
  state = 'starting'
  vmprepstage = 'mounting'
  vmpreperror = undefined
  wanixiobridgestart(device, player)
  setvmprepstage(
    'mounting',
    device,
    player,
    'wanix vm prep: mounting linux + v86 (basic-vm layout, first ready)...',
  )
  const mount = ensurevmmount()
  try {
    await bootwanixsystemforvm(mount, urls)
    state = 'ready'
    setvmprepstage('mount_ok', device, player, 'wanix vm prep: mount ok')
  } catch (err) {
    setvmprepstage('failed', device, player, undefined, err)
    cleanup()
    throw err
  }
}

async function waitwanixsystemready(system: WanixSystemElement) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      stop()
      reject(
        new Error(
          'wanix ready timeout — check console for wasm panic during archive mount',
        ),
      )
    }, READY_TIMEOUT_MS)

    const onready = () => {
      stop()
      resolve()
    }

    const onsyserror = (event: Event) => {
      stop()
      const custom = event as CustomEvent<{ error?: unknown }>
      const detail = custom.detail?.error
      const message =
        detail instanceof Error
          ? detail.message
          : detail != null
            ? String(detail)
            : 'wanix-system error'
      reject(new Error(message))
    }

    const onpanic = (event: ErrorEvent) => {
      const message = readwasmpanicmessage(event)
      if (!iswasmpanicmessage(message)) {
        return
      }
      stop()
      reject(new Error(`wanix wasm panic: ${message}`))
    }

    const onrejection = (event: PromiseRejectionEvent) => {
      const message = readwasmpanicmessage(event)
      if (!iswasmpanicmessage(message)) {
        return
      }
      event.preventDefault()
      stop()
      reject(new Error(`wanix wasm panic: ${message}`))
    }

    const prevconsoleerror = console.error.bind(console)
    const prevconsolelog = console.log.bind(console)
    const onconsoleerrorhook = (...args: unknown[]) => {
      prevconsoleerror(...args)
      const joined = args.map((arg) => String(arg)).join(' ')
      if (iswasmpanicmessage(joined)) {
        stop()
        reject(new Error(`wanix wasm panic: ${joined}`))
      }
    }
    const onconsoleloghook = (...args: unknown[]) => {
      prevconsolelog(...args)
      const joined = args.map((arg) => String(arg)).join(' ')
      if (iswasmpanicmessage(joined)) {
        stop()
        reject(new Error(`wanix wasm panic: ${joined}`))
      }
    }

    function stop() {
      clearTimeout(timer)
      system.removeEventListener('ready', onready)
      system.removeEventListener('error', onsyserror)
      window.removeEventListener('error', onpanic)
      window.removeEventListener('unhandledrejection', onrejection)
      console.error = prevconsoleerror
      console.log = prevconsolelog
    }

    system.addEventListener('ready', onready, { once: true })
    system.addEventListener('error', onsyserror, { once: true })
    window.addEventListener('error', onpanic)
    window.addEventListener('unhandledrejection', onrejection)
    console.error = onconsoleerrorhook
    console.log = onconsoleloghook
  })
}

async function bootwanixsystem(mount: HTMLElement) {
  await ensurewanixruntime()
  let system = mount.querySelector('wanix-system') as WanixSystemElement | null
  if (!system) {
    system = document.createElement('wanix-system') as WanixSystemElement
    applywanixsystemkernelattrs(system)
    const bootbind = document.createElement('wanix-bind')
    bootbind.setAttribute('dst', '.')
    bootbind.setAttribute('src', '#ramfs')
    bootbind.setAttribute('data-wanix-boot', 'ramfs')
    system.appendChild(bootbind)
    mount.appendChild(system)
  }
  const bootel = system.querySelector('wanix-bind[data-wanix-boot]')
  if (bootel && !bootel.getAttribute('data-wanix-bind-id')) {
    registerbootbind(bootel)
  }
  await waitwanixsystemready(system)
  sys = system
  root = system.root
  active = true
}

function registerdomvmbinds(system: WanixSystemElement) {
  const bindels = system.querySelectorAll(':scope > wanix-bind')
  for (const el of bindels) {
    const id = newbindid()
    const kind = el.getAttribute('type') ?? 'ns'
    const dst = el.getAttribute('dst') ?? '.'
    const label =
      kind === 'archive'
        ? el.getAttribute('src')?.includes('v86')
          ? 'v86'
          : 'wanix-linux'
        : dst
    ;(el as HTMLElement).dataset.wanixBindId = id
    registry.binds.push({
      el,
      id,
      kind,
      dst,
      label,
      removable: false,
    })
  }
}

/** Boot wanix like submodules/wanix/examples/basic-vm.html — all VM binds before first ready. */
async function bootwanixsystemforvm(
  mount: HTMLElement,
  urls: WANIX_VM_ASSET_URLS,
) {
  mount.replaceChildren()
  resetregistry()

  await ensurewanixruntime()

  const linux = urls.linux
  const v86 = urls.v86
  if (!linux || !v86) {
    throw new Error('missing vm asset urls')
  }

  // Parser-style insert (matches smoke-basic-vm.html) — avoids archive/wasm ready race
  // from createElement + appendChild ordering.
  mount.insertAdjacentHTML('beforeend', buildwanixvmprehtml(urls, 'zss-wanix-vm-sys'))
  const system = mount.querySelector('wanix-system') as WanixSystemElement | null
  if (!system) {
    throw new Error('wanix vm prep: failed to mount wanix-system')
  }
  registerdomvmbinds(system)

  await waitwanixsystemready(system)
  sys = system
  root = system.root
  active = true

  try {
    await waitforv86driver(VM_PREP_WAIT_MS)
  } catch {
    let diag = ''
    try {
      const rootentries = await root.readDir('.')
      let vmentries: string[] = []
      try {
        vmentries = await root.readDir('#vm')
      } catch {
        vmentries = []
      }
      let v86entries: string[] = []
      try {
        v86entries = await root.readDir('#vm/v86')
      } catch {
        v86entries = []
      }
      diag = ` root=${rootentries.join(',')} #vm=${vmentries.join(',')} #vm/v86=${v86entries.join(',')}`
    } catch {
      diag = ' (namespace unreadable after mount)'
    }
    throw new Error(
      `wanix vm prep: v86 driver not found after mount — check CDN/network${diag}`,
    )
  }
  registry.vmbindsready = true
}

function resetregistry() {
  registry.binds = []
  registry.tasks.clear()
  registry.vms.clear()
  registry.attached = null
  registry.attachedKind = null
  registry.vmbindsready = false
  bindseq = 0
  sys = null
  root = null
  active = false
}

function cleanup() {
  rejectallwaiters('wanix halted')
  taskexithandler = undefined
  vmexithandler = undefined
  wanixiobridgestop()
  void teardownwanixtermiframe()
  const mount = document.getElementById('zss-wanix-display')
  if (mount) {
    mount.replaceChildren()
  }
  resetregistry()
  state = 'idle'
  if (vmprepstage !== 'failed') {
    vmprepstage = 'idle'
  }
}

export function readwanixhoststate(): WANIX_HOST_STATE {
  return state
}

export function iswanixspaceactive(): boolean {
  if (iswanixtermiframemode() && iswanixtermiframeactive()) {
    return true
  }
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
  if (iswanixtermiframemode()) {
    if (iswanixtermiframeactive() && readwanixtermiframelayout() === 'task') {
      wanixiobridgestart(device, player)
      return
    }
    if (iswanixtermiframeactive()) {
      await teardownwanixtermiframe()
    }
    state = 'starting'
    try {
      await iframepreptaskspace()
      state = 'ready'
      active = true
      wanixiobridgestart(device, player)
    } catch (err) {
      cleanup()
      throw err
    }
    return
  }
  if (iswanixspaceactive()) {
    throw new Error('wanix already active')
  }
  state = 'starting'
  const mount = ensuremount()
  try {
    await bootwanixsystem(mount)
    state = 'ready'
    wanixiobridgestart(device, player)
  } catch (err) {
    cleanup()
    throw err
  }
}

export async function ensurewanixsandbox(
  device: DEVICELIKE,
  player: string,
): Promise<void> {
  if (!iswanixspaceactive()) {
    await spawnwanixspace(device, player)
  }
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
  const taskcmd = normalizewanixcmd(cmd)
  if (!taskcmd) {
    throw new Error('empty command')
  }
  const taskid =
    opts.taskid ??
    uniquewanixtaskid(makewanixtaskid(taskcmd), [
      ...readwanixtasks().map((task) => task.id),
    ])
  if (iswanixtermiframemode()) {
    if (!iswanixtermiframeactive() || readwanixtermiframelayout() !== 'task') {
      throw new Error('wanix task space not prepared')
    }
    await iframespawntask(taskid, taskcmd, opts.attach !== false)
    return { taskid }
  }
  requireactive()
  if (opts.wait) {
    const result = await spawntask(taskcmd, taskid, {
      wait: true,
      attach: opts.attach !== false,
    })
    return {
      taskid: result.taskId,
      code: typeof result.code === 'number' ? result.code : 0,
    }
  }
  const spawned = await spawntask(taskcmd, taskid, {
    wait: false,
    attach: opts.attach !== false,
  })
  return { taskid: typeof spawned === 'string' ? spawned : taskid }
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
  requireactive()
  if (iswanixtermiframemode()) {
    await iframechildputfile(name, bytes)
    return
  }
  await root!.writeFile(name, bytes)
}

export async function mountwanixarchive(
  name: string,
  bytes: Uint8Array,
  mountdst?: string,
) {
  requireactive()
  if (iswanixtermiframemode()) {
    const dst = mountdst || '.'
    await iframechildmountarchive(name, bytes, dst)
    return dst
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/gzip' }))
  try {
    return await addbind({
      type: 'archive',
      dst: mountdst || '.',
      src: url,
      label: name || 'archive.tgz',
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function listwanixdir(path: string): Promise<string[]> {
  requireactive()
  if (iswanixtermiframemode()) {
    return iframechildlistdir(path)
  }
  const entries = await root!.readDir(path)
  return entries.map((name) => String(name))
}

export async function listwanixbinds(): Promise<WANIX_BIND_ENTRY[]> {
  requireactive()
  return registry.binds.filter((entry) => entry.removable).map(bindmeta)
}

export async function listwanixtasks(): Promise<WANIX_TASK_ENTRY[]> {
  requireactive()
  return [...registry.tasks.values()].map(taskmeta)
}

export async function unmountwanixbind(bindid: string): Promise<void> {
  requireactive()
  removebind(bindid)
}

export async function unmountallwanixbinds(): Promise<string[]> {
  requireactive()
  return removeallbinds()
}

export async function haltwanixtask(taskid?: string): Promise<void> {
  if (iswanixtermiframemode() && iswanixtermiframeactive()) {
    await iframehalttask(taskid)
    return
  }
  if (state !== 'ready') {
    return
  }
  await halttask(taskid)
}

export async function attachwanixtarget(
  kind: WANIX_ATTACH_KIND,
  id: string,
): Promise<void> {
  requireactive()
  await attachtarget(kind, id)
  await enterwanixattachedterminal()
  const entry = getentry(kind, id)
  if (entry) {
    flushentryserialbuffer(entry)
  }
}

export async function attachwanixtask(taskid: string): Promise<void> {
  await attachwanixtarget('task', taskid)
}

export async function attachwanixvm(vmid: string): Promise<void> {
  await attachwanixtarget('vm', vmid)
}

export async function sendwanixvmline(line: string): Promise<void> {
  if (iswanixtermiframemode() && iswanixtermiframeactive()) {
    return iframetermline(line)
  }
  requireactive()
  const entry = getattachedentry()
  if (entry && registry.attachedKind === 'vm') {
    entry.pendingvmline = line
  }
  const run = async () => {
    wanixtrace('term-input:line', { len: line.length })
    await writetermviawanixterm(`${line}\r`)
    wanixtrace('term-input:done', { len: line.length + 1 })
  }
  const job = terminputchain.then(run, run)
  terminputchain = job.catch(() => {})
  return job
}

export async function sendwanixterminput(text: string): Promise<void> {
  if (iswanixtermiframemode() && iswanixtermiframeactive()) {
    return iframeterminput(text)
  }
  requireactive()
  if (!text.length) {
    return
  }
  const run = async () => {
    wanixtrace('term-input:send', { len: text.length })
    await writetermviawanixterm(text)
    wanixtrace('term-input:done', { len: text.length })
  }
  const job = terminputchain.then(run, run)
  terminputchain = job.catch(() => {})
  return job
}

export async function sendwanixtermwriteraw(bytes: Uint8Array): Promise<void> {
  if (bytes.byteLength === 0) {
    return
  }
  let text = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    text += String.fromCharCode(bytes[i] ?? 0)
  }
  return sendwanixterminput(text)
}

export async function sendwanixtermwrite(
  line: string,
  opts: { raw?: boolean } = {},
): Promise<void> {
  if (iswanixtermiframemode() && iswanixtermiframeactive()) {
    const kind = readwanixattachedkind()
    if (kind === 'vm') {
      return iframetermline(line)
    }
    return iframetermline(line)
  }
  requireactive()
  const raw = opts.raw === true || readwanixattachedkind() === 'vm'
  if (raw) {
    await writetermviawanixterm(`${line}\r\n`)
    return
  }
  const payload = gettermencoder().encode(`${line}\n`)
  wanixtrace('term-write:line', { len: payload.byteLength, raw: false })
  await queuetermwrite(() => writetermpayload(payload))
}

export async function prepwanixvm(
  urls: WANIX_VM_ASSET_URLS = readwanixvmasseturls(),
  device?: DEVICELIKE,
  player?: string,
): Promise<void> {
  if (registry.vmbindsready) {
    return
  }
  if (!device || !player) {
    throw new Error('wanix vm prep requires device context')
  }
  await spawnwanixvmspace(device, player, urls)
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
  if (iswanixtermiframemode()) {
    return iframespawnvm(opts)
  }
  requireactive()
  const vmid = opts.vmid
  if (opts.wait) {
    const result = await spawnvm(vmid, {
      wait: true,
      attach: opts.attach !== false,
      mem: opts.mem,
    })
    return {
      vmid: result.vmId,
      code: typeof result.code === 'number' ? result.code : 0,
    }
  }
  const spawned = await spawnvm(vmid, {
    wait: false,
    attach: opts.attach !== false,
    mem: opts.mem,
  })
  return { vmid: typeof spawned === 'string' ? spawned : vmid ?? 'linux-vm' }
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
  if (iswanixtermiframemode() && iswanixtermiframeactive()) {
    await iframehaltvm(vmid)
    return
  }
  if (state !== 'ready') {
    return
  }
  await haltvm(vmid)
}

export async function listwanixvms(): Promise<WANIX_VM_ENTRY[]> {
  requireactive()
  return [...registry.vms.values()].map(vmmeta)
}

export async function readwanixstatus(): Promise<{
  active: boolean
  ready: boolean
  state: WANIX_HOST_STATE
  taskactive?: boolean
  vmactive?: boolean
  vmbindsready?: boolean
  vmprepstage?: WANIX_VM_PREP_STAGE
  vmpreperror?: string
  attachedId?: string
  attachedKind?: WANIX_ATTACH_KIND
  attachedTaskId?: string
  tasks?: WANIX_TASK_ENTRY[]
  vms?: WANIX_VM_ENTRY[]
  binds?: WANIX_BIND_ENTRY[]
}> {
  if (iswanixtermiframemode() && iswanixtermiframeactive()) {
    return {
      active: true,
      ready: true,
      state: 'ready',
      vmbindsready: true,
      vmprepstage: readwanixtermiframeprepstage(),
      vmpreperror: readwanixtermiframepreperror(),
      attachedId: readwanixattached() ?? undefined,
      attachedKind: readwanixattachedkind() ?? undefined,
    }
  }
  if (state !== 'ready') {
    return {
      active: iswanixspaceactive(),
      ready: false,
      state,
      vmprepstage,
      vmpreperror,
    }
  }
  const snap = readregistry()
  return {
    active,
    ready: active && root != null,
    state,
    taskactive: snap.taskactive,
    vmactive: snap.vmactive,
    vmbindsready: snap.vmbindsready,
    vmprepstage,
    vmpreperror,
    attachedId: snap.attachedId,
    attachedKind: snap.attachedKind,
    attachedTaskId: snap.attachedTaskId,
    tasks: snap.tasks,
    vms: snap.vms,
    binds: snap.binds,
  }
}

/** Test hook — inject term-out without a live task/vm element. */
export function wanixhosttestsetattached(
  kind: WANIX_ATTACH_KIND,
  id: string,
  serialbuffer = '',
) {
  registry.attached = id
  registry.attachedKind = kind
  const stub: TermTargetEntry = {
    el: document.createElement('div'),
    id,
    rid: kind === 'task' ? '1' : null,
    vrid: kind === 'vm' ? '1' : null,
    innertaskrid: kind === 'vm' ? '2' : null,
    termpath: null,
    termridpath: null,
    termaliaspath: null,
    termdatapath: null,
    termwriter: null,
    termreading: null,
    wanixtermel: null,
    wanixtermunwire: null,
    serialbuffer,
    autotiletriggered: false,
    pendingvmline: null,
    exitpoll: null,
  }
  if (kind === 'task') {
    registry.tasks.set(id, stub)
  } else {
    registry.vms.set(id, stub)
  }
  setwanixattached(kind, id)
}

/** Test hook — deliver term-out to attach-on-serial handler. */
export function wanixhosttesttermout(
  kind: WANIX_ATTACH_KIND,
  id: string,
  chunk: string,
) {
  handletermchunk(kind, id, chunk)
}

/** Test hook — mark host ready with a mock term writer. */
export function wanixhosttestwirewriter(
  kind: WANIX_ATTACH_KIND,
  id: string,
  onwrite: (bytes: Uint8Array) => void,
) {
  state = 'ready'
  active = true
  root = {} as WanixRoot
  sys = document.createElement('div') as WanixSystemElement
  wanixhosttestsetattached(kind, id)
  const entry = getentry(kind, id)
  if (!entry) {
    return
  }
  entry.termwriter = {
    write: async (chunk) => {
      onwrite(chunk)
    },
    releaseLock: async () => {},
    closed: false,
    desiredSize: null,
  } as WritableStreamDefaultWriter<Uint8Array>
}

/** Test hook — reset module state without a live wanix-system. */
export function resetwanixhostfortest() {
  cleanup()
  termwritechain = Promise.resolve()
  terminputchain = Promise.resolve()
  termduplexchain = Promise.resolve()
}

/** Read buffered serial for the kernel-attached target (tests / smoke). */
export function readwanixhostattachedserial(): string {
  if (iswanixtermiframemode() && iswanixtermiframeactive()) {
    return readwanixtermiframserial()
  }
  const kind = readwanixattachedkind()
  const id = readwanixattached()
  if (!kind || !id) {
    return ''
  }
  return getentry(kind, id)?.serialbuffer ?? ''
}

/** E2e hook — run cmd with wait+attach inside an active sandbox. */
export async function runwanixhostwasm(
  cmd: string,
  opts: { termline?: string; blockms?: number; haltafter?: boolean } = {},
): Promise<{
  code: number
  error?: string
  output: string
  termwritesucceeded?: boolean
}> {
  requireactive()
  let termwritesucceeded = false
  if (opts.haltafter) {
    const spawned = await spawntask(cmd, undefined, { wait: false, attach: true })
    const taskid = typeof spawned === 'string' ? spawned : ''
    if (opts.blockms) {
      await new Promise((resolve) => setTimeout(resolve, opts.blockms))
    }
    if (opts.termline != null) {
      try {
        await sendwanixtermwrite(opts.termline)
        termwritesucceeded = true
      } catch (err) {
        await halttask(taskid)
        return {
          code: -1,
          error: err instanceof Error ? err.message : String(err),
          output: registry.tasks.get(taskid)?.serialbuffer ?? '',
          termwritesucceeded,
        }
      }
    }
    await halttask(taskid)
    return {
      code: 0,
      output: registry.tasks.get(taskid)?.serialbuffer ?? '',
      termwritesucceeded,
    }
  }
  const result = await spawntask(cmd, undefined, { wait: true, attach: true })
  if (typeof result === 'object' && 'taskId' in result) {
    return {
      code: typeof result.code === 'number' ? result.code : 1,
      output: registry.tasks.get(result.taskId)?.serialbuffer ?? '',
      termwritesucceeded,
    }
  }
  return { code: 1, output: '', error: 'unexpected spawn result' }
}

registervmtermiframehooks({
  onvmexit: (vmid, code) => {
    vmexithandler?.(vmid, code)
  },
})
