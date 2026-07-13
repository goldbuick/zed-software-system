import {
  wanixclientcells,
  wanixclientidle,
  wanixclientready,
  wanixclientrequestzedcafestate,
  wanixclientsession,
} from 'zss/device/api'
import { createforward, shouldforwardwanixtoclient } from 'zss/device/forward'
import { ismessage } from 'zss/device/types'
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
  lastfitcols,
  lastfitrows,
  lastmountkey,
  pruneworkerroomtask,
  queuevmpendingdropbind,
  readliveconnectorder,
  readsessionsessionkind,
  readtermlinebuf,
  readtermsession,
  recordtermfit,
  recordtermsessionconnect,
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
  readwanixzedcafeexportsrc,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import type { WanixZedCafeGuestFile } from 'zss/feature/wanix/wanixzedcafetypes'

import 'zss/device/wanixserver'

const { forward: forwardmessage } = createforward((message) => {
  if (shouldforwardwanixtoclient()) {
    window.parent.postMessage(message, window.location.origin)
  }
})

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
  if (!system?.isReady || !roomconfig.zedcafe?.cmd) {
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
  const taskrid = await ensurezedcafeboot(system, readroot(), cmd)
  if (!taskrid) {
    return { ok: false, taskrid: null }
  }
  const bookcount = readguestfilebookcount(files)
  if (files.length > 0 || removepaths.length > 0) {
    await pushzedcafeexportlive(readroot(), taskrid, files, removepaths)
  }
  if (bookcount > 0) {
    await wireallguestroots(system, taskrid)
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
  if (!system?.isReady || !roomconfig.zedcafe?.cmd) {
    return { ok: false, taskrid: null }
  }
  settlependingrequestzedcafeexport({ ok: false, taskrid: null })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pendingrequestzedcafeexport) {
        pendingrequestzedcafeexport = null
        reject(new Error('zedcafe export request timed out'))
      }
    }, WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS)
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
  const pending = takependingdropbinds()
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

type BindImportHost = HTMLElement & { import?: Promise<unknown> }

function readremotebindel(
  sys: HTMLElement,
  remote: WanixRemoteSpec,
): BindImportHost | null {
  return sys.querySelector(
    `wanix-bind[data-zss-remote-id="${CSS.escape(remote.id)}"]`,
  ) as BindImportHost | null
}

/**
 * Start wss:// dials on detached wanix-bind elements BEFORE appendChild so CDN
 * connectedCallback never creates an iframe import. Do not await open — settling
 * bind.import before wanix.wasm AwaitErr deadlocks Go wasm (ready timeout).
 */
function preparewssremoteimports(
  sys: HTMLElement,
  remotes: WanixRemoteSpec[],
  openwssimport: (src: string) => Promise<MessagePort>,
  iswssremoteurl: (src: string) => boolean,
): void {
  if (remotes.length === 0) {
    return
  }
  wanixperfmark('remote-import-prepare', {
    count: remotes.length,
    urls: remotes.map((remote) => remote.url),
  })
  for (const remote of remotes) {
    const el = readremotebindel(sys, remote)
    if (!el) {
      throw new Error(
        `wanix remote bind missing for ${remote.dst} (${remote.url})`,
      )
    }
    if (!iswssremoteurl(remote.url)) {
      throw new Error(
        `wanix remote url must be wss:// (got ${remote.url} for ${remote.dst})`,
      )
    }
    wanixperfmark('remote-wss-force-dial', {
      dst: remote.dst,
      url: remote.url,
      reason: 'pre-append-start',
    })
    const imp = openwssimport(remote.url)
    el.import = imp
    void imp.then(
      () => {
        wanixperfmark('remote-import-open', {
          dst: remote.dst,
          url: remote.url,
          via: 'pre-append',
        })
      },
      (err: unknown) => {
        wanixperfmark('remote-import-failed', {
          dst: remote.dst,
          url: remote.url,
          error: err instanceof Error ? err.message : String(err),
        })
      },
    )
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
      const taskrid = await ensurezedcafeboot(
        system,
        readroot(),
        roomconfig.zedcafe.cmd,
      )
      if (taskrid) {
        await wireallguestroots(system, taskrid)
      }
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
    if (system?.isReady && !roomconfig.hardreset) {
      softidlewanixsystem(system)
      setlastmountkey(roomconfig.mountkey)
      postidle()
      wanixperfmark('applyroom-return', { mode: 'idle', soft: true })
      return { ok: true, mode: 'idle', mountkey: lastmountkey, soft: true }
    }
    if (system) {
      haltzedcafetask(system)
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
  await customElements.whenDefined('wanix-bind')
  const { patchwanixbindwss, openwssimport, iswssremoteurl } = await import(
    'zss/device/wanixserver/patchwanixbindwss'
  )
  patchwanixbindwss()
  disconnectalltermsessions()
  const next = buildroomtree(roomconfig)
  try {
    preparewssremoteimports(
      next,
      roomconfig.remotes,
      openwssimport,
      iswssremoteurl,
    )
  } catch (err) {
    wanixperfmark('remote-import-failed', {
      error: err instanceof Error ? err.message : String(err),
      remotes: roomconfig.remotes.length,
    })
    throw err instanceof Error
      ? err
      : new Error(`wanix remote import failed: ${String(err)}`)
  }
  host.replaceChildren()
  host.appendChild(next)
  setwanixsystem(next)
  setlastmountkey(roomconfig.mountkey)
  wanixperfmark('applyroom-remount', {
    mode: roomconfig.mode,
    remotes: roomconfig.remotes.length,
    remoteurls: roomconfig.remotes.map((remote) => remote.url),
  })

  // Race: WSS connect + wasm load. Import Promise must still be pending (or
  // resolving via setTimeout 0) when setupNamespace AwaitErr attaches .then.
  await waitsystemready(next)
  postready()

  if (roomconfig.zedcafe?.cmd) {
    const spec = roomconfig.zedcafe
    synczedcafestate(spec.cmd, spec.generation)
  }

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
    if (roomconfig.zedcafe?.cmd) {
      const taskrid = await ensurezedcafeboot(
        next,
        readroot(),
        roomconfig.zedcafe.cmd,
      )
      if (taskrid) {
        await wireallguestroots(next, taskrid)
      }
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
    await ensurezedcafeboot(next, readroot(), roomconfig.zedcafe.cmd)
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
    wanixperfmark('spawntask-gojs-gate-start', { taskid })
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
    wanixperfmark('spawntask-gojs-gate-end', { taskid, taskrid })
  }
  system.appendChild(task)

  if (typeof task.allocate === 'function') {
    wanixperfmark('spawntask-allocate-start', { taskid, driver })
    await task.allocate()
    wanixperfmark('spawntask-allocate-end', { taskid })
  }

  const termpath =
    typeof task.term === 'string' && task.term.length > 0
      ? task.term
      : `#task/${taskid}/term`
  wanixperfmark('spawntask-term-start', { taskid, termpath })
  await connecttermsession(taskid, termpath, 'task')
  wanixperfmark('spawntask-term-end', { taskid })

  if (typeof task.start === 'function') {
    wanixperfmark('spawntask-start-start', { taskid })
    await task.start()
    wanixperfmark('spawntask-start-end', { taskid })
  }

  const entry = { id: taskid, cmd, running: true }
  roomconfig.tasks = [...roomconfig.tasks.filter((t) => t.id !== taskid), entry]

  return { ok: true, taskid, rid: task.rid ?? null }
}

export function halttask(taskid: string) {
  removetargetpair(taskid)
  return { ok: true, taskid }
}

export function stopvm() {
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

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) {
    return
  }
  const data = event.data
  if (ismessage(data)) {
    forwardmessage(data)
  }
})

export function ping() {
  return { ok: true }
}

export function readready() {
  return {
    isReady: !!system?.isReady,
    instanceID: system?.instanceID ?? null,
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
  if (!system?.isReady) {
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
  if (!system?.isReady) {
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
  files?: { path: string; data: number[] }[] | null,
  removepaths?: string[] | null,
) {
  if (!system?.isReady) {
    throw new Error('wanix room not ready')
  }
  const guestfiles =
    files?.map((file) => ({
      path: file.path,
      data: file.data,
    })) ?? null
  return synczedcafeexportlocal(
    guestfiles,
    Array.isArray(removepaths) ? removepaths : [],
  )
}

export async function iszedcafeexportlive(taskrid?: string) {
  if (!system?.isReady) {
    return false
  }
  const rid = String(taskrid ?? readzedcafetaskridlocal(system) ?? '')
  if (!rid) {
    return false
  }
  return readzedcafeexportlive(readroot(), rid)
}

export async function iszedcafeguestbound() {
  if (!system?.isReady) {
    return false
  }
  return readzedcafeguestbound(readroot(), system)
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
  await applyroom(next)
}

/** Parent → iframe wasm/bundle drop staging + spawn. */
export async function drop(
  label: string,
  kind: 'wasm' | 'bundle',
  bytes: Uint8Array,
) {
  await ensuretaskroomfordrop()
  if (!system?.isReady) {
    throw new Error('wanix room not ready')
  }
  if (roomconfig.zedcafe?.cmd) {
    wanixperfmark('drop-export-pull-start')
    await pullzedcafeexportfromparent()
    wanixperfmark('drop-export-pull-end')
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
  return { taskid, cmd: firstcmd, spawns }
}

await customElements.whenDefined('wanix-system')
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
