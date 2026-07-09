import type {
  WanixSystemElement,
  WanixTaskDriver,
  WanixVmElement,
} from 'zss/feature/wanix/wanixelements.d.ts'
import { wanixperfmark } from 'zss/feature/wanix/wanixperf'
import type { WanixRoomConfig } from 'zss/feature/wanix/wanixroomtypes'
import type { WanixBindDropPayload } from 'zss/feature/wanix/wanixroomtypes'
import {
  WANIX_LINUX_ARCHIVE_URL,
  WANIX_V86_ARCHIVE_URL,
  WANIX_ZEDCAFE_LINUX_OVERLAY_URL,
  createidleroomconfig,
} from 'zss/feature/wanix/wanixroomtypes'
import {
  WANIX_MSG_CELLS,
  WANIX_MSG_IDLE,
  WANIX_MSG_PARENT_RPC,
  WANIX_MSG_PARENT_RPC_RES,
  WANIX_MSG_READY,
  WANIX_MSG_RPC,
  WANIX_MSG_RPC_RES,
  WANIX_MSG_SESSION,
} from 'zss/feature/wanix/wanixrpcmessages'
import { resolvedriverforwasm } from 'zss/feature/wanix/wanixspawndriver'
import {
  WANIX_TERM_BRIDGE_PONG,
  trackwanixtermlinebuf,
} from 'zss/feature/wanix/wanixtermbridgesmoke'
import type { WANIX_TERM_GRID } from 'zss/feature/wanix/wanixtermgridstate'
import {
  createwanixtermgrid,
  readwanixtermgridsnapshot,
  wanixtermgridresize,
  wanixtermgridwritebytes,
} from 'zss/feature/wanix/wanixtermgridstate'
import {
  WANIX_INPUT_MOUNT,
  WANIX_ZEDCAFE_EXPORT_READY_POLL_MS,
  WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
  WANIX_ZEDCAFE_GUEST_MOUNT,
  WANIX_ZEDCAFE_TASK_ID,
  readwanixzedcafeexportsrc,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import {
  appendguestexportbind,
  collectzedcafeexportfiles,
  ensurezedcafeboot,
  haltzedcafetask,
  pushzedcafeexportlive,
  readguestfilebookcount,
  readzedcafeexportcontentready,
  readzedcafeexportlive,
  readzedcafeguestbound,
  readzedcafetaskridlocal,
  resetzedcafestate,
  setzedcafereadylocal,
  synczedcafestate,
  synczedcafewasmversionifneeded,
  waitzedcafeexportcontentready,
  waitzedcafereadyrpc,
  wireallguestroots,
} from 'zss/feature/wanix/wanixzedcafehost'
import type { WanixZedCafeGuestFile } from 'zss/feature/wanix/wanixzedcafetypes'

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
const WANIX_WASM_URL = '/wanix/wanix.wasm'
const ROOM_READY_TIMEOUT_MS = 180_000
const BIND_MOUNT_TIMEOUT_MS = 120_000
const VM_RID_WAIT_MS = 120_000
const TERM_CONNECT_TIMEOUT_MS = 30_000
const POLL_MS = 250
/** Auto-halt dropped wasm tasks after this much quiet (no term in/out). */
const TASK_IDLE_HALT_MS = 5 * 60 * 1000

type WanixSystemWithTerminals = WanixSystemElement & {
  _updateTerminals: (shim: {
    path: string
    _term: { cols: number; rows: number }
  }) => void
}

type TermSession = {
  alive: boolean
  kind: WanixSessionKind
  termpath: string
  lastcols: number
  lastrows: number
  lastcelldigest: string
  idletimer: ReturnType<typeof setTimeout> | null
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
const termlinebufs = new Map<string, string>()

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

let parentrpcseq = 0
const parentrpcwaiters = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>()
const vmpendingdropbinds: WanixBindDropPayload[] = []

function callparentrpc<T>(
  method: string,
  args?: unknown[],
  timeoutms = 30_000,
): Promise<T> {
  const id = ++parentrpcseq
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      parentrpcwaiters.delete(id)
      reject(new Error(`wanix parent rpc timeout: ${method}`))
    }, timeoutms)
    parentrpcwaiters.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value as T)
      },
      reject: (err) => {
        clearTimeout(timer)
        reject(err)
      },
    })
    window.parent.postMessage(
      { type: WANIX_MSG_PARENT_RPC, id, method, args },
      window.location.origin,
    )
  })
}

async function synczedcafeexportlocal(
  guestfiles?: WanixZedCafeGuestFile[] | null,
  removepaths: string[] = [],
): Promise<{ ok: boolean; taskrid: string | null }> {
  if (!system?.isReady || !roomconfig.zedcafe?.cmd) {
    return { ok: false, taskrid: null }
  }
  let files = guestfiles ?? null
  if (!files?.length && removepaths.length === 0) {
    files = await callparentrpc<WanixZedCafeGuestFile[]>(
      'requestzedcafestate',
      [],
    )
  }
  const cmd = roomconfig.zedcafe.cmd
  const taskrid = await ensurezedcafeboot(system, readroot(), cmd)
  if (!taskrid) {
    return { ok: false, taskrid: null }
  }
  const bookcount = readguestfilebookcount(files ?? [])
  if ((files?.length ?? 0) > 0 || removepaths.length > 0) {
    await pushzedcafeexportlive(readroot(), taskrid, files ?? [], removepaths)
  }
  if (bookcount > 0) {
    await wireallguestroots(system, taskrid)
    setzedcafereadylocal(true)
  }
  wanixperfmark('synczedcafeexport-end', {
    taskrid,
    bookcount,
    paths: files?.length ?? 0,
    removed: removepaths.length,
  })
  return { ok: true, taskrid }
}

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

function cleartaskidletimer(session: TermSession) {
  if (session.idletimer == null) {
    return
  }
  clearTimeout(session.idletimer)
  session.idletimer = null
}

function shouldautohalttask(sessionkey: string, session: TermSession) {
  return session.kind === 'task' && sessionkey !== WANIX_ZEDCAFE_TASK_ID
}

function scheduletaskidlehalt(sessionkey: string, session: TermSession) {
  cleartaskidletimer(session)
  if (!shouldautohalttask(sessionkey, session) || !session.alive) {
    return
  }
  session.idletimer = setTimeout(() => {
    session.idletimer = null
    if (!session.alive || !termsessions.has(sessionkey)) {
      return
    }
    wanixperfmark('task-idle-halt', {
      taskid: sessionkey,
      idlems: TASK_IDLE_HALT_MS,
    })
    halttask(sessionkey)
  }, TASK_IDLE_HALT_MS)
}

function touchtaskio(sessionkey: string, session: TermSession) {
  if (!shouldautohalttask(sessionkey, session)) {
    return
  }
  scheduletaskidlehalt(sessionkey, session)
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

function revokedropbindbloburls(root: ParentNode) {
  root.querySelectorAll('wanix-bind[data-zss-drop-bind]').forEach((el) => {
    const url = el.getAttribute('data-zss-drop-blob-url')
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
    el.remove()
  })
}

function removedropbindwithdst(root: ParentNode, dst: string) {
  root.querySelectorAll('wanix-bind[data-zss-drop-bind]').forEach((el) => {
    if (el.getAttribute('dst') !== dst) {
      return
    }
    const url = el.getAttribute('data-zss-drop-blob-url')
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
    el.remove()
  })
}

function appenddropbind(parent: ParentNode, spec: WanixBindDropPayload) {
  removedropbindwithdst(parent, spec.dst)
  const bloburl = URL.createObjectURL(new Blob([Uint8Array.from(spec.bytes)]))
  const bind = createbind(
    {
      type: spec.kind,
      dst: spec.dst,
      src: bloburl,
      perm: spec.perm,
    },
    'data-zss-drop-bind',
  )
  bind.setAttribute('data-zss-drop-blob-url', bloburl)
  parent.appendChild(bind)
}

function isvmstarted(vm: HTMLElement): boolean {
  return vm.hasAttribute('start')
}

function flushvmpendingdropbinds(vm: HTMLElement) {
  if (!vmpendingdropbinds.length) {
    return
  }
  const pending = [...vmpendingdropbinds]
  vmpendingdropbinds.length = 0
  for (let i = 0; i < pending.length; ++i) {
    appenddropbind(vm, pending[i])
  }
}

function binddroptask(sessionkey: string, spec: WanixBindDropPayload) {
  if (!system?.isReady) {
    throw new Error('wanix room not ready')
  }
  const task = system.querySelector(`wanix-task[id="${sessionkey}"]`)
  if (!task) {
    throw new Error(`wanix task missing: ${sessionkey}`)
  }
  appenddropbind(task, spec)
  return {
    ok: true,
    sessionkey,
    kind: 'task' as const,
    dst: spec.dst,
  }
}

function binddropvm(sessionkey: string, spec: WanixBindDropPayload) {
  if (!system?.isReady) {
    throw new Error('wanix room not ready')
  }
  const vm = system.querySelector('wanix-vm')
  if (!vm) {
    throw new Error(`wanix vm missing: ${sessionkey}`)
  }
  if (!isvmstarted(vm)) {
    removedropbindwithdst(vm, spec.dst)
    const index = vmpendingdropbinds.findIndex(
      (entry) => entry.dst === spec.dst,
    )
    if (index >= 0) {
      vmpendingdropbinds.splice(index, 1, spec)
    } else {
      vmpendingdropbinds.push(spec)
    }
    return {
      ok: true,
      sessionkey,
      kind: 'vm' as const,
      dst: spec.dst,
      staged: true,
    }
  }
  appenddropbind(vm, spec)
  return {
    ok: true,
    sessionkey,
    kind: 'vm' as const,
    dst: spec.dst,
  }
}

function binddrop(sessionkey: string, spec: WanixBindDropPayload) {
  if (!spec.dst.startsWith(`${WANIX_INPUT_MOUNT}/`)) {
    throw new Error(`wanix bind dst must be under ${WANIX_INPUT_MOUNT}/`)
  }
  const sessionkind = readsessionsessionkind(sessionkey)
  if (sessionkind === 'vm') {
    return binddropvm(sessionkey, spec)
  }
  return binddroptask(sessionkey, spec)
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
        touchtaskio(sessionkey, session)
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

function maybeapplytermbridgesmokereply(
  sessionkey: string,
  session: TermSession,
  text: string,
) {
  if (readsessionsessionkind(sessionkey) === 'vm') {
    return
  }
  const prev = termlinebufs.get(sessionkey) ?? ''
  const { nextbuf, pong } = trackwanixtermlinebuf(prev, text)
  termlinebufs.set(sessionkey, nextbuf)
  if (!pong || !session.grid) {
    return
  }
  wanixtermgridwritebytes(
    session.grid,
    termencoder.encode(WANIX_TERM_BRIDGE_PONG),
    termdecoder,
  )
  postcells(sessionkey, session)
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
  cleartaskidletimer(session)
  session.disconnect()
  termsessions.delete(sessionkey)
  termlinebufs.delete(sessionkey)
  if (readsessionsessionkind(sessionkey) === 'task') {
    const task = system?.querySelector(`wanix-task[id="${sessionkey}"]`)
    if (task) {
      revokedropbindbloburls(task)
    }
  } else if (readsessionsessionkind(sessionkey) === 'vm') {
    vmpendingdropbinds.length = 0
    const vm = system?.querySelector('wanix-vm')
    if (vm) {
      revokedropbindbloburls(vm)
    }
  }
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
    kind: sessionkind,
    termpath,
    lastcols: WINCH_SENTINEL,
    lastrows: WINCH_SENTINEL,
    lastcelldigest: '',
    idletimer: null,
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
      cleartaskidletimer(this)
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
  // Post noise cells before open so the host has a frame when it attaches.
  postcells(sessionkey, session)
  postsession('open', sessionkey, sessionkind)
  setactivesession(sessionkey)
  scheduletaskidlehalt(sessionkey, session)
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

function appendtaskroombinds(sys: WanixSystemElement, config: WanixRoomConfig) {
  // Never bind `#ramfs` at `.` — staging stays internal; user surface is `./zedcafe/` only.
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
  sys.appendChild(
    createbind(
      { type: 'archive', dst: '.', src: WANIX_ZEDCAFE_LINUX_OVERLAY_URL },
      'data-zss-zedcafe-linux-overlay-bind',
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

function pruneusertasks(sys: WanixSystemElement) {
  for (const task of [...sys.querySelectorAll('wanix-task')]) {
    task.remove()
  }
  roomconfig.tasks = []
}

function prunevmfromsystem(sys: WanixSystemElement) {
  sys.querySelector('wanix-vm')?.remove()
  sys.querySelector('[data-zss-linux-bind]')?.remove()
  sys.querySelector('[data-zss-zedcafe-linux-overlay-bind]')?.remove()
  sys.querySelector('[data-zss-v86-bind]')?.remove()
  for (const bind of sys.querySelectorAll('wanix-bind')) {
    if (bind.getAttribute('dst') === 'vm') {
      bind.remove()
    }
  }
  roomconfig.vm = undefined
}

function softidlewanixsystem(sys: WanixSystemElement) {
  haltzedcafetask(sys)
  pruneusertasks(sys)
  haltzedcafetask(sys)
  prunevmfromsystem(sys)
  disconnectalltermsessions()
  resetzedcafestate()
  wanixperfmark('applyroom-soft-idle')
}

async function warmstartvm(): Promise<{
  vmid: string
  vrid: string | null
  mem: string
} | null> {
  const vm = roomconfig.vm
  if (!system?.isReady || !vm?.active) {
    return null
  }
  if (!system.querySelector('wanix-vm')) {
    appendvmroombinds(system)
    const vmel = document.createElement('wanix-vm')
    setwanixattrs(vmel, {
      id: vm.id,
      export: 'ttyS0',
      mem: vm.mem,
      term: true,
    })
    system.appendChild(vmel)
  }
  await waitvmlinuxmount()
  await connectvmtermsession()
  const vmel = system.querySelector('wanix-vm')
  if (vmel && typeof vmel.start === 'function') {
    await vmel.start()
  }
  const vrid = vmel
    ? await waitforvmrid(vmel, Date.now() + VM_RID_WAIT_MS)
    : null
  return { vmid: vm.id, vrid, mem: vm.mem }
}

async function warmactivateroom(): Promise<Record<string, unknown>> {
  if (!system?.isReady) {
    throw new Error('wanix warm apply: system not ready')
  }
  wanixperfmark('applyroom-warm-reuse', { mode: roomconfig.mode })
  if (roomconfig.zedcafe?.cmd) {
    const spec = roomconfig.zedcafe
    synczedcafestate(spec.cmd, spec.generation)
    synczedcafewasmversionifneeded(system)
  }
  if (roomconfig.mode === 'vm' && roomconfig.vm?.active) {
    const vmstatus = await warmstartvm()
    if (roomconfig.zedcafe?.cmd) {
      await ensurezedcafeboot(system, readroot(), roomconfig.zedcafe.cmd)
    }
    postready()
    return {
      ok: true,
      mode: 'vm',
      mountkey: lastmountkey,
      warm: true,
      vmid: vmstatus?.vmid,
      vrid: vmstatus?.vrid ?? null,
      mem: vmstatus?.mem,
    }
  }
  if (roomconfig.mode === 'task' && roomconfig.zedcafe?.cmd) {
    await ensurezedcafeboot(system, readroot(), roomconfig.zedcafe.cmd)
  }
  postready()
  return {
    ok: true,
    mode: roomconfig.mode,
    mountkey: lastmountkey,
    warm: true,
  }
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
    if (system?.isReady && !roomconfig.hardreset) {
      softidlewanixsystem(system)
      lastmountkey = roomconfig.mountkey
      postidle()
      wanixperfmark('applyroom-return', { mode: 'idle', soft: true })
      return { ok: true, mode: 'idle', mountkey: lastmountkey, soft: true }
    }
    if (system) {
      haltzedcafetask(system)
    }
    disconnectalltermsessions()
    vmpendingdropbinds.length = 0
    host.replaceChildren()
    system = null
    lastmountkey = roomconfig.mountkey
    resetzedcafestate()
    postidle()
    wanixperfmark('applyroom-remount', { mode: 'idle', hard: true })
    wanixperfmark('applyroom-return', { mode: 'idle', hard: true })
    return { ok: true, mode: 'idle', mountkey: lastmountkey, hard: true }
  }

  if (
    !roomconfig.hardreset &&
    lastmountkey === roomconfig.mountkey &&
    system?.isConnected &&
    system.isReady
  ) {
    if (roomconfig.zedcafe?.cmd) {
      synczedcafewasmversionifneeded(system)
    }
    const warm = await warmactivateroom()
    wanixperfmark('applyroom-return', { mode: roomconfig.mode, warm: true })
    return warm
  }

  await customElements.whenDefined('wanix-system')
  disconnectalltermsessions()
  const next = buildroomtree(roomconfig)
  host.replaceChildren()
  host.appendChild(next)
  system = next
  lastmountkey = roomconfig.mountkey
  wanixperfmark('applyroom-remount', { mode: roomconfig.mode })

  await waitsystemready(system)
  postready()

  if (roomconfig.zedcafe?.cmd) {
    const spec = roomconfig.zedcafe
    synczedcafestate(spec.cmd, spec.generation)
  }

  if (roomconfig.mode === 'vm' && roomconfig.vm?.active) {
    await waitvmlinuxmount()
    const vmel = system.querySelector('wanix-vm')
    if (vmel) {
      await connectvmtermsession()
      if (typeof vmel.start === 'function') {
        await vmel.start()
      }
      flushvmpendingdropbinds(vmel)
    }
    const vrid = vmel
      ? await waitforvmrid(vmel, Date.now() + VM_RID_WAIT_MS)
      : null
    if (roomconfig.zedcafe?.cmd) {
      await ensurezedcafeboot(system, readroot(), roomconfig.zedcafe.cmd)
    }
    wanixperfmark('applyroom-return', { mode: 'vm', remount: true })
    return {
      ok: true,
      mode: 'vm',
      mountkey: lastmountkey,
      vmid: roomconfig.vm.id,
      vrid,
      mem: roomconfig.vm.mem,
    }
  }

  if (roomconfig.mode === 'task' && roomconfig.zedcafe?.cmd) {
    await ensurezedcafeboot(system, readroot(), roomconfig.zedcafe.cmd)
  }

  wanixperfmark('applyroom-return', { mode: roomconfig.mode, remount: true })
  return { ok: true, mode: roomconfig.mode, mountkey: lastmountkey }
}

function removetargetpair(taskid: string) {
  disconnecttermsession(taskid, { notifyclose: true })
  system?.querySelector(`wanix-task[id="${taskid}"]`)?.remove()
  roomconfig.tasks = roomconfig.tasks.filter((entry) => entry.id !== taskid)
}

async function resolvedriverforcmd(
  cmd: string,
  driverhint?: WanixTaskDriver | null,
): Promise<WanixTaskDriver> {
  if (driverhint) {
    return driverhint
  }
  const bytes = await readroot().readFile(cmd)
  return resolvedriverforwasm(cmd, null, bytes)
}

async function waitlocalzedcafetaskrid(): Promise<string | null> {
  if (readzedcafetaskridlocal(system)) {
    return readzedcafetaskridlocal(system)
  }
  if (!system) {
    return null
  }
  return waitzedcafereadyrpc(
    system,
    readroot(),
    WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
  )
}

async function readzedcafeexportstatsready(
  root: ReturnType<typeof readroot>,
  base: string,
): Promise<boolean> {
  return readzedcafeexportcontentready(root, base)
}

async function waitzedcafeexportstatsatroot(
  root: ReturnType<typeof readroot>,
  taskrid: string,
  timeoutms = WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
): Promise<boolean> {
  const exportsrc = readwanixzedcafeexportsrc(taskrid)
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    if (await readzedcafeexportstatsready(root, exportsrc)) {
      return true
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_ZEDCAFE_EXPORT_READY_POLL_MS),
    )
  }
  return false
}

async function spawntask(
  taskid: string,
  cmd: string,
  driverhint?: WanixTaskDriver | null,
) {
  if (!system?.isReady) {
    throw new Error('wanix room not ready')
  }
  if (system.querySelector(`wanix-task[id="${taskid}"]`)) {
    return { ok: true, already: true, taskid }
  }

  const driver = await resolvedriverforcmd(cmd, driverhint)
  const task = document.createElement('wanix-task')
  setwanixattrs(task, {
    id: taskid,
    type: driver,
    term: true,
    cmd,
  })
  task.setAttribute('data-zss-target-id', taskid)
  task.setAttribute('data-zss-target-kind', 'task')
  if (driver === 'gojs') {
    const taskrid = await waitlocalzedcafetaskrid()
    if (!taskrid) {
      throw new Error(
        'zedcafe export not ready — drop a wasm task after books are loaded in memory',
      )
    }
    const exportsrc = readwanixzedcafeexportsrc(taskrid)
    if (!(await readzedcafeexportstatsready(readroot(), exportsrc))) {
      if (!(await waitzedcafeexportstatsatroot(readroot(), taskrid))) {
        throw new Error(
          'zedcafe export not ready — stats.json missing from export tree',
        )
      }
    }
    appendguestexportbind(task, taskrid)
  }
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
    mountkey: roomconfig.mountkey,
    hardreset: false,
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
        const [taskid, cmd, driverhint] = args as [
          string,
          string,
          WanixTaskDriver | null | undefined,
        ]
        result = await spawntask(
          String(taskid),
          String(cmd),
          driverhint ?? undefined,
        )
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
      case 'binddrop': {
        const [sessionkey, spec] = args as [string, WanixBindDropPayload?]
        if (!spec || typeof sessionkey !== 'string') {
          throw new Error('wanix binddrop args invalid')
        }
        result = binddrop(sessionkey, spec)
        break
      }
      case 'termwrite': {
        const [linedata, sessionkey] = args as [string?, string?]
        const key =
          sessionkey != null && sessionkey !== ''
            ? String(sessionkey)
            : activesessionkey
        const session = readtermsession(key)
        const text = String(linedata ?? '')
        await session.write(text)
        if (key) {
          if (text.length > 0) {
            touchtaskio(key, session)
          }
          maybeapplytermbridgesmokereply(key, session, text)
        }
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
      case 'waitzedcafecontentready': {
        const [taskrid, timeoutms] = args as [string, number?]
        if (!system?.isReady) {
          result = false
          break
        }
        result = await waitzedcafeexportcontentready(
          readroot(),
          String(taskrid),
          Number(timeoutms ?? WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS),
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
        result = readzedcafetaskridlocal(system)
        break
      }
      case 'readzedcafeexportfiles': {
        if (!system?.isReady) {
          result = []
          break
        }
        const root = readroot()
        const taskrid = readzedcafetaskridlocal(system)
        if (!taskrid) {
          result = []
          break
        }
        result = await collectzedcafeexportfiles(root, taskrid)
        break
      }
      case 'synczedcafeexport': {
        const [files, removepaths] = args as [
          { path: string; data: number[] }[] | null | undefined,
          string[] | null | undefined,
        ]
        if (!system?.isReady) {
          throw new Error('wanix room not ready')
        }
        const guestfiles =
          files?.map((file) => ({
            path: file.path,
            data: file.data,
          })) ?? null
        result = await synczedcafeexportlocal(
          guestfiles,
          Array.isArray(removepaths) ? removepaths : [],
        )
        break
      }
      case 'iszedcafeexportlive': {
        const [taskrid] = args as [string?]
        if (!system?.isReady) {
          result = false
          break
        }
        const rid = String(taskrid ?? readzedcafetaskridlocal(system) ?? '')
        if (!rid) {
          result = false
          break
        }
        result = await readzedcafeexportlive(readroot(), rid)
        break
      }
      case 'iszedcafeguestbound': {
        if (!system?.isReady) {
          result = false
          break
        }
        result = await readzedcafeguestbound(readroot(), system)
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
  const data = event.data as WanixRpcMessage & {
    type?: string
    id?: number
    error?: string
    result?: unknown
  }
  if (data?.type === WANIX_MSG_PARENT_RPC_RES) {
    const id = data.id
    if (typeof id !== 'number') {
      return
    }
    const waiter = parentrpcwaiters.get(id)
    if (!waiter) {
      return
    }
    parentrpcwaiters.delete(id)
    if (typeof data.error === 'string' && data.error.length > 0) {
      waiter.reject(new Error(data.error))
      return
    }
    waiter.resolve(data.result)
    return
  }
  if (data?.type !== WANIX_MSG_RPC) {
    return
  }
  void handlerrpc(data, event.source)
})

await customElements.whenDefined('wanix-system')
postidle()
