import type {
  WanixSystemElement,
  WanixTaskElement,
  WanixVmElement,
} from 'zss/feature/wanix/wanixelements.d.ts'
import type { WanixRoomConfig } from 'zss/feature/wanix/wanixroomtypes'
import {
  WANIX_LINUX_ARCHIVE_URL,
  WANIX_V86_ARCHIVE_URL,
} from 'zss/feature/wanix/wanixroomtypes'
import type { WANIX_TERM_GRID } from 'zss/feature/wanix/wanixtermgridstate'
import {
  createwanixtermgrid,
  readwanixtermgridsnapshot,
  wanixtermgridresize,
  wanixtermgridwritebytes,
} from 'zss/feature/wanix/wanixtermgridstate'

const WANIX_MSG_READY = 'zss-wanix-ready'
const WANIX_MSG_IDLE = 'zss-wanix-idle'
const WANIX_MSG_RPC = 'zss-wanix-rpc'
const WANIX_MSG_RPC_RES = 'zss-wanix-rpc-res'
const WANIX_MSG_CELLS = 'zss-wanix-cells'

const DEFAULT_TERM_COLS = 80
const DEFAULT_TERM_ROWS = 24
const WINCH_SENTINEL = -1

const DEFAULT_VM_ID = 'linux-vm'
const DEFAULT_VM_MEM = '512M'
const ROOM_READY_TIMEOUT_MS = 180_000
const BIND_MOUNT_TIMEOUT_MS = 120_000
const VM_RID_WAIT_MS = 120_000
const TERM_CONNECT_TIMEOUT_MS = 30_000
const POLL_MS = 250

type WanixSystemWithTerminals = WanixSystemElement & {
  _updateTerminals: (shim: {
    path: string
    _term: { cols: number; rows: number }
  }) => void
}

type TermSession = {
  alive: boolean
  termpath: string
  lastcols: number
  lastrows: number
  lastcelldigest: string
  grid: WANIX_TERM_GRID
  reader: ReadableStreamDefaultReader<Uint8Array> | null
  writer: WritableStreamDefaultWriter<Uint8Array> | null
  write: (text: string) => Promise<void>
  disconnect: () => void
}

type WanixRpcMessage = {
  type: string
  id?: string
  method?: string
  args?: unknown[]
}

const host = document.getElementById('wanix-host')
if (!host) {
  throw new Error('wanix-host missing')
}

const termsessions = new Map<string, TermSession>()
const termencoder = new TextEncoder()
const termdecoder = new TextDecoder()

let roomconfig: WanixRoomConfig = {
  mode: 'idle',
  mountkey: 0,
  archives: [],
  remotes: [],
  tasks: [],
}
let lastmountkey = -1
let system: WanixSystemElement | null = null
let lastfitcols = DEFAULT_TERM_COLS
let lastfitrows = DEFAULT_TERM_ROWS

function recordtermfit(cols: number, rows: number) {
  const nextcols = Math.max(1, Number(cols) || 1)
  const nextrows = Math.max(1, Number(rows) || 1)
  lastfitcols = nextcols
  lastfitrows = nextrows
}

function replyrpc(
  source: MessageEventSource | null,
  id: string | undefined,
  payload: Record<string, unknown>,
) {
  if (!source || typeof (source as Window).postMessage !== 'function') {
    return
  }
  ;(source as Window).postMessage(
    { type: WANIX_MSG_RPC_RES, id, ...payload },
    window.location.origin,
  )
}

function postready() {
  console.info('[wanix] ready')
  window.parent.postMessage(
    { type: WANIX_MSG_READY },
    window.location.origin,
  )
}

function postidle() {
  console.info('[wanix] idle')
  window.parent.postMessage(
    { type: WANIX_MSG_IDLE },
    window.location.origin,
  )
}

function setwanixattrs(el: HTMLElement, attrs: Record<string, unknown>) {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) {
      el.removeAttribute(key)
      continue
    }
    if (value === true || value === '') {
      el.setAttribute(key, '')
      continue
    }
    el.setAttribute(key, String(value))
  }
}

function createbind(attrs: Record<string, unknown>, markerattr?: string) {
  const bind = document.createElement('wanix-bind')
  setwanixattrs(bind, attrs)
  if (markerattr) {
    bind.setAttribute(markerattr, '')
  }
  return bind
}

function readroot() {
  if (!system?.isReady) {
    throw new Error('wanix-system not ready')
  }
  return system.root
}

function postcells(sessionkey: string, session: TermSession) {
  if (!session.grid || session.grid.cols <= 0) {
    return
  }
  const snapshot = readwanixtermgridsnapshot(session.grid)
  if (snapshot.digest === session.lastcelldigest) {
    return
  }
  session.lastcelldigest = snapshot.digest
  window.parent.postMessage(
    { type: WANIX_MSG_CELLS, sessionkey, snapshot },
    window.location.origin,
  )
}

function resizesessiongrid(
  sessionkey: string,
  session: TermSession,
  cols: number,
  rows: number,
) {
  const nextcols = Math.max(1, Number(cols) || 1)
  const nextrows = Math.max(1, Number(rows) || 1)
  if (
    session.grid &&
    session.grid.cols === nextcols &&
    session.grid.rows === nextrows
  ) {
    return
  }
  session.grid = wanixtermgridresize(session.grid, nextcols, nextrows)
  postcells(sessionkey, session)
}

async function readtermloop(sessionkey: string, session: TermSession) {
  while (session.alive && session.reader) {
    try {
      const { done, value } = await session.reader.read()
      if (done || !session.alive) {
        break
      }
      if (value?.length && session.grid) {
        wanixtermgridwritebytes(session.grid, value, termdecoder)
        postcells(sessionkey, session)
      }
    } catch {
      break
    }
  }
}

function readupdateterminals() {
  if (!system?.isReady) {
    throw new Error('wanix-system not ready')
  }
  const wanixsystem = system as WanixSystemWithTerminals
  const updateterminals = wanixsystem._updateTerminals
  if (typeof updateterminals !== 'function') {
    throw new Error('wanix _updateTerminals missing')
  }
  return updateterminals.bind(wanixsystem)
}

async function fitonesession(
  sessionkey: string,
  session: TermSession,
  cols: number,
  rows: number,
  updateterminals: WanixSystemWithTerminals['_updateTerminals'],
) {
  const nextcols = Math.max(1, Number(cols) || 1)
  const nextrows = Math.max(1, Number(rows) || 1)
  if (session.lastcols === nextcols && session.lastrows === nextrows) {
    return
  }
  session.lastcols = nextcols
  session.lastrows = nextrows
  const shim = {
    path: session.termpath,
    _term: { cols: nextcols, rows: nextrows },
  }
  updateterminals(shim)
  resizesessiongrid(sessionkey, session, nextcols, nextrows)
  console.info(`[wanix term ${sessionkey}] winsize`, {
    cols: nextcols,
    rows: nextrows,
    termpath: session.termpath,
  })
}

async function fitalltermsessions(cols: number, rows: number) {
  if (termsessions.size === 0) {
    return
  }
  const updateterminals = readupdateterminals()
  for (const [sessionkey, session] of termsessions) {
    await fitonesession(
      sessionkey,
      session,
      cols,
      rows,
      updateterminals,
    )
  }
}

function disconnecttermsession(sessionkey: string) {
  const session = termsessions.get(sessionkey)
  if (!session) {
    return
  }
  session.disconnect()
  termsessions.delete(sessionkey)
}

function disconnectalltermsessions() {
  for (const key of [...termsessions.keys()]) {
    disconnecttermsession(key)
  }
}

async function connecttermsession(sessionkey: string, termpath: string) {
  disconnecttermsession(sessionkey)
  const root = readroot()
  const datapath = `${termpath}/data`
  await root.waitFor(datapath, TERM_CONNECT_TIMEOUT_MS)
  const readable = await root.openReadable(datapath)
  const writable = await root.openWritable(datapath)
  const reader = readable.getReader()
  const writer = writable.getWriter()
  const session: TermSession = {
    alive: true,
    termpath,
    lastcols: WINCH_SENTINEL,
    lastrows: WINCH_SENTINEL,
    lastcelldigest: '',
    grid: createwanixtermgrid(lastfitcols, lastfitrows),
    reader,
    writer,
    async write(text) {
      if (!this.alive || !this.writer) {
        return
      }
      await this.writer.write(termencoder.encode(String(text ?? '')))
    },
    disconnect() {
      if (!this.alive) {
        return
      }
      this.alive = false
      if (this.reader) {
        this.reader.cancel().catch(() => {})
        this.reader = null
      }
      if (this.writer) {
        this.writer.close().catch(() => {})
        this.writer = null
      }
    },
  }
  termsessions.set(sessionkey, session)
  void readtermloop(sessionkey, session)
  return session
}

function readtermsession(sessionkey?: string | null) {
  if (sessionkey != null && sessionkey !== '') {
    const session = termsessions.get(String(sessionkey))
    if (!session) {
      throw new Error(`wanix term session missing: ${sessionkey}`)
    }
    return session
  }
  const first = termsessions.values().next().value
  if (!first) {
    throw new Error('wanix term session missing')
  }
  return first
}

function readvmtermpath(vmel: WanixVmElement) {
  if (typeof vmel.term === 'string' && vmel.term.length > 0) {
    return vmel.term
  }
  return '#vm/1/term'
}

async function connectvmtermsession() {
  const vm = roomconfig.vm
  if (!vm?.active || !system?.isReady) {
    return
  }
  const vmel = system.querySelector('wanix-vm') as WanixVmElement | null
  if (!vmel) {
    return
  }
  await connecttermsession(vm.id, readvmtermpath(vmel))
}

function appendtaskroombinds(sys: WanixSystemElement, config: WanixRoomConfig) {
  sys.appendChild(createbind({ dst: '.', src: '#ramfs' }))
  for (const archive of config.archives) {
    const bind = createbind({
      type: 'archive',
      dst: archive.dst,
      src: archive.src,
    })
    bind.setAttribute('data-zss-archive-id', archive.id)
    sys.appendChild(bind)
  }
  for (const remote of config.remotes) {
    const bind = createbind({
      type: 'import',
      dst: remote.dst,
      src: remote.url,
    })
    bind.setAttribute('data-zss-remote-id', remote.id)
    sys.appendChild(bind)
  }
}

function appendvmroombinds(sys: WanixSystemElement) {
  sys.appendChild(
    createbind(
      { type: 'archive', dst: '.', src: WANIX_LINUX_ARCHIVE_URL },
      'data-zss-linux-bind',
    ),
  )
  sys.appendChild(createbind({ dst: 'vm', src: '#vm' }))
  sys.appendChild(
    createbind(
      { type: 'archive', dst: '#vm/v86', src: WANIX_V86_ARCHIVE_URL },
      'data-zss-v86-bind',
    ),
  )
}

function buildroomtree(config: WanixRoomConfig) {
  const sys = document.createElement('wanix-system') as WanixSystemElement
  setwanixattrs(sys, {
    id: 'wanix-system',
    'allow-origins': '*',
    debug: true,
  })

  if (config.mode === 'idle') {
    return sys
  }

  appendtaskroombinds(sys, config)

  if (config.mode === 'vm') {
    appendvmroombinds(sys)
    const vm = config.vm
    if (vm?.active) {
      const vmel = document.createElement('wanix-vm') as WanixVmElement
      setwanixattrs(vmel, {
        id: vm.id,
        export: 'ttyS0',
        mem: vm.mem,
        term: true,
      })
      sys.appendChild(vmel)
    }
  }

  return sys
}

function waitsystemready(
  sys: WanixSystemElement,
  timeoutms = ROOM_READY_TIMEOUT_MS,
) {
  if (sys.isReady) {
    return Promise.resolve()
  }
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      sys.removeEventListener('ready', onready)
      reject(new Error('wanix-system ready timeout'))
    }, timeoutms)
    const onready = () => {
      clearTimeout(timer)
      resolve()
    }
    sys.addEventListener('ready', onready, { once: true })
    sys.addEventListener(
      'error',
      () => {
        clearTimeout(timer)
        reject(new Error('wanix-system error'))
      },
      { once: true },
    )
  })
}

async function waitvmlinuxmount() {
  const deadline = Date.now() + BIND_MOUNT_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      const entries = await readroot().readDir('.')
      if (entries.some((entry) => entry.startsWith('bin'))) {
        return
      }
    } catch {
      // root not ready for vm layout yet
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }
  throw new Error('wanix vm binds not mounted')
}

async function waitforvmrid(vm: WanixVmElement, deadline: number) {
  while (Date.now() < deadline) {
    if (vm.rid) {
      return vm.rid
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }
  return vm.rid ?? null
}

async function applyroom(config: WanixRoomConfig) {
  roomconfig = {
    mode: config.mode ?? 'idle',
    mountkey: config.mountkey ?? 0,
    archives: config.archives ?? [],
    remotes: config.remotes ?? [],
    tasks: config.tasks ?? [],
    vm: config.vm,
  }

  if (roomconfig.mode === 'idle') {
    disconnectalltermsessions()
    host.replaceChildren()
    system = null
    lastmountkey = roomconfig.mountkey
    postidle()
    return { ok: true, mode: 'idle', mountkey: lastmountkey }
  }

  if (
    lastmountkey === roomconfig.mountkey &&
    system?.isConnected &&
    system.isReady
  ) {
    return {
      ok: true,
      mode: roomconfig.mode,
      mountkey: lastmountkey,
      already: true,
    }
  }

  await customElements.whenDefined('wanix-system')
  disconnectalltermsessions()
  const next = buildroomtree(roomconfig)
  host.replaceChildren()
  host.appendChild(next)
  system = next
  lastmountkey = roomconfig.mountkey

  await waitsystemready(system)
  postready()

  if (roomconfig.mode === 'vm' && roomconfig.vm?.active) {
    await waitvmlinuxmount()
    const vmel = system.querySelector('wanix-vm') as WanixVmElement | null
    if (vmel) {
      if (typeof vmel.allocate === 'function') {
        await vmel.allocate()
      }
      await connectvmtermsession()
      if (typeof vmel.start === 'function') {
        await vmel.start()
      }
    }
    const vrid = vmel
      ? await waitforvmrid(vmel, Date.now() + VM_RID_WAIT_MS)
      : null
    return {
      ok: true,
      mode: 'vm',
      mountkey: lastmountkey,
      vmid: roomconfig.vm.id,
      vrid,
      mem: roomconfig.vm.mem,
    }
  }

  return { ok: true, mode: roomconfig.mode, mountkey: lastmountkey }
}

function removetargetpair(taskid: string) {
  disconnecttermsession(taskid)
  system?.querySelector(`wanix-task[id="${taskid}"]`)?.remove()
  roomconfig.tasks = roomconfig.tasks.filter((entry) => entry.id !== taskid)
}

async function spawntask(taskid: string, cmd: string) {
  if (!system?.isReady) {
    throw new Error('wanix room not ready')
  }
  if (system.querySelector(`wanix-task[id="${taskid}"]`)) {
    return { ok: true, already: true, taskid }
  }

  const task = document.createElement('wanix-task') as WanixTaskElement
  setwanixattrs(task, {
    id: taskid,
    type: 'wasi',
    term: true,
    cmd,
  })
  task.setAttribute('data-zss-target-id', taskid)
  task.setAttribute('data-zss-target-kind', 'task')
  system.appendChild(task)

  if (typeof task.allocate === 'function') {
    await task.allocate()
  }

  const termpath =
    typeof task.term === 'string' && task.term.length > 0
      ? task.term
      : `#task/${taskid}/term`
  await connecttermsession(taskid, termpath)

  if (typeof task.start === 'function') {
    await task.start()
  }

  const entry = { id: taskid, cmd, running: true }
  roomconfig.tasks = [
    ...roomconfig.tasks.filter((t) => t.id !== taskid),
    entry,
  ]

  return { ok: true, taskid, rid: task.rid ?? null }
}

function halttask(taskid: string) {
  removetargetpair(taskid)
  return { ok: true, taskid }
}

function stopvm() {
  if (!system?.isReady) {
    throw new Error('wanix room not ready')
  }
  const vmid = roomconfig.vm?.id ?? DEFAULT_VM_ID
  disconnecttermsession(vmid)
  system.querySelector('wanix-vm')?.remove()
  system.querySelector('[data-zss-linux-bind]')?.remove()
  system.querySelector('[data-zss-v86-bind]')?.remove()
  for (const bind of system.querySelectorAll('wanix-bind')) {
    if (bind.getAttribute('dst') === 'vm') {
      bind.remove()
    }
  }
  roomconfig = {
    ...roomconfig,
    mode: 'task',
    vm: undefined,
  }
  return { ok: true, mode: 'task' }
}

function stoproom() {
  return applyroom({
    mode: 'idle',
    mountkey: roomconfig.mountkey + 1,
    archives: [],
    remotes: [],
    tasks: [],
  })
}

function readroomstatus() {
  return {
    ...roomconfig,
    ready: !!system?.isReady,
    vmrunning: !!system?.querySelector('wanix-vm[start], wanix-vm[start=""]'),
  }
}

function readvmstatelive() {
  const vm = system?.querySelector('wanix-vm') as WanixVmElement | null
  return {
    running: !!vm,
    vmid: vm?.getAttribute('id') ?? roomconfig.vm?.id ?? null,
    vrid: vm?.rid ?? null,
    mem: vm?.getAttribute('mem') ?? roomconfig.vm?.mem ?? null,
  }
}

async function handlerrpc(data: WanixRpcMessage, source: MessageEventSource | null) {
  const { id, method, args = [] } = data
  try {
    let result: unknown
    switch (method) {
      case 'ping':
        result = { ok: true }
        break
      case 'readready':
        result = {
          isReady: !!system?.isReady,
          instanceID: system?.instanceID ?? null,
        }
        break
      case 'readroomstatus':
        result = readroomstatus()
        break
      case 'readvmstatus':
        result = readvmstatelive()
        break
      case 'applyroom': {
        const [config] = args as [WanixRoomConfig?]
        result = await applyroom(config ?? { mode: 'idle', mountkey: 0 })
        break
      }
      case 'spawntask': {
        const [taskid, cmd] = args as [string, string]
        result = await spawntask(String(taskid), String(cmd))
        break
      }
      case 'halttask': {
        const [taskid] = args as [string]
        result = halttask(String(taskid))
        break
      }
      case 'stoproom':
        result = await stoproom()
        break
      case 'startvm': {
        const [mem, vmid] = args as [string?, string?]
        result = await applyroom({
          ...roomconfig,
          mode: 'vm',
          mountkey: roomconfig.mountkey + 1,
          vm: {
            id: String(vmid ?? DEFAULT_VM_ID),
            mem: String(mem ?? DEFAULT_VM_MEM),
            active: true,
          },
        })
        break
      }
      case 'stopvm': {
        result = stopvm()
        break
      }
      case 'listdir': {
        const [path] = args as [string?]
        result = await readroot().readDir(String(path ?? '.'))
        break
      }
      case 'readtext': {
        const [path] = args as [string?]
        result = await readroot().readText(String(path))
        break
      }
      case 'readfile': {
        const [path] = args as [string?]
        const bytes = await readroot().readFile(String(path))
        result = Array.from(bytes)
        break
      }
      case 'writefile': {
        const [path, bytes] = args as [string, number[]?]
        await readroot().writeFile(String(path), new Uint8Array(bytes ?? []))
        result = { ok: true }
        break
      }
      case 'termwrite': {
        const [linedata, sessionkey] = args as [string?, string?]
        const session = readtermsession(
          sessionkey != null ? String(sessionkey) : undefined,
        )
        await session.write(String(linedata ?? ''))
        result = { ok: true }
        break
      }
      case 'termfit': {
        const [cols, rows] = args as [number, number]
        recordtermfit(cols, rows)
        if (termsessions.size === 0) {
          result = { ok: true, noop: true }
          break
        }
        await fitalltermsessions(Number(cols), Number(rows))
        result = {
          ok: true,
          cols: Number(cols),
          rows: Number(rows),
        }
        break
      }
      default:
        replyrpc(source, id, { error: `unknown rpc: ${method}` })
        return
    }
    replyrpc(source, id, { result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (method === 'termfit') {
      console.warn('[wanix termfit]', message)
    }
    replyrpc(source, id, {
      error: message,
    })
  }
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) {
    return
  }
  const data = event.data as WanixRpcMessage
  if (!data || data.type !== WANIX_MSG_RPC) {
    return
  }
  void handlerrpc(data, event.source)
})

await customElements.whenDefined('wanix-system')
postidle()
