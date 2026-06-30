import { createdeferred, replychildrpc, type Deferred } from 'zss/feature/wanix/wanixifracerpc'
import {
  collectzedcafeexportfiles,
  collectzedcafeexportramfsfiles,
  iswanixzedcafevmbootexport,
  readzedcafeexportprobe,
  waitzedcafeexportready,
  waitzedcafeguestready,
  WANIX_BIND_MOUNT_TIMEOUT_MS,
} from 'zss/feature/wanix/wanixiframechildmount'
import type {
  WanixIframeArchive,
  WanixIframeHostState,
  WanixIframeRemote,
  WanixRoot,
  WanixSystemElement,
  WanixTaskElement,
  WanixWakeElement,
  WanixZedCafeGuestFile,
  WanixZedCafeHostState,
} from 'zss/feature/wanix/wanixiframechildtypes'
import {
  WANIX_IFRAME_SYSTEM_ID,
  createidlewanixiframestate,
  iswanixroomready,
} from 'zss/feature/wanix/wanixiframechildtypes'
import { WANIX_REMOTE_DEFAULT_DST } from 'zss/feature/wanix/wanixremoteconstants'
import {
  WANIX_ZED_CAFE_TASK_ID,
  WANIX_ZED_CAFE_WASM_CMD,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import type { WANIX_TERM_IFRAME_RPC } from 'zss/feature/wanix/wanixtermiframeprotocol'
import { postwanixiframeapilog } from 'zss/feature/wanix/wanixtermiframeprotocol'
import type { WANIX_VM_ASSET_URLS } from 'zss/feature/wanix/wanixvmassets'
import { refreshvmzedcafeguestfiles } from 'zss/feature/wanix/wanixvmslot'
import type { WanixZedCafeExportProbe } from 'zss/feature/wanix/wanixzedcafeprobe'
import {
  startwanixbridgehost,
  stopwanixbridgehost,
  readwanixbridgeactive,
  readwanixbridgesessioncount,
  readwanixbridgeurl,
} from 'zss/feature/wanix/wanixbridgehost'
import { setwanixtermprobeactivetarget } from 'zss/feature/wanix/wanixtermprobe'

export const WANIX_IFRAME_READY_TIMEOUT_MS = 180_000
export const WANIX_IFRAME_VM_PREP_WAIT_MS = 600_000
export const WANIX_IFRAME_ARCHIVE_MOUNT_TIMEOUT_MS = 120_000
export const WANIX_ZED_CAFE_EXPORT_WAIT_MS = 90_000
const WANIX_ROOT_RPC_WAIT_MS = 10_000

function readzedcafetaskrid(state: WanixIframeHostState): string | null {
  if (state.zedcafe?.taskrid) {
    return state.zedcafe.taskrid
  }
  const task = document.querySelector(
    `wanix-system#${WANIX_IFRAME_SYSTEM_ID} wanix-task[id="${WANIX_ZED_CAFE_TASK_ID}"]`,
  ) as WanixTaskElement | null
  return task?.rid ?? null
}

async function waitforzedcafeexport(
  readroot: () => WanixRoot | null,
  readstate: () => WanixIframeHostState,
  timeoutms: number,
): Promise<string | null> {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    const taskrid = readzedcafetaskrid(readstate())
    if (taskrid) {
      break
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 250))
  }
  const taskrid = readzedcafetaskrid(readstate())
  const wanixroot = readroot()
  if (!wanixroot || !taskrid) {
    return null
  }
  const exportwaitms = deadline - Date.now()
  if (exportwaitms <= 0) {
    return null
  }
  const exportready = await waitzedcafeexportready(
    wanixroot,
    taskrid,
    exportwaitms,
  )
  if (!exportready) {
    return null
  }
  const guestwaitms = deadline - Date.now()
  if (guestwaitms <= 0) {
    return null
  }
  const guestready = await waitzedcafeguestready(wanixroot, guestwaitms)
  if (!guestready) {
    return null
  }
  return taskrid
}

function witharchives(
  state: WanixIframeHostState,
  archives: WanixIframeArchive[],
): WanixIframeHostState {
  return { ...state, archives }
}

function withremotes(
  state: WanixIframeHostState,
  remotes: WanixIframeRemote[],
): WanixIframeHostState {
  return { ...state, remotes }
}

export type WanixIframeChildController = ReturnType<
  typeof createwanixiframechildcontroller
>

export function createwanixiframechildcontroller() {
  let state = createidlewanixiframestate()
  let root: WanixRoot | null = null
  let archiveseq = 0
  let remoteseq = 0
  const listeners = new Set<() => void>()

  let pendingbootroom: Deferred<void> | null = null
  let pendingspawnvm: Deferred<{ vmid: string; vrid: string }> | null = null
  const pendingtaskspawns = new Map<
    number,
    Deferred<{ taskid: string; rid: string | null }>
  >()
  const pendingarchives = new Map<string, Deferred<void>>()
  const pendingremotes = new Map<string, Deferred<void>>()

  function emit() {
    for (const listener of listeners) {
      listener()
    }
  }

  function setstate(next: WanixIframeHostState) {
    state = next
    emit()
  }

  function getstate() {
    return state
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function setroot(next: WanixRoot | null) {
    root = next
  }

  function getroot() {
    return root
  }

  async function waitforcontrollerroot(timeoutms = WANIX_ROOT_RPC_WAIT_MS) {
    const deadline = Date.now() + timeoutms
    while (Date.now() < deadline) {
      if (root) {
        return root
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 16))
    }
    return null
  }

  function onsystemready(wanixroot: WanixRoot) {
    root = wanixroot
    if (state.room === 'booting') {
      setstate({ ...state, room: 'ready' })
      pendingbootroom?.resolve()
      pendingbootroom = null
    }
  }

  function onsystemerror(err: Error) {
    pendingbootroom?.reject(err)
    pendingbootroom = null
    pendingspawnvm?.reject(err)
    pendingspawnvm = null
    for (const pending of pendingtaskspawns.values()) {
      pending.reject(err)
    }
    pendingtaskspawns.clear()
  }

  function onspawnvmcomplete(result: { vmid: string; vrid: string }) {
    pendingspawnvm?.resolve(result)
    pendingspawnvm = null
  }

  function onspawnvmerror(err: Error) {
    pendingspawnvm?.reject(err)
    pendingspawnvm = null
  }

  function onspawntaskcomplete(
    spawnid: number,
    result: { taskid: string; rid: string | null },
  ) {
    const pending = pendingtaskspawns.get(spawnid)
    if (!pending) {
      return
    }
    pendingtaskspawns.delete(spawnid)
    pending.resolve(result)
  }

  function onspawntaskerror(spawnid: number, err: Error) {
    const pending = pendingtaskspawns.get(spawnid)
    if (!pending) {
      return
    }
    pendingtaskspawns.delete(spawnid)
    pending.reject(err)
  }

  function onarchivemounted(archiveid: string) {
    const pending = pendingarchives.get(archiveid)
    if (!pending) {
      return
    }
    pendingarchives.delete(archiveid)
    pending.resolve()
  }

  function onarchiveerror(archiveid: string, err: Error) {
    const pending = pendingarchives.get(archiveid)
    if (pending) {
      pendingarchives.delete(archiveid)
      pending.reject(err)
    }
    const current = getstate()
    setstate(
      witharchives(
        current,
        current.archives.filter((entry) => entry.id !== archiveid),
      ),
    )
  }

  function onremotemounted(remoteid: string) {
    const pending = pendingremotes.get(remoteid)
    if (pending) {
      pendingremotes.delete(remoteid)
      pending.resolve()
    }
    postwanixiframeapilog(`wanix remote: import mounted (${remoteid})`)
  }

  function onremoteerror(remoteid: string, err: Error) {
    const pending = pendingremotes.get(remoteid)
    if (pending) {
      pendingremotes.delete(remoteid)
      pending.reject(err)
    }
    const current = getstate()
    setstate(
      withremotes(
        current,
        current.remotes.filter((entry) => entry.id !== remoteid),
      ),
    )
    postwanixiframeapilog(`wanix remote: import failed (${remoteid}): ${err.message}`)
  }

  function onzedcafeerror(err: Error) {
    postwanixiframeapilog(`zed-cafe export: ${err.message}`)
  }

  async function bootroom(opts?: {
    urls?: WANIX_VM_ASSET_URLS
    vmcapable?: boolean
    zedcafe?: WanixZedCafeHostState | null
  }) {
    const vmcapable = opts?.vmcapable ?? false
    if (iswanixroomready(state) && state.vmcapable === vmcapable) {
      return
    }
    if (iswanixroomready(state) && vmcapable && !state.vmcapable) {
      await upgradetovmroom(opts?.urls, opts?.zedcafe)
      return
    }
    if (state.room === 'booting') {
      await pendingbootroom?.promise
      return
    }
    const deferred = createdeferred<void>()
    pendingbootroom = deferred
    setstate({
      ...state,
      room: 'booting',
      vmcapable,
      urls: opts?.urls ?? state.urls,
      archives: state.archives,
      remotes: state.remotes,
      zedcafe:
        opts?.zedcafe !== undefined ? opts.zedcafe : state.zedcafe,
      pendingtasks: [],
      removetaskids: [],
      taskspawnseq: state.taskspawnseq,
      vm: state.vm,
      activetargetid: state.activetargetid,
      activetargetkind: state.activetargetkind,
    })
    root = null
    await deferred.promise
  }

  async function upgradetovmroom(
    urls?: WANIX_VM_ASSET_URLS,
    zedcafe?: WanixZedCafeHostState | null,
  ) {
    if (state.room === 'booting') {
      await pendingbootroom?.promise
      return
    }
    const deferred = createdeferred<void>()
    pendingbootroom = deferred
    setstate({
      ...state,
      room: 'booting',
      vmcapable: true,
      roommountkey: state.roommountkey + 1,
      urls: urls ?? state.urls,
      zedcafe: zedcafe !== undefined ? zedcafe : state.zedcafe,
      pendingtasks: [],
      removetaskids: [],
    })
    root = null
    await deferred.promise
  }

  async function handlerrpc(
    data: WANIX_TERM_IFRAME_RPC,
    source: MessageEventSource | null,
  ) {
    try {
      switch (data.method) {
        case 'bootroom': {
          const [opts] = (data.args ?? []) as [
            {
              urls?: WANIX_VM_ASSET_URLS
              vmcapable?: boolean
              zedcafe?: WanixZedCafeHostState | null
            }?,
          ]
          await bootroom(opts)
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'prepvm': {
          const [urls] = data.args as [WANIX_VM_ASSET_URLS, WanixZedCafeGuestFile[]?]
          await bootroom({ urls, vmcapable: true })
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'preptask': {
          await bootroom({ vmcapable: false })
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'spawnvm': {
          const [vmid, mem, inboxbytes = [], guestfiles = []] = data.args as [
            string,
            string,
            number[]?,
            WanixZedCafeGuestFile[]?,
          ]
          if (!iswanixroomready(state)) {
            throw new Error('wanix iframe child: room not ready')
          }
          const deferred = createdeferred<{ vmid: string; vrid: string }>()
          pendingspawnvm = deferred
          const hasprefill = guestfiles.some((file) => file.path === 'stats.json')
          if (hasprefill) {
            setstate({
              ...state,
              vm: {
                vmid,
                mem,
                bootstage: 'activating',
                guestfiles,
              },
              zedcafe: state.zedcafe
                ? {
                    ...state.zedcafe,
                    guestfiles,
                    inboxbytes: inboxbytes.length
                      ? inboxbytes
                      : state.zedcafe.inboxbytes,
                  }
                : null,
            })
          } else {
            const generation = (state.zedcafe?.generation ?? 0) + 1
            setstate({
              ...state,
              zedcafe: {
                cmd: state.zedcafe?.cmd ?? WANIX_ZED_CAFE_WASM_CMD,
                generation,
                ready: false,
                taskrid: null,
                guestfiles: state.zedcafe?.guestfiles,
                inboxbytes: inboxbytes.length
                  ? inboxbytes
                  : state.zedcafe?.inboxbytes,
              },
              vm: {
                vmid,
                mem,
                bootstage: 'export',
              },
            })
          }
          const result = await deferred.promise
          replychildrpc(source, data.id, { result })
          return
        }
        case 'spawntask': {
          const [taskid, cmd] = data.args as [string, string]
          if (!iswanixroomready(state)) {
            throw new Error('wanix iframe child: room not ready')
          }
          const spawnid = state.taskspawnseq + 1
          const deferred = createdeferred<{
            taskid: string
            rid: string | null
          }>()
          pendingtaskspawns.set(spawnid, deferred)
          setstate({
            ...state,
            taskspawnseq: spawnid,
            pendingtasks: [...state.pendingtasks, { spawnid, taskid, cmd }],
          })
          const result = await deferred.promise
          replychildrpc(source, data.id, { result })
          return
        }
        case 'haltvm': {
          const [vmid] = data.args as [string | undefined]
          await halttarget(root, 'vm', vmid ?? 'linux-vm')
          if (state.vm) {
            setstate({
              ...state,
              vm: {
                ...state.vm,
                bootstage: 'idle',
                guestfiles: undefined,
              },
            })
          }
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'halttask': {
          const [taskid] = data.args as [string | undefined]
          if (taskid) {
            await halttarget(root, 'task', taskid)
            setstate({
              ...state,
              removetaskids: [...state.removetaskids, taskid],
            })
          }
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'activatetarget': {
          const [kind, targetid] = data.args as [
            'task' | 'vm',
            string,
          ]
          setstate({
            ...state,
            activetargetid: targetid,
            activetargetkind: kind,
          })
          setwanixtermprobeactivetarget(targetid)
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'putfile': {
          const [name, bytes] = data.args as [string, number[]]
          const wanixroot = await waitforcontrollerroot()
          if (!wanixroot) {
            throw new Error('wanix iframe child: root missing')
          }
          await wanixroot.writeFile(name, new Uint8Array(bytes))
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'listdir': {
          const [path] = data.args as [string]
          const wanixroot = await waitforcontrollerroot()
          if (!wanixroot) {
            throw new Error('wanix iframe child: root missing')
          }
          const entries = await wanixroot.readDir(path)
          replychildrpc(source, data.id, { result: entries })
          return
        }
        case 'mountarchive': {
          const [name, bytes, mountdst] = data.args as [
            string,
            number[],
            string,
          ]
          if (!iswanixroomready(state)) {
            throw new Error('wanix iframe child: room not ready')
          }
          const archiveid = `archive-${++archiveseq}`
          const src = URL.createObjectURL(
            new Blob([new Uint8Array(bytes)], { type: 'application/gzip' }),
          )
          const archive: WanixIframeArchive = {
            id: archiveid,
            name,
            src,
            mountdst: mountdst || '.',
          }
          const deferred = createdeferred<void>()
          pendingarchives.set(archiveid, deferred)
          const timer = setTimeout(() => {
            onarchiveerror(archiveid, new Error('archive mount timeout'))
          }, WANIX_IFRAME_ARCHIVE_MOUNT_TIMEOUT_MS)
          try {
            const current = getstate()
            setstate(witharchives(current, [...current.archives, archive]))
            await deferred.promise
            replychildrpc(source, data.id, { result: { ok: true } })
          } finally {
            clearTimeout(timer)
            URL.revokeObjectURL(src)
          }
          return
        }
        case 'connectremote': {
          const [url, mountdst = WANIX_REMOTE_DEFAULT_DST, label] = data.args as [
            string,
            string?,
            string?,
          ]
          if (!iswanixroomready(state)) {
            throw new Error('wanix iframe child: room not ready')
          }
          if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
            throw new Error('wanix remote: url must start with ws:// or wss://')
          }
          const remoteid = `remote-${++remoteseq}`
          const remote: WanixIframeRemote = {
            id: remoteid,
            label: label?.trim() || remoteid,
            url,
            mountdst: mountdst?.trim() || WANIX_REMOTE_DEFAULT_DST,
          }
          const deferred = createdeferred<void>()
          pendingremotes.set(remoteid, deferred)
          const timer = setTimeout(() => {
            onremoteerror(remoteid, new Error('remote import mount timeout'))
          }, WANIX_BIND_MOUNT_TIMEOUT_MS)
          try {
            const current = getstate()
            setstate(withremotes(current, [...current.remotes, remote]))
            await deferred.promise
            replychildrpc(source, data.id, { result: remote })
          } finally {
            clearTimeout(timer)
          }
          return
        }
        case 'disconnectremote': {
          const [remoteid] = data.args as [string]
          const current = getstate()
          setstate(
            withremotes(
              current,
              current.remotes.filter((entry) => entry.id !== remoteid),
            ),
          )
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'listremotes': {
          replychildrpc(source, data.id, { result: getstate().remotes })
          return
        }
        case 'synczedcafe': {
          const [cmd, generation] = data.args as [string, number]
          setstate({
            ...state,
            zedcafe: {
              cmd,
              generation,
              ready: false,
              taskrid: null,
              guestfiles: state.zedcafe?.guestfiles,
              inboxbytes: state.zedcafe?.inboxbytes,
            },
          })
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'waitzedcafeready': {
          const [timeoutms = WANIX_ZED_CAFE_EXPORT_WAIT_MS] = data.args as [
            number?,
          ]
          const taskrid = await waitforzedcafeexport(getroot, getstate, timeoutms)
          if (taskrid) {
            const current = getstate()
            if (current.zedcafe) {
              setstate({
                ...current,
                zedcafe: {
                  ...current.zedcafe,
                  taskrid,
                },
              })
            }
          }
          replychildrpc(source, data.id, { result: taskrid })
          return
        }
        case 'setzedcafeready': {
          const [ready] = data.args as [boolean]
          const current = getstate()
          if (!current.zedcafe) {
            replychildrpc(source, data.id, { result: { ok: true } })
            return
          }
          setstate({
            ...current,
            zedcafe: {
              ...current.zedcafe,
              ready,
            },
          })
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'haltzedcafe': {
          await halttarget(root, 'task', WANIX_ZED_CAFE_TASK_ID)
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'readzedcafeexportfiles': {
          const wanixroot = await waitforcontrollerroot()
          const current = getstate()
          if (!wanixroot) {
            replychildrpc(source, data.id, { result: [] })
            return
          }
          if (iswanixzedcafevmbootexport(current)) {
            const files = await collectzedcafeexportramfsfiles(wanixroot)
            replychildrpc(source, data.id, { result: files })
            return
          }
          const taskrid = readzedcafetaskrid(current)
          if (!taskrid) {
            replychildrpc(source, data.id, { result: [] })
            return
          }
          const files = await collectzedcafeexportfiles(wanixroot, taskrid)
          replychildrpc(source, data.id, { result: files })
          return
        }
        case 'readzedcafetaskrid': {
          replychildrpc(source, data.id, {
            result: readzedcafetaskrid(getstate()),
          })
          return
        }
        case 'refreshvmzedcafeexport': {
          const [guestfiles] = data.args as [WanixZedCafeGuestFile[]]
          const sys = document.querySelector(
            `wanix-system#${WANIX_IFRAME_SYSTEM_ID}`,
          ) as WanixSystemElement | null
          if (!sys) {
            replychildrpc(source, data.id, {
              error: 'wanix iframe child: system missing for vm export refresh',
            })
            return
          }
          const count = refreshvmzedcafeguestfiles(sys, guestfiles ?? [])
          const current = getstate()
          if (current.zedcafe && count > 0) {
            setstate({
              ...current,
              zedcafe: {
                ...current.zedcafe,
                guestfiles,
              },
              vm: current.vm
                ? {
                    ...current.vm,
                    guestfiles,
                  }
                : current.vm,
            })
          }
          replychildrpc(source, data.id, { result: { ok: true, count } })
          return
        }
        case 'probezedcafeexport': {
          const wanixroot = await waitforcontrollerroot()
          const current = getstate()
          const taskrid = readzedcafetaskrid(current)
          const probe: WanixZedCafeExportProbe = await readzedcafeexportprobe(
            wanixroot,
            taskrid,
            current.zedcafe?.ready ?? false,
            current.zedcafe?.cmd ?? null,
            iswanixzedcafevmbootexport(current),
          )
          replychildrpc(source, data.id, { result: probe })
          return
        }
        case 'startbridge': {
          const [url] = data.args as [string]
          await startwanixbridgehost(url)
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'stopbridge': {
          stopwanixbridgehost()
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'readbridgestatus': {
          replychildrpc(source, data.id, {
            result: {
              active: readwanixbridgeactive(),
              url: readwanixbridgeurl(),
              sessions: readwanixbridgesessioncount(),
            },
          })
          return
        }
        case 'teardown': {
          stopwanixbridgehost()
          setstate(createidlewanixiframestate())
          root = null
          setwanixtermprobeactivetarget(null)
          replychildrpc(source, data.id, { result: { ok: true } })
          return
        }
        default:
          replychildrpc(source, data.id, {
            error: `unknown rpc: ${data.method}`,
          })
      }
    } catch (err) {
      replychildrpc(source, data.id, {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  function setzedcafetaskrid(taskrid: string) {
    const current = getstate()
    if (!current.zedcafe) {
      return
    }
    setstate({
      ...current,
      zedcafe: {
        ...current.zedcafe,
        taskrid,
      },
    })
  }

  function markzedcafeready() {
    const current = getstate()
    if (!current.zedcafe) {
      return
    }
    setstate({
      ...current,
      zedcafe: {
        ...current.zedcafe,
        ready: true,
      },
    })
  }

  function activatevm(guestfiles: WanixZedCafeGuestFile[]) {
    const current = getstate()
    if (
      current.vm?.bootstage !== 'export' &&
      current.vm?.bootstage !== 'activating'
    ) {
      return
    }
    postwanixiframeapilog(
      `#ramfs/zedcafe ready — activating vm slot (${guestfiles.length} files)`,
    )
    setstate({
      ...current,
      vm: current.vm
        ? {
            ...current.vm,
            bootstage: 'activating',
            guestfiles,
          }
        : null,
      zedcafe: current.zedcafe
        ? {
            ...current.zedcafe,
            guestfiles,
            ready: true,
          }
        : null,
    })
  }

  function markvmactive() {
    const current = getstate()
    if (!current.vm) {
      return
    }
    setstate({
      ...current,
      vm: {
        ...current.vm,
        bootstage: 'active',
      },
    })
  }

  function consumependingtasks() {
    const current = getstate()
    if (!current.pendingtasks.length) {
      return current.pendingtasks
    }
    const batch = current.pendingtasks
    setstate({ ...current, pendingtasks: [] })
    return batch
  }

  function consumeremovetasks() {
    const current = getstate()
    if (!current.removetaskids.length) {
      return []
    }
    const batch = current.removetaskids
    setstate({ ...current, removetaskids: [] })
    return batch
  }

  return {
    getstate,
    subscribe,
    setroot,
    getroot,
    setzedcafetaskrid,
    markzedcafeready,
    activatevm,
    markvmactive,
    consumependingtasks,
    consumeremovetasks,
    onsystemready,
    onsystemerror,
    onspawnvmcomplete,
    onspawnvmerror,
    onspawntaskcomplete,
    onspawntaskerror,
    onarchivemounted,
    onarchiveerror,
    onremotemounted,
    onremoteerror,
    onzedcafeerror,
    handlerrpc,
  }
}

export async function waitsystemready(
  system: WanixSystemElement,
  timeoutms = WANIX_IFRAME_READY_TIMEOUT_MS,
): Promise<WanixRoot> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      stop()
      reject(new Error('wanix iframe child: ready timeout'))
    }, timeoutms)
    const onready = () => {
      stop()
      resolve()
    }
    const onerror = (event: Event) => {
      stop()
      const custom = event as CustomEvent<{ error?: unknown }>
      const detail = custom.detail?.error
      reject(
        new Error(
          detail instanceof Error
            ? detail.message
            : typeof detail === 'string'
              ? detail
              : 'wanix-system error',
        ),
      )
    }
    const stop = () => {
      clearTimeout(timer)
      system.removeEventListener('ready', onready)
      system.removeEventListener('error', onerror)
    }
    if (system.isReady) {
      stop()
      resolve()
      return
    }
    system.addEventListener('ready', onready, { once: true })
    system.addEventListener('error', onerror, { once: true })
  })
  const wanixroot = system.root ?? null
  if (!wanixroot) {
    throw new Error('wanix iframe child: root missing after ready')
  }
  return wanixroot
}

export async function waitvmchildready(
  system: WanixSystemElement,
  timeoutms: number,
): Promise<WanixWakeElement> {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    const vm = system.querySelector('wanix-vm')
    if (vm?.rid && vm?.term) {
      return vm as WanixWakeElement
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`wanix iframe child: vm ${system.id} not ready`)
}

export async function halttarget(
  root: WanixRoot | null,
  kind: 'vm' | 'task',
  id: string,
) {
  if (!root) {
    return
  }
  if (kind === 'vm') {
    const entries = await root.readDir('#vm').catch(() => [] as string[])
    for (const name of entries) {
      const rid = name.replace(/\/$/, '')
      if (!rid || rid === 'v86') {
        continue
      }
      try {
        const inner = await root.readDir(`#vm/${rid}`)
        const taskname = inner.find((n) => n.startsWith('task'))
        if (taskname) {
          const taskrid = taskname.replace(/\/$/, '').replace(/^task\/?/, '')
          if (taskrid) {
            await root.writeFile(`#task/${taskrid}/ctl`, 'stop')
          }
        }
      } catch {
        // vm may already be gone
      }
    }
    return
  }
  const task = document.getElementById(id) as WanixTaskElement | null
  if (task?.rid) {
    await root.writeFile(`#task/${task.rid}/ctl`, 'stop')
  }
}
