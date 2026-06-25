import {
  WANIX_IFRAME_ARCHIVE_MOUNT_TIMEOUT_MS,
  halttarget,
} from 'zss/feature/wanix/wanixiframechildhelpers'
import type {
  WanixIframeArchive,
  WanixIframeHostState,
  WanixRoot,
} from 'zss/feature/wanix/wanixiframechildtypes'
import { createidlewanixiframestate } from 'zss/feature/wanix/wanixiframechildtypes'
import type { WANIX_TERM_IFRAME_RPC } from 'zss/feature/wanix/wanixtermiframeprotocol'
import type { WANIX_VM_ASSET_URLS } from 'zss/feature/wanix/wanixvmassets'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

function createdeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function replyrpc(
  source: MessageEventSource | null,
  id: number,
  payload: { result?: unknown; error?: string },
) {
  if (!source || typeof (source as Window).postMessage !== 'function') {
    return
  }
  ;(source as Window).postMessage(
    { type: 'zss-wanix-term-rpc-res', id, ...payload },
    window.location.origin,
  )
}

function nextmountkey(state: WanixIframeHostState): number {
  return state.mountKey + 1
}

function witharchives(
  state: WanixIframeHostState,
  archives: WanixIframeArchive[],
): WanixIframeHostState {
  return { ...state, archives } as WanixIframeHostState
}

export type WanixIframeChildController = ReturnType<
  typeof createwanixiframechildcontroller
>

export function createwanixiframechildcontroller() {
  let state = createidlewanixiframestate()
  let root: WanixRoot | null = null
  let archiveseq = 0
  const listeners = new Set<() => void>()

  let pendingpreptask: Deferred<void> | null = null
  let pendingspawnvm: Deferred<{ vmid: string; vrid: string }> | null = null
  let pendingspawntask: Deferred<{
    taskid: string
    rid: string | null
  }> | null = null
  const pendingarchives = new Map<string, Deferred<void>>()

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

  function onsystemready(wanixroot: WanixRoot) {
    root = wanixroot
    if (state.phase === 'task-system') {
      setstate({ ...state, phase: 'task-ready' })
      pendingpreptask?.resolve()
      pendingpreptask = null
    }
  }

  function onsystemerror(err: Error) {
    pendingpreptask?.reject(err)
    pendingpreptask = null
    pendingspawnvm?.reject(err)
    pendingspawnvm = null
  }

  function onspawnvmcomplete(result: { vmid: string; vrid: string }) {
    pendingspawnvm?.resolve(result)
    pendingspawnvm = null
  }

  function onspawnvmerror(err: Error) {
    pendingspawnvm?.reject(err)
    pendingspawnvm = null
  }

  function onspawntaskcomplete(result: { taskid: string; rid: string | null }) {
    pendingspawntask?.resolve(result)
    pendingspawntask = null
  }

  function onspawntaskerror(err: Error) {
    pendingspawntask?.reject(err)
    pendingspawntask = null
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

  async function handlerrpc(
    data: WANIX_TERM_IFRAME_RPC,
    source: MessageEventSource | null,
  ) {
    try {
      switch (data.method) {
        case 'prepvm': {
          const [urls] = data.args as [WANIX_VM_ASSET_URLS]
          setstate({
            phase: 'vm-prepared',
            mountKey: nextmountkey(state),
            archives: [],
            urls,
          })
          root = null
          replyrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'preptask': {
          const deferred = createdeferred<void>()
          pendingpreptask = deferred
          setstate({
            phase: 'task-system',
            mountKey: nextmountkey(state),
            archives: [],
          })
          root = null
          await deferred.promise
          replyrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'spawnvm': {
          const [vmid, mem] = data.args as [string, string]
          if (state.phase !== 'vm-prepared') {
            throw new Error('wanix iframe child: vm space not prepared')
          }
          const deferred = createdeferred<{ vmid: string; vrid: string }>()
          pendingspawnvm = deferred
          setstate({
            phase: 'vm-active',
            mountKey: nextmountkey(state),
            archives: state.archives,
            urls: state.urls,
            vmid,
            mem,
          })
          root = null
          const result = await deferred.promise
          replyrpc(source, data.id, { result })
          return
        }
        case 'spawntask': {
          const [taskid, cmd] = data.args as [string, string]
          if (state.phase !== 'task-ready' && state.phase !== 'task-active') {
            throw new Error('wanix iframe child: task space not prepared')
          }
          const deferred = createdeferred<{
            taskid: string
            rid: string | null
          }>()
          pendingspawntask = deferred
          setstate({
            phase: 'task-active',
            mountKey: state.mountKey,
            archives: state.archives,
            taskid,
            cmd,
          })
          const result = await deferred.promise
          replyrpc(source, data.id, { result })
          return
        }
        case 'haltvm': {
          const [vmid] = data.args as [string | undefined]
          await halttarget(root, 'vm', vmid ?? 'linux-vm')
          if (state.phase === 'vm-active' && 'urls' in state) {
            setstate({
              phase: 'vm-prepared',
              mountKey: nextmountkey(state),
              archives: state.archives,
              urls: state.urls,
            })
          }
          root = null
          replyrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'halttask': {
          const [taskid] = data.args as [string | undefined]
          if (taskid) {
            await halttarget(root, 'task', taskid)
          }
          if (
            state.phase === 'task-active' ||
            state.phase === 'task-ready' ||
            state.phase === 'task-system'
          ) {
            setstate({
              phase: 'task-ready',
              mountKey: state.mountKey,
              archives: state.archives,
            })
          }
          replyrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'putfile': {
          const [name, bytes] = data.args as [string, number[]]
          if (!root) {
            throw new Error('wanix iframe child: root missing')
          }
          await root.writeFile(name, new Uint8Array(bytes))
          replyrpc(source, data.id, { result: { ok: true } })
          return
        }
        case 'listdir': {
          const [path] = data.args as [string]
          if (!root) {
            throw new Error('wanix iframe child: root missing')
          }
          const entries = await root.readDir(path)
          replyrpc(source, data.id, { result: entries })
          return
        }
        case 'mountarchive': {
          const [name, bytes, mountdst] = data.args as [
            string,
            number[],
            string,
          ]
          if (
            state.phase !== 'task-ready' &&
            state.phase !== 'task-active' &&
            state.phase !== 'task-system'
          ) {
            throw new Error('wanix iframe child: system missing')
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
            replyrpc(source, data.id, { result: { ok: true } })
          } finally {
            clearTimeout(timer)
            URL.revokeObjectURL(src)
          }
          return
        }
        case 'teardown': {
          setstate(createidlewanixiframestate())
          root = null
          replyrpc(source, data.id, { result: { ok: true } })
          return
        }
        default:
          replyrpc(source, data.id, { error: `unknown rpc: ${data.method}` })
      }
    } catch (err) {
      replyrpc(source, data.id, {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return {
    getstate,
    subscribe,
    setroot,
    getroot,
    onsystemready,
    onsystemerror,
    onspawnvmcomplete,
    onspawnvmerror,
    onspawntaskcomplete,
    onspawntaskerror,
    onarchivemounted,
    onarchiveerror,
    handlerrpc,
  }
}
