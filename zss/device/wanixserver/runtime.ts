import { createmessage } from 'zss/device'
import {
  wanixclientapplyroom,
  wanixclientbindfsa,
  wanixclientcells,
  wanixclientidle,
  wanixclientready,
  wanixclientrequestzedcafestate,
  wanixclientsession,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { resolvedriverforwasm } from 'zss/device/wanixserver/spawndriver'
import {
  type TermSession,
  type WanixSessionEvent,
  type WanixSessionKind,
  type WanixSystemWithTerminals,
  activesessionkey,
  clearsessionconnectorder,
  clearvmpendingdropbinds,
  deletetermlinebuf,
  deletetermsession,
  forgettermsessionconnect,
  iswanixelementready,
  lastfitcols,
  lastfitrows,
  lastmountkey,
  pruneworkerroomtask,
  queuevmpendingdropbind,
  readliveconnectorder,
  readsessionsessionkind,
  readtermlinebuf,
  readtermsession,
  readwanixelementinstanceid,
  recordtermfit,
  recordtermsessionconnect,
  requirewanixsystem,
  roomconfig,
  setactivesessionkey,
  setlastmountkey,
  setroomconfig,
  settermlinebuf,
  settermsession,
  setwanixsystem,
  system,
  takependingdropbinds,
  termsessions,
} from 'zss/device/wanixserver/state'
import { shouldautohalttasksession } from 'zss/device/wanixserver/taskidlepolicy'
import {
  WANIX_TERM_BRIDGE_PONG,
  trackwanixtermlinebuf,
} from 'zss/device/wanixserver/termbridgesmoke'
import { uniquewanixtaskid } from 'zss/device/wanixserver/wanixcmd'
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
} from 'zss/device/wanixserver/zedcafehost'
import type {
  WanixSystemElement,
  WanixTaskDriver,
  WanixVmElement,
} from 'zss/feature/wanix/wanixelements.d.ts'
import {
  WANIX_FSA_BIND_REQUEST,
  WANIX_FSA_HANDLE_GLOBAL,
  sanitizewanixfsadst,
} from 'zss/feature/wanix/wanixfsapaths'
import { wanixperfmark } from 'zss/feature/wanix/wanixperf'
import type {
  WanixBindDropPayload,
  WanixRemoteSpec,
  WanixRoomConfig,
} from 'zss/feature/wanix/wanixroomtypes'
import {
  WANIX_LINUX_ARCHIVE_URL,
  WANIX_V86_ARCHIVE_URL,
  WANIX_ZEDCAFE_LINUX_OVERLAY_URL,
} from 'zss/feature/wanix/wanixroomtypes'
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
  WANIX_ZEDCAFE_TASK_ID,
  WANIX_ZEDCAFE_WASM_CMD,
  WANIX_ZEDSYNC_TASK_ID,
  readwanixzedcafeexportsrc,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import type { WanixZedCafeGuestFile } from 'zss/feature/wanix/wanixzedcafetypes'
import { hub } from 'zss/hub'
import { isstring } from 'zss/mapping/types'

import 'zss/device/wanixserver'

let wanixhubjoined = false

function joinwanixhub(session: string) {
  if (!session || wanixhubjoined) {
    return
  }
  wanixhubjoined = true
  hub.join(session)
  // Latch device sessions without rebroadcasting ready to the cafe tab.
  hub.invokelocal(createmessage(session, '', 'platform', 'ready'))
}

const WINCH_SENTINEL = -1

const DEFAULT_VM_ID = 'linux-vm'
const DEFAULT_VM_MEM = '512M'

// The published wanix npm dist ships a TinyGo-compiled wanix.wasm whose
// syscall/js runtime corrupts under load (upstream tractordev/wanix#171),
// crashing the guest during heavy terminal I/O. Point <wanix-namespace> at a
// full-Go build served from cafe/public so the loader uses the stable Go glue.
const WANIX_WASM_URL = '/wanix/wanix.wasm?v=closefd-unlock-20260718'
const ROOM_READY_TIMEOUT_MS = 180_000
const BIND_MOUNT_TIMEOUT_MS = 120_000
const REMOTE_MOUNT_TIMEOUT_MS = 60_000
const VM_RID_WAIT_MS = 120_000
const TERM_CONNECT_TIMEOUT_MS = 30_000
const POLL_MS = 250
/** Auto-halt dropped wasm tasks after this much quiet (no term in/out). */
const TASK_IDLE_HALT_MS = 5 * 60 * 1000

const hostel = document.getElementById('wanix-host')
if (!hostel) {
  throw new Error('wanix-host missing')
}
const host: HTMLElement = hostel

const termencoder = new TextEncoder()
const termdecoder = new TextDecoder()

let pendingsynczedcaferemovepaths: string[] | null = null
let pendingrequestzedcafeexport: {
  resolve: (result: { ok: boolean; taskrid: string | null }) => void
  timer: ReturnType<typeof setTimeout>
} | null = null

function settlependingrequestzedcafeexport(result: {
  ok: boolean
  taskrid: string | null
}) {
  const waiter = pendingrequestzedcafeexport
  if (!waiter) {
    return
  }
  clearTimeout(waiter.timer)
  pendingrequestzedcafeexport = null
  waiter.resolve(result)
}

async function synczedcafeexportlocal(
  guestfiles?: WanixZedCafeGuestFile[] | null,
  removepaths: string[] = [],
): Promise<{ ok: boolean; taskrid: string | null; pending?: boolean }> {
  const sys = system
  if (!sys || !iswanixelementready(sys) || !roomconfig.zedcafe?.cmd) {
    return { ok: false, taskrid: null }
  }
  // null = need parent pull; [] = parent answered with empty tree (do not re-request)
  if (guestfiles == null && removepaths.length === 0) {
    pendingsynczedcaferemovepaths = removepaths
    wanixclientrequestzedcafestate(SOFTWARE, '')
    return { ok: false, taskrid: null, pending: true }
  }
  const files = guestfiles ?? []
  const cmd = roomconfig.zedcafe.cmd
  const taskrid = await ensurezedcafeboot(sys, readroot(), cmd)
  if (!taskrid) {
    return { ok: false, taskrid: null }
  }
  const bookcount = readguestfilebookcount(files)
  if (files.length > 0 || removepaths.length > 0) {
    await pushzedcafeexportlive(readroot(), taskrid, files, removepaths)
  }
  if (bookcount > 0) {
    await wireallguestroots(sys, taskrid)
    setzedcafereadylocal(true)
  }
  wanixperfmark('synczedcafeexport-end', {
    taskrid,
    bookcount,
    paths: files.length,
    removed: removepaths.length,
  })
  return { ok: true, taskrid }
}

/** Parent answered wanixclient:requestzedcafestate with file payload. */
export async function continuerequestzedcafestate(
  files: WanixZedCafeGuestFile[],
) {
  const removepaths = pendingsynczedcaferemovepaths ?? []
  pendingsynczedcaferemovepaths = null
  const result = await synczedcafeexportlocal(files, removepaths)
  settlependingrequestzedcafeexport(result)
  return result
}

async function pullzedcafeexportfromparent(): Promise<{
  ok: boolean
  taskrid: string | null
}> {
  if (!iswanixelementready(system) || !roomconfig.zedcafe?.cmd) {
    return { ok: false, taskrid: null }
  }
  settlependingrequestzedcafeexport({ ok: false, taskrid: null })
  return new Promise((resolve, reject) => {
    // Drop / applyroom must not park for the full content-ready budget when
    // the parent never answers. Content sync still uses the long timeout.
    const ZEDCAFE_EXPORT_PULL_TIMEOUT_MS = 30_000
    const timer = setTimeout(() => {
      if (pendingrequestzedcafeexport) {
        pendingrequestzedcafeexport = null
        reject(new Error('zedcafe export request timed out'))
      }
    }, ZEDCAFE_EXPORT_PULL_TIMEOUT_MS)
    pendingrequestzedcafeexport = {
      resolve: (result) => {
        clearTimeout(timer)
        pendingrequestzedcafeexport = null
        resolve(result)
      },
      timer,
    }
    pendingsynczedcaferemovepaths = []
    wanixclientrequestzedcafestate(SOFTWARE, '')
  })
}

function postready() {
  wanixclientready(SOFTWARE, '')
}

function postidle() {
  wanixclientidle(SOFTWARE, '')
}

function postsession(
  event: WanixSessionEvent,
  sessionkey: string,
  kind?: WanixSessionKind,
) {
  wanixclientsession(SOFTWARE, '', {
    event,
    sessionkey,
    kind,
  })
}

function recomputeactivesession() {
  const live = readliveconnectorder()
  if (live.length === 0) {
    setactivesessionkey(null)
    return
  }
  const next = live[live.length - 1]
  setactivesessionkey(next)
  postsession('active', next, readsessionsessionkind(next))
}

function setactivesession(sessionkey: string) {
  setactivesessionkey(sessionkey)
  postsession('active', sessionkey, readsessionsessionkind(sessionkey))
}

function notifytermsessionclose(sessionkey: string) {
  forgettermsessionconnect(sessionkey)
  pruneworkerroomtask(sessionkey)
  postsession('close', sessionkey)
  if (activesessionkey === sessionkey) {
    setactivesessionkey(null)
    recomputeactivesession()
  }
}

function handletermsessioneof(sessionkey: string) {
  const session = termsessions.get(sessionkey)
  if (!session?.alive) {
    return
  }
  session.disconnect()
  deletetermsession(sessionkey)
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
  return shouldautohalttasksession(session.kind, sessionkey)
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
  const pending = takependingdropbinds()
  for (let i = 0; i < pending.length; ++i) {
    appenddropbind(vm, pending[i])
  }
}

function binddroptask(sessionkey: string, spec: WanixBindDropPayload) {
  const sys = requirewanixsystem()
  const task = sys.querySelector(`wanix-task[id="${sessionkey}"]`)
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
  const sys = requirewanixsystem()
  const vm = sys.querySelector('wanix-vm')
  if (!vm) {
    throw new Error(`wanix vm missing: ${sessionkey}`)
  }
  if (!isvmstarted(vm)) {
    removedropbindwithdst(vm, spec.dst)
    queuevmpendingdropbind(spec)
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

export function binddrop(sessionkey: string, spec: WanixBindDropPayload) {
  if (!spec.dst.startsWith(`${WANIX_INPUT_MOUNT}/`)) {
    throw new Error(`wanix bind dst must be under ${WANIX_INPUT_MOUNT}/`)
  }
  const sessionkind = readsessionsessionkind(sessionkey)
  if (sessionkind === 'vm') {
    return binddropvm(sessionkey, spec)
  }
  return binddroptask(sessionkey, spec)
}

async function tryunbindroot(
  root: { unbind: (src: string, dst: string) => Promise<void> },
  src: string,
  dst: string,
): Promise<void> {
  try {
    await root.unbind(src, dst)
  } catch {
    // dst may not be bound yet
  }
}

function removefsabindmarkers(sys: ParentNode, dst: string) {
  sys.querySelectorAll('wanix-bind[data-zss-fsa-bind]').forEach((el) => {
    if (
      el.getAttribute('data-zss-fsa-dst') === dst ||
      el.getAttribute('dst') === dst
    ) {
      el.remove()
    }
  })
}

/** Live-mount a FileSystemDirectoryHandle at dst via #web/fsa/new. */
export async function bindfsadirectory(
  handle: FileSystemDirectoryHandle,
  dst: string,
): Promise<{ ok: boolean; dst: string }> {
  const mountdst = sanitizewanixfsadst(dst)
  if (!mountdst) {
    throw new Error(`wanix fsa dst invalid: ${dst}`)
  }
  const sys = requirewanixsystem()
  const root = sys.root
  removefsabindmarkers(sys, mountdst)
  await tryunbindroot(root, '#web/fsa/new', mountdst)
  ;(window as unknown as Record<string, unknown>)[WANIX_FSA_HANDLE_GLOBAL] =
    handle
  try {
    await root.bind('#web/fsa/new', mountdst)
  } catch (err) {
    ;(window as unknown as Record<string, unknown>)[WANIX_FSA_HANDLE_GLOBAL] =
      undefined
    throw err
  }
  const bind = createbind(
    {
      dst: mountdst,
      src: '#web/fsa/new',
    },
    'data-zss-fsa-bind',
  )
  bind.setAttribute('data-zss-fsa-dst', mountdst)
  sys.appendChild(bind)
  return { ok: true, dst: mountdst }
}

/** Dsts currently tracked as cafe folder mounts. */
export function readfsabinds(): string[] {
  if (!system) {
    return []
  }
  const out: string[] = []
  system.querySelectorAll('wanix-bind[data-zss-fsa-bind]').forEach((el) => {
    const dst =
      el.getAttribute('data-zss-fsa-dst') ?? el.getAttribute('dst') ?? ''
    if (dst && !out.includes(dst)) {
      out.push(dst)
    }
  })
  return out
}

function readroot() {
  return requirewanixsystem().root
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
  wanixclientcells(SOFTWARE, '', {
    sessionkey,
    snapshot,
  })
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
  const sys = requirewanixsystem()
  // Wasm attaches _updateTerminals on the kernel (window.__wanix[id]), not the
  // host element — same split as _setupNamespace / isReady.
  const kernel = (
    sys as WanixSystemElement & {
      _kernel?: WanixSystemWithTerminals | null
    }
  )._kernel
  const updateterminals = kernel?._updateTerminals
  if (!kernel || typeof updateterminals !== 'function') {
    throw new Error('wanix _updateTerminals missing')
  }
  return updateterminals.bind(kernel)
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
  // Resize the ZSS cell grid first so the host attach panel tracks termfit
  // even if the kernel winch notify is a no-op / throws.
  resizesessiongrid(sessionkey, session, nextcols, nextrows)
  const shim = {
    path: session.termpath,
    _term: { cols: nextcols, rows: nextrows },
  }
  updateterminals(shim)
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
  const prev = readtermlinebuf(sessionkey)
  const { nextbuf, pong } = trackwanixtermlinebuf(prev, text)
  settermlinebuf(sessionkey, nextbuf)
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
  deletetermsession(sessionkey)
  deletetermlinebuf(sessionkey)
  if (readsessionsessionkind(sessionkey) === 'task') {
    const task = system?.querySelector(`wanix-task[id="${sessionkey}"]`)
    if (task) {
      revokedropbindbloburls(task)
    }
  } else if (readsessionsessionkind(sessionkey) === 'vm') {
    clearvmpendingdropbinds()
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
      setactivesessionkey(null)
      recomputeactivesession()
    }
  }
}

function disconnectalltermsessions() {
  for (const key of [...termsessions.keys()]) {
    disconnecttermsession(key)
  }
  setactivesessionkey(null)
  clearsessionconnectorder()
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
  settermsession(sessionkey, session)
  recordtermsessionconnect(sessionkey)
  // Post noise cells before open so the host has a frame when it attaches.
  postcells(sessionkey, session)
  postsession('open', sessionkey, sessionkind)
  setactivesession(sessionkey)
  scheduletaskidlehalt(sessionkey, session)
  void readtermloop(sessionkey, session)
  return session
}

function readvmtermpath(vmel: WanixVmElement) {
  if (typeof vmel.term === 'string' && vmel.term.length > 0) {
    return vmel.term
  }
  return '#vm/1/term'
}

async function connectvmtermsession() {
  const vm = roomconfig.vm
  const sys = system
  if (!vm?.active || !sys || !iswanixelementready(sys)) {
    return
  }
  const vmel = sys.querySelector('wanix-vm')
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

type BindImportHost = HTMLElement & {
  import?: PromiseLike<unknown>
  dst?: string | null
  src?: string | null
  type?: string | null
}

type WanixKernelSetup = {
  _setupNamespace: (
    tid: string,
    basefs: string,
    bindings: Element[] | NodeListOf<Element>,
  ) => Promise<unknown>
}

type WanixSystemWithKernel = WanixSystemElement & {
  _kernel?: WanixKernelSetup | null
}

/**
 * Mount remotes AFTER wanix-namespace is ready so import AwaitErr cannot block
 * initial ready / zedcafe boot. Keep import Promises pending until after
 * `_setupNamespace` starts (Go Call("then")), then allowfulfill.
 *
 * `_setupNamespace` lives on the kernel (`sys._kernel`), not the host element.
 */
async function mountremotesafterready(
  sys: WanixSystemElement,
  remotes: WanixRemoteSpec[],
): Promise<void> {
  if (remotes.length === 0) {
    return
  }
  const {
    patchwanixbindwss,
    opengatedwssimport,
    iswssremoteurl,
    WSS_IMPORT_FULFILL_DELAY_MS,
  } = await import('zss/device/wanixserver/patchwanixbindwss')
  patchwanixbindwss()
  for (const el of [
    ...sys.querySelectorAll('wanix-bind[data-zss-remote-id]'),
  ]) {
    el.remove()
  }

  const gates: ReturnType<typeof opengatedwssimport>[] = []
  for (const remote of remotes) {
    if (!iswssremoteurl(remote.url)) {
      throw new Error(
        `wanix remote url must be wss:// (got ${remote.url} for ${remote.dst})`,
      )
    }
    const gated = opengatedwssimport(remote.url)
    gated.dial()
    const bind = createbind({
      type: 'import',
      dst: remote.dst,
      src: remote.url,
    }) as BindImportHost
    bind.setAttribute('data-zss-remote-id', remote.id)
    bind.type = 'import'
    bind.dst = remote.dst
    bind.src = remote.url
    // Thenable (not Promise) so Go Call("then") hits our forwarder first.
    // Assign before and after appendChild: connectedCallback (CDN or a missed
    // WSS patch) can replace import with an iframe Promise during connect.
    bind.import = gated.thenable
    sys.appendChild(bind)
    bind.import = gated.thenable
    gates.push(gated)
    wanixperfmark('remote-wss-import-assigned', {
      dst: remote.dst,
      url: remote.url,
      hasImport: bind.import != null,
      isPromise: bind.import instanceof Promise,
      hasThen: typeof bind.import?.then,
    })
  }

  wanixperfmark('remote-import-post-ready', {
    count: remotes.length,
    urls: remotes.map((remote) => remote.url),
  })

  // Prefer a live NodeList like wanix-namespace ready path (not a plain Array).
  const bindlist = sys.querySelectorAll('wanix-bind[data-zss-remote-id]')
  wanixperfmark('remote-import-pre-setup', {
    bindCount: bindlist.length,
    imports: [...bindlist].map((el) => ({
      dst: el.getAttribute('dst'),
      hasImport: !!(el as BindImportHost).import,
      isPromise: (el as BindImportHost).import instanceof Promise,
      hasThen: typeof (el as BindImportHost).import?.then,
    })),
  })

  const kernel = (sys as WanixSystemWithKernel)._kernel
  if (!kernel || typeof kernel._setupNamespace !== 'function') {
    throw new Error('wanix remote mount: kernel _setupNamespace missing')
  }
  // Go Call("then") on thenable while gated promise still pending — then release.
  const setup = kernel._setupNamespace('1', '', bindlist)
  try {
    await Promise.all(gates.map((gate) => gate.waitforthen(10_000)))
  } catch (err) {
    wanixperfmark('remote-import-then-timeout', {
      error: err instanceof Error ? err.message : String(err),
      thencounts: gates.map((gate) => gate.readthencount()),
    })
    throw err instanceof Error
      ? err
      : new Error(`wanix remote import then wait failed: ${String(err)}`)
  }
  // Small yield after Call("then") before fulfill (park-safety).
  await new Promise<void>((resolve) =>
    setTimeout(resolve, WSS_IMPORT_FULFILL_DELAY_MS),
  )
  for (let i = 0; i < gates.length; ++i) {
    gates[i].allowfulfill()
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      setup,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error('wanix remote mount timeout'))
        }, REMOTE_MOUNT_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  }

  await verifyremotemounts(sys, remotes)
  wanixperfmark('remote-import-bound', { count: remotes.length })
}

/** Fail applyroom if Go never bound the remote import into the root NS. */
async function verifyremotemounts(
  sys: WanixSystemElement,
  remotes: WanixRemoteSpec[],
): Promise<void> {
  const root = sys.root
  for (const remote of remotes) {
    try {
      await root.readDir(remote.dst)
      wanixperfmark('remote-verify-ok', { dst: remote.dst, url: remote.url })
    } catch (err) {
      wanixperfmark('remote-verify-failed', {
        dst: remote.dst,
        url: remote.url,
        error: err instanceof Error ? err.message : String(err),
      })
      throw new Error(
        `wanix remote not mounted at "${remote.dst}" (${remote.url}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
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
  const sys = document.createElement('wanix-namespace')
  setwanixattrs(sys, {
    id: 'wanix-namespace',
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
  if (iswanixelementready(sys)) {
    return Promise.resolve()
  }
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      sys.removeEventListener('ready', onready)
      reject(new Error('wanix-namespace ready timeout'))
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
        reject(new Error('wanix-namespace error'))
      },
      { once: true },
    )
    // Ready may have fired between the initial check and listener attach.
    if (iswanixelementready(sys)) {
      clearTimeout(timer)
      sys.removeEventListener('ready', onready)
      resolve()
    }
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
  const sys = system
  if (!sys || !iswanixelementready(sys) || !vm?.active) {
    return null
  }
  if (!sys.querySelector('wanix-vm')) {
    appendvmroombinds(sys)
    const vmel = document.createElement('wanix-vm')
    setwanixattrs(vmel, {
      id: vm.id,
      export: 'ttyS0',
      mem: vm.mem,
      term: true,
    })
    sys.appendChild(vmel)
  }
  await waitvmlinuxmount()
  await connectvmtermsession()
  const vmel = sys.querySelector('wanix-vm')
  if (vmel && typeof vmel.start === 'function') {
    await vmel.start()
  }
  const vrid = vmel
    ? await waitforvmrid(vmel, Date.now() + VM_RID_WAIT_MS)
    : null
  return { vmid: vm.id, vrid, mem: vm.mem }
}

/** Task/vm rooms always need a zedcafe export daemon cmd. */
function ensurezedcafespecinroom(): { cmd: string; generation: number } | null {
  if (roomconfig.mode !== 'task' && roomconfig.mode !== 'vm') {
    return null
  }
  const trimmedcmd = roomconfig.zedcafe?.cmd?.trim()
  // Empty trimmed cmd must fall back; ?? would keep "".
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string
  const cmd = trimmedcmd || WANIX_ZEDCAFE_WASM_CMD
  const generation = roomconfig.zedcafe?.generation ?? 1
  if (!roomconfig.zedcafe?.cmd || roomconfig.zedcafe.cmd !== cmd) {
    setroomconfig({
      ...roomconfig,
      zedcafe: { cmd, generation },
    })
  }
  return { cmd, generation }
}

async function bootzedcafeforactiveroom(
  sys: WanixSystemElement,
): Promise<string | null> {
  const spec = ensurezedcafespecinroom()
  if (!spec) {
    return null
  }
  synczedcafestate(spec.cmd, spec.generation)
  // Drop cache if the element is gone (soft-idle / remount left remotes only).
  if (!sys.querySelector(`wanix-task[id="${WANIX_ZEDCAFE_TASK_ID}"]`)) {
    resetzedcafestate()
    synczedcafestate(spec.cmd, spec.generation)
  }
  const taskrid = await ensurezedcafeboot(sys, readroot(), spec.cmd)
  if (!taskrid) {
    wanixperfmark('zedcafe-boot-failed', { mode: roomconfig.mode })
    console.error(
      '[wanix] zedcafe export task failed to boot — <wanix-task id="zedcafe"> missing',
    )
    return null
  }
  if (!sys.querySelector(`wanix-task[id="${WANIX_ZEDCAFE_TASK_ID}"]`)) {
    wanixperfmark('zedcafe-boot-missing-dom', { taskrid })
    console.error(
      '[wanix] zedcafe boot returned rid but wanix-task#zedcafe is absent — forcing reboot',
    )
    resetzedcafestate()
    synczedcafestate(spec.cmd, spec.generation)
    return ensurezedcafeboot(sys, readroot(), spec.cmd)
  }
  return taskrid
}

async function warmactivateroom(): Promise<Record<string, unknown>> {
  const sys = system
  if (!sys || !iswanixelementready(sys)) {
    throw new Error('wanix warm apply: system not ready')
  }
  wanixperfmark('applyroom-warm-reuse', { mode: roomconfig.mode })
  if (roomconfig.mode === 'vm' && roomconfig.vm?.active) {
    const vmstatus = await warmstartvm()
    const taskrid = await bootzedcafeforactiveroom(sys)
    if (taskrid) {
      await wireallguestroots(sys, taskrid)
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
  if (roomconfig.mode === 'task') {
    await bootzedcafeforactiveroom(sys)
  }
  postready()
  return {
    ok: true,
    mode: roomconfig.mode,
    mountkey: lastmountkey,
    warm: true,
  }
}

export async function applyroom(config: WanixRoomConfig) {
  setroomconfig({
    mode: config.mode ?? 'idle',
    mountkey: config.mountkey ?? 0,
    archives: config.archives ?? [],
    remotes: config.remotes ?? [],
    tasks: config.tasks ?? [],
    vm: config.vm,
    zedcafe: config.zedcafe,
    hardreset: config.hardreset,
  })

  if (roomconfig.mode === 'idle') {
    const sys = system
    if (sys && iswanixelementready(sys) && !roomconfig.hardreset) {
      softidlewanixsystem(sys)
      setlastmountkey(roomconfig.mountkey)
      postidle()
      wanixperfmark('applyroom-return', { mode: 'idle', soft: true })
      return { ok: true, mode: 'idle', mountkey: lastmountkey, soft: true }
    }
    if (sys) {
      haltzedcafetask(sys)
    }
    disconnectalltermsessions()
    clearvmpendingdropbinds()
    host.replaceChildren()
    setwanixsystem(null)
    setlastmountkey(roomconfig.mountkey)
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
    iswanixelementready(system)
  ) {
    if (roomconfig.zedcafe?.cmd) {
      synczedcafewasmversionifneeded(system)
    }
    const warm = await warmactivateroom()
    wanixperfmark('applyroom-return', { mode: roomconfig.mode, warm: true })
    return warm
  }

  await customElements.whenDefined('wanix-namespace')
  await customElements.whenDefined('wanix-bind')
  const { patchwanixbindwss } =
    await import('zss/device/wanixserver/patchwanixbindwss')
  patchwanixbindwss()
  disconnectalltermsessions()
  // Remotes mount AFTER ready — putting WSS import on the initial bind path
  // parks AwaitErr / never fires ready (empty remote NS + ready timeout).
  const remotes = roomconfig.remotes
  const next = buildroomtree({ ...roomconfig, remotes: [] })
  host.replaceChildren()
  host.appendChild(next)
  setwanixsystem(next)
  setlastmountkey(roomconfig.mountkey)
  // Old <wanix-namespace> is gone — drop stale zedcafe rid so we recreate
  // wanix-task#zedcafe on this document instead of pretending the old rid works.
  resetzedcafestate()
  wanixperfmark('applyroom-remount', {
    mode: roomconfig.mode,
    remotes: remotes.length,
    remoteurls: remotes.map((remote) => remote.url),
  })

  await waitsystemready(next)

  // Boot zedcafe BEFORE postready so parent activate/export never races an
  // empty DOM (missing <wanix-task id="zedcafe">).
  if (roomconfig.mode === 'vm' && roomconfig.vm?.active) {
    await waitvmlinuxmount()
    const vmel = next.querySelector('wanix-vm')
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
    const taskrid = await bootzedcafeforactiveroom(next)
    if (taskrid) {
      await wireallguestroots(next, taskrid)
    }
    await mountremotesafterready(next, remotes)
    postready()
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

  // Remotes only need namespace ready (AwaitErr). Do not wait for zedcafe
  // export mount first — a stuck gojs export handshake would block WSS remotes.
  await mountremotesafterready(next, remotes)

  if (roomconfig.mode === 'task') {
    await bootzedcafeforactiveroom(next)
  }

  postready()
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
  const binpath = cmd.trim().split(/\s+/)[0] ?? cmd
  const bytes = await readroot().readFile(binpath)
  return resolvedriverforwasm(binpath, null, bytes)
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

export async function spawntask(
  taskid: string,
  cmd: string,
  driverhint?: WanixTaskDriver | null,
  stageurl?: string | null,
) {
  const sys = requirewanixsystem()
  if (sys.querySelector(`wanix-task[id="${taskid}"]`)) {
    return { ok: true, already: true, taskid, cmd }
  }

  // Normalize `#ramfs/foo.wasm args` -> `foo.wasm args` when staging via URL bind
  // (same pattern as zedcafe: task-child file bind, not root writeFile).
  let runcmd = cmd.trim()
  const cmdparts = runcmd.split(/\s+/)
  if (typeof stageurl === 'string' && stageurl.length > 0) {
    const wasmdst = (cmdparts[0] ?? '').replace(/^#ramfs\//, '')
    runcmd = [wasmdst, ...cmdparts.slice(1)].filter(Boolean).join(' ')
  }

  // zedsync peer must exist on root NS before gojs clones it (late FSA binds
  // after allocate are invisible to the guest).
  if (
    taskid === WANIX_ZEDSYNC_TASK_ID ||
    taskid.startsWith(`${WANIX_ZEDSYNC_TASK_ID}-`)
  ) {
    const peertarget = runcmd.trim().split(/\s+/)[1] ?? ''
    if (!peertarget) {
      throw new Error('zedsync: missing peer path in cmd')
    }
    try {
      await readroot().readDir(peertarget)
    } catch (err) {
      throw new Error(
        `zedsync: peer "${peertarget}" not mounted on wanix root -- drop the folder, wait for folder mount OK, then retry (${
          err instanceof Error ? err.message : String(err)
        })`,
      )
    }
  }

  const driver = await resolvedriverforcmd(runcmd, driverhint)
  const task = document.createElement('wanix-task')
  setwanixattrs(task, {
    id: taskid,
    type: driver,
    term: true,
    cmd: runcmd,
  })
  task.setAttribute('data-zss-target-id', taskid)
  task.setAttribute('data-zss-target-kind', 'task')

  // Stage large wasm via URL file bind on the task (zedcafe pattern). Do not
  // fetch+writeFile into #ramfs -- multi-MB writeFile hangs the iframe.
  if (typeof stageurl === 'string' && stageurl.length > 0) {
    const wasmdst = runcmd.trim().split(/\s+/)[0] ?? `${taskid}.wasm`
    wanixperfmark('spawntask-stage-start', {
      taskid,
      path: wasmdst,
      url: stageurl,
    })
    const bind = createbind(
      {
        type: 'file',
        dst: wasmdst,
        src: stageurl,
      },
      'data-zss-stage-wasm',
    )
    task.appendChild(bind)
    wanixperfmark('spawntask-stage-end', {
      taskid,
      path: wasmdst,
      url: stageurl,
    })
  }

  if (driver === 'gojs') {
    wanixperfmark('spawntask-gojs-gate-start', { taskid })
    const taskrid = await waitlocalzedcafetaskrid()
    if (!taskrid) {
      throw new Error(
        'zedcafe export not ready -- drop a wasm task after books are loaded in memory',
      )
    }
    const exportsrc = readwanixzedcafeexportsrc(taskrid)
    if (!(await readzedcafeexportstatsready(readroot(), exportsrc))) {
      if (!(await waitzedcafeexportstatsatroot(readroot(), taskrid))) {
        throw new Error(
          'zedcafe export not ready -- stats.json missing from export tree',
        )
      }
    }
    appendguestexportbind(task, taskrid)
    wanixperfmark('spawntask-gojs-gate-end', { taskid, taskrid })
  }
  sys.appendChild(task)

  // `_connect` is queued on append; wait for `_nsReady`/`allocate` before start.
  const connected = task as HTMLElement & {
    rid?: string | null
    _nsReady?: Promise<void>
    allocate?: () => Promise<void>
    start?: () => Promise<void>
    term?: string
  }
  if (!connected.rid) {
    if (connected._nsReady) {
      wanixperfmark('spawntask-allocate-start', { taskid, driver })
      await connected._nsReady
      wanixperfmark('spawntask-allocate-end', { taskid })
    }
    if (!connected.rid && typeof connected.allocate === 'function') {
      wanixperfmark('spawntask-allocate-start', { taskid, driver })
      await connected.allocate()
      wanixperfmark('spawntask-allocate-end', { taskid })
    }
  }

  const termpath =
    typeof connected.term === 'string' && connected.term.length > 0
      ? connected.term
      : `#task/${taskid}/term`
  wanixperfmark('spawntask-term-start', { taskid, termpath })
  await connecttermsession(taskid, termpath, 'task')
  wanixperfmark('spawntask-term-end', { taskid })

  if (typeof connected.start === 'function') {
    wanixperfmark('spawntask-start-start', { taskid })
    await connected.start()
    wanixperfmark('spawntask-start-end', { taskid })
  }

  const entry = { id: taskid, cmd: runcmd, running: true }
  roomconfig.tasks = [...roomconfig.tasks.filter((t) => t.id !== taskid), entry]

  return { ok: true, taskid, rid: task.rid ?? null, cmd: runcmd }
}

export function halttask(taskid: string) {
  removetargetpair(taskid)
  return { ok: true, taskid }
}

export function stopvm() {
  const sys = requirewanixsystem()
  const vmid = roomconfig.vm?.id ?? DEFAULT_VM_ID
  disconnecttermsession(vmid, { notifyclose: true })
  sys.querySelector('wanix-vm')?.remove()
  sys.querySelector('[data-zss-linux-bind]')?.remove()
  sys.querySelector('[data-zss-v86-bind]')?.remove()
  for (const bind of sys.querySelectorAll('wanix-bind')) {
    if (bind.getAttribute('dst') === 'vm') {
      bind.remove()
    }
  }
  setroomconfig({
    ...roomconfig,
    mode: 'task',
    vm: undefined,
  })
  return { ok: true, mode: 'task' }
}

export function stoproom() {
  return applyroom({
    mode: 'idle',
    mountkey: roomconfig.mountkey,
    hardreset: false,
    archives: [],
    remotes: roomconfig.remotes,
    tasks: [],
  })
}

export function readroomstatus() {
  return {
    ...roomconfig,
    ready: iswanixelementready(system),
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

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) {
    return
  }
  const data = event.data
  if (
    data &&
    typeof data === 'object' &&
    (data as { target?: unknown }).target === 'config'
  ) {
    const cfg = (data as { data?: { session?: unknown } }).data
    const session = cfg && isstring(cfg.session) ? cfg.session : ''
    joinwanixhub(session)
    return
  }
  if (
    data &&
    typeof data === 'object' &&
    (data as { request?: unknown }).request === WANIX_FSA_BIND_REQUEST
  ) {
    const payload = data as {
      handle?: FileSystemDirectoryHandle
      dst?: unknown
      player?: unknown
    }
    const dst = typeof payload.dst === 'string' ? payload.dst : ''
    const handle = payload.handle
    const player =
      typeof payload.player === 'string' && payload.player.length > 0
        ? payload.player
        : ''
    void (async () => {
      try {
        if (handle?.kind !== 'directory') {
          throw new Error('wanix fsa bind requires a directory handle')
        }
        const result = await bindfsadirectory(handle, dst)
        wanixclientbindfsa(SOFTWARE, player, result)
      } catch (err) {
        wanixclientbindfsa(SOFTWARE, player, {
          ok: false,
          dst,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    })()
  }
})

export function ping() {
  return { ok: true }
}

export function readready() {
  return {
    isReady: iswanixelementready(system),
    instanceID: readwanixelementinstanceid(system),
  }
}

export function readvmstatus() {
  return readvmstatelive()
}

export function startvm(mem?: string, vmid?: string) {
  return applyroom({
    ...roomconfig,
    mode: 'vm',
    mountkey: roomconfig.mountkey + 1,
    vm: {
      id: String(vmid ?? DEFAULT_VM_ID),
      mem: String(mem ?? DEFAULT_VM_MEM),
      active: true,
    },
  })
}

export function listdir(path?: string) {
  return readroot().readDir(String(path ?? '.'))
}

export function readtext(path: string) {
  return readroot().readText(String(path))
}

export async function readfile(path: string) {
  const bytes = await readroot().readFile(String(path))
  return Array.from(bytes)
}

export async function writefile(path: string, bytes?: number[]) {
  await readroot().writeFile(String(path), new Uint8Array(bytes ?? []))
  return { ok: true }
}

export async function termwrite(linedata?: string, sessionkey?: string) {
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
  return { ok: true }
}

export function termfit(cols: number, rows: number) {
  recordtermfit(cols, rows)
  if (termsessions.size === 0) {
    return { ok: true, noop: true }
  }
  fitalltermsessions(Number(cols), Number(rows))
  return {
    ok: true,
    cols: Number(cols),
    rows: Number(rows),
  }
}

export async function waitzedcafecontentready(
  taskrid: string,
  timeoutms?: number,
) {
  if (!iswanixelementready(system)) {
    return false
  }
  return waitzedcafeexportcontentready(
    readroot(),
    String(taskrid),
    Number(timeoutms ?? WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS),
  )
}

export function setzedcafeready(ready: boolean) {
  setzedcafereadylocal(!!ready)
  return { ok: true }
}

export function haltzedcafe() {
  if (system) {
    haltzedcafetask(system)
  }
  resetzedcafestate()
  return { ok: true }
}

export function readzedcafetaskrid() {
  return readzedcafetaskridlocal(system)
}

export async function readzedcafeexportfiles() {
  if (!iswanixelementready(system)) {
    return []
  }
  const root = readroot()
  const taskrid = readzedcafetaskridlocal(system)
  if (!taskrid) {
    return []
  }
  return collectzedcafeexportfiles(root, taskrid)
}

export async function synczedcafeexport(
  files?: { path: string; data: Uint8Array | number[] }[] | null,
  removepaths?: string[] | null,
) {
  if (!iswanixelementready(system)) {
    throw new Error('wanix room not ready')
  }
  const guestfiles =
    files?.map((file) => ({
      path: file.path,
      data:
        file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data),
    })) ?? null
  return synczedcafeexportlocal(
    guestfiles,
    Array.isArray(removepaths) ? removepaths : [],
  )
}

export async function iszedcafeexportlive(taskrid?: string) {
  if (!iswanixelementready(system)) {
    return false
  }
  const rid = String(taskrid ?? readzedcafetaskridlocal(system) ?? '')
  if (!rid) {
    return false
  }
  return readzedcafeexportlive(readroot(), rid)
}

export async function iszedcafeguestbound() {
  const sys = system
  if (!sys || !iswanixelementready(sys)) {
    return false
  }
  return readzedcafeguestbound(readroot(), sys)
}

function normalizewanixpath(label: string): string {
  const trimmed = label.replace(/^\/+/, '')
  return trimmed.startsWith('#ramfs/') ? trimmed : `#ramfs/${trimmed}`
}

async function ensuretaskroomfordrop() {
  if (roomconfig.mode !== 'idle') {
    return
  }
  const next: WanixRoomConfig = {
    ...roomconfig,
    mode: 'task',
    mountkey: roomconfig.mountkey + 1,
    hardreset: true,
    archives: [],
    remotes: roomconfig.remotes,
    tasks: [],
    vm: undefined,
    zedcafe: {
      cmd: WANIX_ZEDCAFE_WASM_CMD,
      generation: roomconfig.zedcafe?.generation ?? 1,
    },
  }
  const result = await applyroom(next)
  // Parent config must learn mode/mountkey before dropdone — otherwise
  // ensurewanixtaskroom treats the room as idle/mismatched and remounts.
  wanixclientapplyroom(SOFTWARE, '', result)
}

/** Parent → iframe wasm/bundle drop staging + spawn. */
export async function drop(
  label: string,
  kind: 'wasm' | 'bundle',
  bytes: Uint8Array,
) {
  await ensuretaskroomfordrop()
  if (!iswanixelementready(system)) {
    throw new Error('wanix room not ready')
  }
  if (roomconfig.zedcafe?.cmd) {
    wanixperfmark('drop-export-pull-start')
    try {
      await pullzedcafeexportfromparent()
      wanixperfmark('drop-export-pull-end')
    } catch (err) {
      wanixperfmark('drop-export-pull-failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      // Spawn the dropped wasm/bundle even when export sync fails.
    }
  }
  wanixperfmark('drop-spawn-start', { label, kind })
  const taskid = uniquewanixtaskid(
    label,
    roomconfig.tasks.map((task) => task.id),
  )
  if (kind === 'wasm') {
    const path = normalizewanixpath(label)
    wanixperfmark('drop-writefile-start', { path })
    await writefile(path, Array.from(bytes))
    wanixperfmark('drop-writefile-end', { path })
    const { readwanixwasmdriver } =
      await import('zss/feature/wanix/wanixwasmdriver')
    const driver = readwanixwasmdriver(bytes)
    wanixperfmark('drop-spawntask-start', { taskid, path, driver })
    const result = await spawntask(taskid, path, driver)
    wanixperfmark('drop-spawntask-end', { taskid })
    return {
      ...result,
      taskid,
      cmd: path,
      spawns: [{ taskid, cmd: path }],
      mode: roomconfig.mode,
      mountkey: lastmountkey,
    }
  }
  const { extractwanixtgz } =
    await import('zss/device/wanixserver/wanixtgzextract')
  const { listwanixwasmentries, readbundleflatpath } =
    await import('zss/device/wanixserver/wanixbundle')
  const { readwanixwasmdriver } =
    await import('zss/feature/wanix/wanixwasmdriver')
  const prefix = `bundle-${taskid}`
  const files = await extractwanixtgz(bytes, prefix)
  const driverbycmd = new Map<string, WanixTaskDriver>()
  for (const file of files) {
    const flatpath = readbundleflatpath(prefix, file.path)
    const cmd = normalizewanixpath(flatpath)
    if (file.path.toLowerCase().endsWith('.wasm')) {
      driverbycmd.set(cmd, readwanixwasmdriver(file.bytes))
    }
    await writefile(cmd, Array.from(file.bytes))
  }
  const wasmpaths = listwanixwasmentries(files, prefix)
  const usedids = new Set(roomconfig.tasks.map((task) => task.id))
  const spawns: { taskid: string; cmd: string }[] = []
  let firstcmd = ''
  for (const relpath of wasmpaths) {
    const flatpath = readbundleflatpath(prefix, relpath)
    const cmd = normalizewanixpath(flatpath)
    const basename = relpath.split('/').pop() ?? relpath
    const subtaskid = uniquewanixtaskid(`${taskid}-${basename}`, usedids)
    usedids.add(subtaskid)
    await spawntask(subtaskid, cmd, driverbycmd.get(cmd))
    spawns.push({ taskid: subtaskid, cmd })
    if (!firstcmd) {
      firstcmd = cmd
    }
  }
  return {
    taskid,
    cmd: firstcmd,
    spawns,
    mode: roomconfig.mode,
    mountkey: lastmountkey,
  }
}

await customElements.whenDefined('wanix-namespace')
postidle()

const g = globalThis as Record<string, unknown>
g.__zss_wanix_host__ = {
  ping,
  readready,
  readroomstatus,
  readvmstatus,
  listdir,
  readtext,
  readfile,
  readzedcafetaskrid,
  readzedcafeexportfiles,
  iszedcafeexportlive,
  iszedcafeguestbound,
}
