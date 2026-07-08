import type {
  WanixSystemElement,
  WanixVmElement,
} from 'zss/feature/wanix/wanixelements.d.ts'
import type { WanixRoomConfig } from 'zss/feature/wanix/wanixroomtypes'
import {
  WANIX_LINUX_ARCHIVE_URL,
  WANIX_V86_ARCHIVE_URL,
  createidleroomconfig,
} from 'zss/feature/wanix/wanixroomtypes'
import {
  WANIX_MSG_CELLS,
  WANIX_MSG_IDLE,
  WANIX_MSG_READY,
  WANIX_MSG_RPC,
  WANIX_MSG_RPC_RES,
  WANIX_MSG_SESSION,
} from 'zss/feature/wanix/wanixrpcmessages'
import type { WANIX_TERM_GRID } from 'zss/feature/wanix/wanixtermgridstate'
import {
  createwanixtermgrid,
  readwanixtermgridsnapshot,
  wanixtermgridresize,
  wanixtermgridwritebytes,
} from 'zss/feature/wanix/wanixtermgridstate'
import {
  WANIX_ZEDCAFE_EXPORT_RAMFS,
  WANIX_ZEDCAFE_GUEST_MOUNT,
  WANIX_ZEDCAFE_WASM_RAMFS,
  WANIX_ZEDCAFE_WASM_URL,
} from 'zss/feature/wanix/wanixzedcafeconstants'

import {
  bootzedcafegojs,
  collectzedcafeexportfiles,
  collectzedcafeexportramfsfiles,
  haltzedcafetask,
  pushzedcafeexportlive,
  readzedcafereadylocal,
  readzedcafetaskridlocal,
  refreshvmzedcafeguestfiles,
  resetzedcafestate,
  setzedcafereadylocal,
  synczedcafestate,
  waitzedcafereadyrpc,
} from './wanixzedcafe'

type WanixSessionKind = 'vm' | 'task'
type WanixSessionEvent = 'open' | 'active' | 'close'

const DEFAULT_TERM_COLS = 80
const DEFAULT_TERM_ROWS = 24
const WINCH_SENTINEL = -1

const DEFAULT_VM_ID = 'linux-vm'
const DEFAULT_VM_MEM = '512M'

// The published wanix npm dist ships a TinyGo-compiled wanix.wasm whose
// syscall/js runtime corrupts under load (upstream tractordev/wanix#171),
// crashing the guest during heavy terminal I/O. Point <wanix-system> at a
// full-Go build served from cafe/public so the loader uses the stable Go glue.
const WANIX_WASM_URL = '/wasm/wanix/wanix.wasm'
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

const hostel = document.getElementById('wanix-host')
if (!hostel) {
  throw new Error('wanix-host missing')
}
const host: HTMLElement = hostel

const termsessions = new Map<string, TermSession>()
const sessionconnectorder: string[] = []
const termencoder = new TextEncoder()
const termdecoder = new TextDecoder()

let activesessionkey: string | null = null

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
  window.parent.postMessage({ type: WANIX_MSG_READY }, window.location.origin)
}

function postidle() {
  window.parent.postMessage({ type: WANIX_MSG_IDLE }, window.location.origin)
}

function readsessionsessionkind(sessionkey: string): WanixSessionKind {
  if (roomconfig.vm?.active && sessionkey === roomconfig.vm.id) {
    return 'vm'
  }
  return 'task'
}

function postsession(
  event: WanixSessionEvent,
  sessionkey: string,
  kind?: WanixSessionKind,
) {
  window.parent.postMessage(
    {
      type: WANIX_MSG_SESSION,
      event,
      sessionkey,
      kind,
    },
    window.location.origin,
  )
}

function recordtermsessionconnect(sessionkey: string) {
  const index = sessionconnectorder.indexOf(sessionkey)
  if (index >= 0) {
    sessionconnectorder.splice(index, 1)
  }
  sessionconnectorder.push(sessionkey)
}

function forgettermsessionconnect(sessionkey: string) {
  const index = sessionconnectorder.indexOf(sessionkey)
  if (index >= 0) {
    sessionconnectorder.splice(index, 1)
  }
}

function pruneworkerroomtask(taskid: string) {
  if (readsessionsessionkind(taskid) !== 'task') {
    return
  }
  roomconfig.tasks = roomconfig.tasks.filter((entry) => entry.id !== taskid)
}

function recomputeactivesession() {
  const live = sessionconnectorder.filter((key) => termsessions.has(key))
  if (live.length === 0) {
    activesessionkey = null
    return
  }
  const next = live[live.length - 1]
  activesessionkey = next
  postsession('active', next, readsessionsessionkind(next))
}

function setactivesession(sessionkey: string) {
  activesessionkey = sessionkey
  postsession('active', sessionkey, readsessionsessionkind(sessionkey))
}

function notifytermsessionclose(sessionkey: string) {
  forgettermsessionconnect(sessionkey)
  pruneworkerroomtask(sessionkey)
  postsession('close', sessionkey)
  if (activesessionkey === sessionkey) {
    activesessionkey = null
    recomputeactivesession()
  }
}

function handletermsessioneof(sessionkey: string) {
  const session = termsessions.get(sessionkey)
  if (!session?.alive) {
    return
  }
  session.disconnect()
  termsessions.delete(sessionkey)
  notifytermsessionclose(sessionkey)
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
    el.setAttribute(key, String(value as string | number))
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
  if (session.grid?.cols === nextcols && session.grid.rows === nextrows) {
    return
  }
  session.grid = wanixtermgridresize(session.grid, nextcols, nextrows)
  postcells(sessionkey, session)
}

async function readtermloop(sessionkey: string, session: TermSession) {
  let eof = false
  while (session.alive && session.reader) {
    try {
      const { done, value } = await session.reader.read()
      if (done) {
        eof = session.alive
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
  if (eof) {
    handletermsessioneof(sessionkey)
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

function fitonesession(
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
}

function fitalltermsessions(cols: number, rows: number) {
  if (termsessions.size === 0) {
    return
  }
  const updateterminals = readupdateterminals()
  for (const [sessionkey, session] of termsessions) {
    fitonesession(sessionkey, session, cols, rows, updateterminals)
  }
}

function disconnecttermsession(
  sessionkey: string,
  opts?: { notifyclose?: boolean },
) {
  const session = termsessions.get(sessionkey)
  if (!session) {
    return
  }
  const wasalive = session.alive
  session.disconnect()
  termsessions.delete(sessionkey)
  if (opts?.notifyclose && wasalive) {
    notifytermsessionclose(sessionkey)
  } else {
    forgettermsessionconnect(sessionkey)
    if (activesessionkey === sessionkey) {
      activesessionkey = null
      recomputeactivesession()
    }
  }
}

function disconnectalltermsessions() {
  for (const key of [...termsessions.keys()]) {
    disconnecttermsession(key)
  }
  activesessionkey = null
  sessionconnectorder.length = 0
}

async function connecttermsession(
  sessionkey: string,
  termpath: string,
  kind?: WanixSessionKind,
) {
  disconnecttermsession(sessionkey)
  const root = readroot()
  const datapath = `${termpath}/data`
  await root.waitFor(datapath, TERM_CONNECT_TIMEOUT_MS)
  const readable = await root.openReadable(datapath)
  const writable = await root.openWritable(datapath)
  const reader = readable.getReader()
  const writer = writable.getWriter()
  const sessionkind = kind ?? readsessionsessionkind(sessionkey)
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
  recordtermsessionconnect(sessionkey)
  postsession('open', sessionkey, sessionkind)
  setactivesession(sessionkey)
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
  const vmel = system.querySelector('wanix-vm')
  if (!vmel) {
    return
  }
  await connecttermsession(vm.id, readvmtermpath(vmel), 'vm')
}

function appendzedcafestagingbinds(sys: WanixSystemElement) {
  if (!sys.querySelector('wanix-bind[data-zss-zedcafe-wasm]')) {
    sys.appendChild(
      createbind(
        {
          type: 'file',
          dst: WANIX_ZEDCAFE_WASM_RAMFS,
          src: WANIX_ZEDCAFE_WASM_URL,
        },
        'data-zss-zedcafe-wasm',
      ),
    )
  }
  const guestfiles = roomconfig.zedcafe?.guestfiles
  if (guestfiles?.some((file) => file.path === 'stats.json')) {
    refreshvmzedcafeguestfiles(sys, guestfiles)
  }
}

function appendtaskroombinds(sys: WanixSystemElement, config: WanixRoomConfig) {
  sys.appendChild(createbind({ dst: '.', src: '#ramfs' }))
  if (config.zedcafe) {
    appendzedcafestagingbinds(sys)
  }
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
  if (roomconfig.zedcafe) {
    appendzedcafestagingbinds(sys)
  }
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
  const sys = document.createElement('wanix-system')
  setwanixattrs(sys, {
    id: 'wanix-system',
    'allow-origins': '*',
    wasm: WANIX_WASM_URL,
  })

  if (config.mode === 'idle') {
    return sys
  }

  appendtaskroombinds(sys, config)

  if (config.mode === 'vm') {
    appendvmroombinds(sys)
    const vm = config.vm
    if (vm?.active) {
      const vmel = document.createElement('wanix-vm')
      setwanixattrs(vmel, {
        id: vm.id,
        export: 'ttyS0',
        mem: vm.mem,
        term: true,
      })
      if (config.zedcafe?.guestfiles?.length) {
        const bind = createbind({
          dst: WANIX_ZEDCAFE_GUEST_MOUNT,
          src: WANIX_ZEDCAFE_EXPORT_RAMFS,
        })
        bind.setAttribute('data-zss-zedcafe-export', 'vm-staging')
        vmel.appendChild(bind)
      }
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
    zedcafe: config.zedcafe,
  }

  if (roomconfig.mode === 'idle') {
    disconnectalltermsessions()
    host.replaceChildren()
    system = null
    lastmountkey = roomconfig.mountkey
    resetzedcafestate()
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

  if (roomconfig.zedcafe?.cmd) {
    const spec = roomconfig.zedcafe
    synczedcafestate(spec.cmd, spec.generation)
    await bootzedcafegojs(
      system,
      readroot(),
      spec.cmd,
      spec.inboxbytes ?? [],
      roomconfig.mode === 'vm',
    )
  }

  if (roomconfig.mode === 'vm' && roomconfig.vm?.active) {
    await waitvmlinuxmount()
    const vmel = system.querySelector('wanix-vm')
    if (vmel) {
      // wanix-vm auto-allocates itself via _awake() on the system 'ready'
      // event, so calling allocate() here would throw 'VM already allocated'.
      // connectvmtermsession() waits on the term data path, covering timing.
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
  disconnecttermsession(taskid, { notifyclose: true })
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

  const task = document.createElement('wanix-task')
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
  await connecttermsession(taskid, termpath, 'task')

  if (typeof task.start === 'function') {
    await task.start()
  }

  const entry = { id: taskid, cmd, running: true }
  roomconfig.tasks = [...roomconfig.tasks.filter((t) => t.id !== taskid), entry]

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
  disconnecttermsession(vmid, { notifyclose: true })
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

async function handlerrpc(
  data: WanixRpcMessage,
  source: MessageEventSource | null,
) {
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
        result = await applyroom(config ?? createidleroomconfig())
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
        fitalltermsessions(Number(cols), Number(rows))
        result = {
          ok: true,
          cols: Number(cols),
          rows: Number(rows),
        }
        break
      }
      case 'synczedcafe': {
        const [cmd, generation] = args as [string, number]
        synczedcafestate(String(cmd), Number(generation))
        if (system) {
          haltzedcafetask(system)
        }
        result = { ok: true }
        break
      }
      case 'waitzedcafeready': {
        const [timeoutms] = args as [number?]
        if (!system?.isReady) {
          result = null
          break
        }
        result = await waitzedcafereadyrpc(
          system,
          readroot(),
          Number(timeoutms ?? 90_000),
          roomconfig.mode === 'vm',
        )
        break
      }
      case 'setzedcafeready': {
        const [ready] = args as [boolean]
        setzedcafereadylocal(!!ready)
        result = { ok: true }
        break
      }
      case 'haltzedcafe': {
        if (system) {
          haltzedcafetask(system)
        }
        resetzedcafestate()
        result = { ok: true }
        break
      }
      case 'readzedcafetaskrid': {
        result = readzedcafetaskridlocal()
        break
      }
      case 'readzedcafeexportfiles': {
        if (!system?.isReady) {
          result = []
          break
        }
        const root = readroot()
        if (roomconfig.mode === 'vm' && readzedcafereadylocal()) {
          result = await collectzedcafeexportramfsfiles(root)
          break
        }
        const taskrid = readzedcafetaskridlocal()
        if (!taskrid) {
          result = []
          break
        }
        result = await collectzedcafeexportfiles(root, taskrid)
        break
      }
      case 'pushzedcafeexport': {
        const [taskrid, files] = args as [
          string,
          { path: string; data: number[] }[],
        ]
        if (!system?.isReady) {
          throw new Error('wanix room not ready')
        }
        await pushzedcafeexportlive(readroot(), String(taskrid), files ?? [])
        result = { ok: true }
        break
      }
      case 'refreshvmzedcafeexport': {
        const [guestfiles] = args as [{ path: string; data: number[] }[]?]
        if (!system) {
          throw new Error('wanix system missing')
        }
        const count = refreshvmzedcafeguestfiles(system, guestfiles ?? [])
        result = { ok: true, count }
        break
      }
      default:
        replyrpc(source, id, { error: `unknown rpc: ${method}` })
        return
    }
    replyrpc(source, id, { result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
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
  if (data?.type !== WANIX_MSG_RPC) {
    return
  }
  void handlerrpc(data, event.source)
})

await customElements.whenDefined('wanix-system')
postidle()
