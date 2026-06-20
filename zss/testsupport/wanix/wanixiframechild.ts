/**
 * Hidden iframe child — declarative `<wanix-system>` + `<wanix-term>` (upstream 0.4).
 * Parent drives prep/spawn via postMessage; serial streams through probe embed.
 */
import type { WANIX_VM_ASSET_URLS } from 'zss/feature/wanix/wanixvmassets'
import { installwanixtermprobeembed } from 'zss/testsupport/wanix/wanixtermprobe'
import {
  iswanixtermiframemsg,
  type WANIX_TERM_IFRAME_RPC,
} from 'zss/feature/wanix/wanixtermiframeprotocol'

type WanixRoot = {
  waitFor: (path: string, ms?: number) => Promise<void>
  readDir: (path: string) => Promise<string[]>
  writeFile: (path: string, data: string | Uint8Array) => Promise<void>
}

type WanixSystemElement = HTMLElement & {
  root?: WanixRoot
  addEventListener: HTMLElement['addEventListener']
}

type WanixTaskElement = HTMLElement & {
  rid?: string | null
  allocate?: () => Promise<void>
  start?: () => Promise<void>
}

type WanixWakeElement = HTMLElement & {
  rid?: string | null
  term?: string
  allocate?: () => Promise<void>
  start?: () => Promise<void>
  _awake?: () => Promise<void>
}

const VM_V86_PATH = '#vm/v86/v86-vm.wasm'
const READY_TIMEOUT_MS = 180_000

let sys: WanixSystemElement | null = null
let root: WanixRoot | null = null
let mode: 'idle' | 'vm' | 'task' = 'idle'

function posttoparent(message: object) {
  const target =
    window.opener ?? (window.parent !== window ? window.parent : null)
  target?.postMessage(message, window.location.origin)
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

function clearsystem() {
  const mount = document.getElementById('zss-wanix-iframe-mount')
  if (mount) {
    mount.replaceChildren()
  }
  sys?.remove()
  sys = null
  root = null
  mode = 'idle'
}

async function waitsystemready(system: WanixSystemElement) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      stop()
      reject(new Error('wanix iframe child: ready timeout'))
    }, READY_TIMEOUT_MS)
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
            : detail != null
              ? String(detail)
              : 'wanix-system error',
        ),
      )
    }
    const stop = () => {
      clearTimeout(timer)
      system.removeEventListener('ready', onready)
      system.removeEventListener('error', onerror)
    }
    system.addEventListener('ready', onready)
    system.addEventListener('error', onerror)
    if ((system as WanixSystemElement & { root?: WanixRoot }).root) {
      onready()
    }
  })
  root = system.root ?? null
  if (!root) {
    throw new Error('wanix iframe child: root missing after ready')
  }
}

function createsystem(wasmurl = '/wanix/wanix.wasm'): WanixSystemElement {
  clearsystem()
  const el = document.createElement('wanix-system') as WanixSystemElement
  el.setAttribute('wasm', wasmurl)
  el.id = 'zss-wanix-iframe-sys'
  document.body.appendChild(el)
  sys = el
  return el
}

function appendbind(dst: string, src: string, type?: string) {
  if (!sys) {
    throw new Error('wanix iframe child: system missing')
  }
  const bind = document.createElement('wanix-bind')
  bind.setAttribute('dst', dst)
  bind.setAttribute('src', src)
  if (type) {
    bind.setAttribute('type', type)
  }
  sys.appendChild(bind)
}

async function prepvmspace(urls: WANIX_VM_ASSET_URLS) {
  const system = createsystem()
  appendbind('.', urls.linux, 'archive')
  appendbind('vm', '#vm')
  appendbind('#vm/v86', urls.v86, 'archive')
  await waitsystemready(system)
  await root!.waitFor(VM_V86_PATH, 600_000)
  mode = 'vm'
}

async function preptaskspace() {
  const system = createsystem()
  appendbind('.', '#ramfs')
  await waitsystemready(system)
  mode = 'task'
}

function cleartargetels() {
  if (!sys) {
    return
  }
  sys.querySelectorAll(':scope > wanix-vm, :scope > wanix-task, :scope > wanix-term').forEach(
    (el) => el.remove(),
  )
}

async function spawnvm(vmid: string, mem: string) {
  if (!sys || mode !== 'vm') {
    throw new Error('wanix iframe child: vm space not prepared')
  }
  cleartargetels()
  const vm = document.createElement('wanix-vm') as WanixWakeElement
  vm.id = vmid
  vm.setAttribute('export', 'ttyS0')
  vm.setAttribute('term', '')
  vm.setAttribute('mem', mem)
  vm.setAttribute('start', '')
  sys.appendChild(vm)

  const term = document.createElement('wanix-term')
  term.setAttribute('path', '#vm/1/term')
  term.setAttribute('raw', '')
  sys.appendChild(term)

  await (vm._awake?.() ?? Promise.resolve())
  return { vmid, vrid: vm.rid ?? '1' }
}

async function spawntask(taskid: string, cmd: string) {
  if (!sys || mode !== 'task') {
    throw new Error('wanix iframe child: task space not prepared')
  }
  cleartargetels()
  const task = document.createElement('wanix-task') as WanixTaskElement
  task.id = taskid
  task.setAttribute('type', 'wasi')
  task.setAttribute('term', '')
  task.setAttribute('cmd', cmd)
  sys.appendChild(task)

  const term = document.createElement('wanix-term')
  term.setAttribute('path', `#task/${taskid}/term`)
  sys.appendChild(term)

  await task.allocate?.()
  await task.start?.()
  return { taskid, rid: task.rid ?? null }
}

async function putfile(name: string, bytes: number[]) {
  if (!root) {
    throw new Error('wanix iframe child: root missing')
  }
  await root.writeFile(name, new Uint8Array(bytes))
}

async function listdir(path: string) {
  if (!root) {
    throw new Error('wanix iframe child: root missing')
  }
  return root.readDir(path)
}

async function mountarchive(name: string, bytes: number[], mountdst: string) {
  if (!sys) {
    throw new Error('wanix iframe child: system missing')
  }
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/gzip' }))
  try {
    const bind = document.createElement('wanix-bind')
    bind.setAttribute('type', 'archive')
    bind.setAttribute('dst', mountdst || '.')
    bind.setAttribute('src', url)
    sys.appendChild(bind)
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('archive mount timeout')), 120_000)
      bind.addEventListener(
        'mount',
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true },
      )
      bind.addEventListener(
        'error',
        () => {
          clearTimeout(timer)
          reject(new Error(`archive mount failed: ${name}`))
        },
        { once: true },
      )
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function halttarget(kind: 'vm' | 'task', id: string) {
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
  } else {
    const task = document.getElementById(id) as WanixTaskElement | null
    if (task?.rid) {
      await root.writeFile(`#task/${task.rid}/ctl`, 'stop')
    }
  }
  cleartargetels()
}

async function handlerrpc(data: WANIX_TERM_IFRAME_RPC, source: MessageEventSource | null) {
  try {
    switch (data.method) {
      case 'prepvm': {
        const [urls] = data.args as [WANIX_VM_ASSET_URLS]
        await prepvmspace(urls)
        replyrpc(source, data.id, { result: { ok: true } })
        return
      }
      case 'preptask': {
        await preptaskspace()
        replyrpc(source, data.id, { result: { ok: true } })
        return
      }
      case 'spawnvm': {
        const [vmid, mem] = data.args as [string, string]
        const result = await spawnvm(vmid, mem)
        replyrpc(source, data.id, { result })
        return
      }
      case 'spawntask': {
        const [taskid, cmd] = data.args as [string, string]
        const result = await spawntask(taskid, cmd)
        replyrpc(source, data.id, { result })
        return
      }
      case 'haltvm': {
        const [vmid] = data.args as [string | undefined]
        await halttarget('vm', vmid ?? 'linux-vm')
        replyrpc(source, data.id, { result: { ok: true } })
        return
      }
      case 'halttask': {
        const [taskid] = data.args as [string | undefined]
        if (taskid) {
          await halttarget('task', taskid)
        } else {
          cleartargetels()
        }
        replyrpc(source, data.id, { result: { ok: true } })
        return
      }
      case 'putfile': {
        const [name, bytes] = data.args as [string, number[]]
        await putfile(name, bytes)
        replyrpc(source, data.id, { result: { ok: true } })
        return
      }
      case 'listdir': {
        const [path] = data.args as [string]
        const entries = await listdir(path)
        replyrpc(source, data.id, { result: entries })
        return
      }
      case 'mountarchive': {
        const [name, bytes, mountdst] = data.args as [string, number[], string]
        await mountarchive(name, bytes, mountdst)
        replyrpc(source, data.id, { result: { ok: true } })
        return
      }
      case 'teardown': {
        clearsystem()
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

export function installwanixiframechild() {
  installwanixtermprobeembed()

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) {
      return
    }
    const data = event.data
    if (!iswanixtermiframemsg(data)) {
      return
    }
    if (data.type === 'zss-wanix-term-rpc') {
      void handlerrpc(data, event.source)
    }
  })

  posttoparent({ type: 'zss-wanix-term-ready' })
}

installwanixiframechild()
