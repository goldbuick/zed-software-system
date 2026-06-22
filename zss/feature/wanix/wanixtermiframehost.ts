import type { DEVICELIKE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import {
  type WANIX_ATTACH_KIND,
  readwanixattached,
  readwanixattachedkind,
  registervm,
  setwanixattached,
} from 'zss/feature/wanix/wanixsession'
import {
  WANIX_TERM_IFRAME_SRC,
  iswanixtermiframemsg,
} from 'zss/feature/wanix/wanixtermiframeprotocol'
import {
  enterwanixattachedterminal,
  readterminalmodeattached,
} from 'zss/feature/wanix/wanixterminalmode'
import {
  type WanixTermProbeMsg,
  iswanixtermprobemsg,
} from 'zss/feature/wanix/wanixtermprobe'
import { wanixtermscreenwrite } from 'zss/feature/wanix/wanixtermscreen'
import type { WANIX_VM_ASSET_URLS } from 'zss/feature/wanix/wanixvmassets'

const EMBED_READY_MS = 120_000
const RPC_TIMEOUT_MS = 600_000

type VmPrepStage =
  | 'idle'
  | 'mounting'
  | 'mount_ok'
  | 'spawn'
  | 'serial'
  | 'failed'

type ProxyEntry = {
  id: string
  kind: WANIX_ATTACH_KIND
  mem?: string
  serialbuffer: string
  autotiletriggered: boolean
  pendingvmline: string | null
}

let iframeel: HTMLIFrameElement | null = null
let iframelayout: 'idle' | 'vm' | 'task' = 'idle'
let embedready = false
let embedreadywait: Promise<void> | null = null
let vmbindsready = false
let taskspaceready = false
let vmprepstage: VmPrepStage = 'idle'
let vmpreperror: string | undefined
let rpcseq = 0
const rpcwaiters = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (err: Error) => void }
>()
const proxies = new Map<string, ProxyEntry>()
let attachedkind: WANIX_ATTACH_KIND | null = null
let attachedid: string | null = null
let iobridgestarted = false

export function readwanixtermiframelayout(): 'idle' | 'vm' | 'task' {
  return iframelayout
}

export function iswanixtermiframemode(): boolean {
  return !!document.getElementById('frame')
}

export function iswanixtermiframeactive(): boolean {
  return vmbindsready || taskspaceready
}

export function readwanixtermiframeprepstage(): VmPrepStage {
  return vmprepstage
}

export function readwanixtermiframepreperror(): string | undefined {
  return vmpreperror
}

export function registervmtermiframehooks(hooks: {
  onvmexit?: (vmid: string, code: number) => void
  ontaskexit?: (taskid: string, code: number) => void
}) {
  void hooks
  // Reserved for child exit postMessage wiring.
}

function stripvmlineecho(entry: ProxyEntry, chunk: string): string {
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

function handlechunk(kind: WANIX_ATTACH_KIND, id: string, chunk: string) {
  const entry = proxies.get(id)
  if (!entry || !chunk.length) {
    return
  }
  const stripped = kind === 'vm' ? stripvmlineecho(entry, chunk) : chunk
  if (!stripped.length) {
    return
  }
  entry.serialbuffer += stripped
  if (attachedid !== id || attachedkind !== kind) {
    return
  }
  if (readterminalmodeattached()) {
    wanixtermscreenwrite(stripped)
    return
  }
  if (!entry.autotiletriggered) {
    entry.autotiletriggered = true
    if (kind === 'vm') {
      vmprepstage = 'serial'
    }
    void enterwanixattachedterminal()
    if (entry.serialbuffer.length > 0) {
      wanixtermscreenwrite(entry.serialbuffer)
    }
  }
}

function onmessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) {
    return
  }
  const data = event.data
  if (iswanixtermiframemsg(data)) {
    if (data.type === 'zss-wanix-term-ready') {
      embedready = true
      return
    }
    if (data.type === 'zss-wanix-term-rpc-res') {
      const waiter = rpcwaiters.get(data.id)
      if (!waiter) {
        return
      }
      rpcwaiters.delete(data.id)
      if (data.error) {
        waiter.reject(new Error(data.error))
        return
      }
      waiter.resolve(data.result)
      return
    }
    if (data.type === 'zss-wanix-term-chunk') {
      const kind = data.kind ?? attachedkind ?? 'vm'
      const id = data.id ?? attachedid ?? ''
      if (id) {
        handlechunk(kind, id, data.chunk)
      }
      return
    }
  }
  if (iswanixtermprobemsg(data) && data.type === 'zss-wanix-term-chunk') {
    const id = attachedid ?? ''
    const kind = attachedkind ?? 'vm'
    if (id) {
      handlechunk(kind, id, data.chunk)
    }
    return
  }
  if (
    iswanixtermprobemsg(data) &&
    data.type === 'zss-wanix-term-probe-rpc-res'
  ) {
    const waiter = rpcwaiters.get(data.id)
    if (!waiter) {
      return
    }
    rpcwaiters.delete(data.id)
    if (data.error) {
      waiter.reject(new Error(data.error))
      return
    }
    waiter.resolve(data.result)
  }
}

function ensureiframe(): HTMLIFrameElement {
  if (iframeel?.contentWindow) {
    return iframeel
  }
  let el = document.getElementById(
    'zss-wanix-term-iframe',
  ) as HTMLIFrameElement | null
  if (!el) {
    el = document.createElement('iframe')
    el.id = 'zss-wanix-term-iframe'
    el.title = 'wanix term host'
    el.src = WANIX_TERM_IFRAME_SRC
    el.style.cssText =
      'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;visibility:hidden;pointer-events:none;border:0'
    document.body.appendChild(el)
  }
  iframeel = el
  if (!embedreadywait) {
    window.addEventListener('message', onmessage)
    embedreadywait = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('wanix term iframe ready timeout'))
      }, EMBED_READY_MS)
      const poll = () => {
        if (embedready) {
          clearTimeout(timer)
          resolve()
          return
        }
        setTimeout(poll, 50)
      }
      poll()
    })
  }
  return el
}

async function waitembedready() {
  ensureiframe()
  await embedreadywait
}

function childwindow(): Window {
  const w = iframeel?.contentWindow
  if (!w) {
    throw new Error('wanix term iframe child missing')
  }
  return w
}

async function childrpc<T>(method: string, args: unknown[] = []): Promise<T> {
  await waitembedready()
  const id = ++rpcseq
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      rpcwaiters.delete(id)
      reject(new Error(`wanix term iframe rpc timeout: ${method}`))
    }, RPC_TIMEOUT_MS)
    rpcwaiters.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value as T)
      },
      reject: (err) => {
        clearTimeout(timer)
        reject(err)
      },
    })
    childwindow().postMessage(
      { type: 'zss-wanix-term-rpc', id, method, args },
      window.location.origin,
    )
  })
}

async function probechildrpc<T>(
  method: string,
  args: unknown[] = [],
): Promise<T> {
  await waitembedready()
  const id = ++rpcseq
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      rpcwaiters.delete(id)
      reject(new Error(`wanix term probe rpc timeout: ${method}`))
    }, RPC_TIMEOUT_MS)
    rpcwaiters.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value as T)
      },
      reject: (err) => {
        clearTimeout(timer)
        reject(err)
      },
    })
    childwindow().postMessage(
      {
        type: 'zss-wanix-term-probe-rpc',
        id,
        method,
        args,
      } satisfies WanixTermProbeMsg,
      window.location.origin,
    )
  })
}

export async function iframeprepvmspace(
  device: DEVICELIKE,
  player: string,
  urls: WANIX_VM_ASSET_URLS,
  onstart?: (device: DEVICELIKE, player: string) => void,
): Promise<void> {
  vmprepstage = 'mounting'
  vmpreperror = undefined
  apilog(device, player, 'wanix vm prep: mounting linux + v86 in iframe...')
  try {
    await childrpc('prepvm', [urls])
    vmbindsready = true
    iframelayout = 'vm'
    vmprepstage = 'mount_ok'
    apilog(device, player, 'wanix vm prep: mount ok')
    if (!iobridgestarted && onstart) {
      onstart(device, player)
      iobridgestarted = true
    }
  } catch (err) {
    vmprepstage = 'failed'
    vmpreperror = err instanceof Error ? err.message : String(err)
    throw err
  }
}

export async function iframepreptaskspace(): Promise<void> {
  await childrpc('preptask', [])
  taskspaceready = true
  iframelayout = 'task'
}

async function backfillvmserial(vmid: string) {
  const entry = proxies.get(vmid)
  if (!entry) {
    return
  }
  const full = await probechildrpc<string>('readserial', [])
  if (full.length <= entry.serialbuffer.length) {
    return
  }
  handlechunk('vm', vmid, full.slice(entry.serialbuffer.length))
}

/** Pull any serial not yet streamed via postMessage (iframe boot / stress waits). */
export async function syncwanixtermiframeserial(): Promise<void> {
  if (attachedkind === 'vm' && attachedid) {
    await backfillvmserial(attachedid)
  }
}

/** Block until child xterm shows login or shell prompt (probe-owned). */
export async function waitwanixtermiframeprompt(
  timeoutms: number,
): Promise<void> {
  await probechildrpc('waitprompt', [timeoutms])
  await syncwanixtermiframeserial()
}

export async function iframespawnvm(opts: {
  vmid?: string
  mem?: string
  attach?: boolean
}): Promise<{ vmid: string }> {
  const vmid = opts.vmid ?? 'linux-vm'
  const mem = opts.mem ?? '512M'
  const entry: ProxyEntry = {
    id: vmid,
    kind: 'vm',
    mem,
    serialbuffer: '',
    autotiletriggered: false,
    pendingvmline: null,
  }
  proxies.set(vmid, entry)
  registervm({ id: vmid, label: vmid, mem })
  if (opts.attach !== false) {
    attachedkind = 'vm'
    attachedid = vmid
    setwanixattached('vm', vmid)
  }
  try {
    await childrpc('spawnvm', [vmid, mem])
  } catch (err) {
    vmprepstage = 'failed'
    vmpreperror = err instanceof Error ? err.message : String(err)
    if (opts.attach !== false) {
      attachedkind = null
      attachedid = null
      setwanixattached(null, null)
    }
    proxies.delete(vmid)
    throw err
  }
  vmprepstage = 'spawn'
  if (opts.attach !== false) {
    await backfillvmserial(vmid)
  }
  return { vmid }
}

export async function iframespawntask(
  taskid: string,
  cmd: string,
  attach: boolean,
): Promise<{ taskid: string }> {
  const entry: ProxyEntry = {
    id: taskid,
    kind: 'task',
    serialbuffer: '',
    autotiletriggered: false,
    pendingvmline: null,
  }
  proxies.set(taskid, entry)
  await childrpc('spawntask', [taskid, cmd])
  if (attach) {
    attachedkind = 'task'
    attachedid = taskid
    setwanixattached('task', taskid)
    await enterwanixattachedterminal()
  }
  return { taskid }
}

export async function iframehaltvm(vmid?: string): Promise<void> {
  await childrpc('haltvm', [vmid])
  if (vmid) {
    proxies.delete(vmid)
  } else {
    for (const [id, entry] of proxies) {
      if (entry.kind === 'vm') {
        proxies.delete(id)
      }
    }
  }
  if (attachedkind === 'vm') {
    attachedkind = null
    attachedid = null
    setwanixattached(null, null)
  }
}

export async function iframehalttask(taskid?: string): Promise<void> {
  await childrpc('halttask', [taskid])
  if (taskid) {
    proxies.delete(taskid)
  } else {
    for (const [id, entry] of proxies) {
      if (entry.kind === 'task') {
        proxies.delete(id)
      }
    }
  }
  if (attachedkind === 'task') {
    attachedkind = null
    attachedid = null
    setwanixattached(null, null)
  }
}

export async function iframeterminput(text: string): Promise<void> {
  if (!text.length) {
    return
  }
  await probechildrpc('sendinput', [text])
}

export async function iframetermline(line: string): Promise<void> {
  const entry = attachedid && attachedkind ? proxies.get(attachedid) : undefined
  if (entry && attachedkind === 'vm') {
    entry.pendingvmline = line
  }
  const payload = attachedkind === 'vm' ? `${line}\r` : `${line}\n`
  await probechildrpc('sendinput', [payload])
}

export function readwanixtermiframserial(): string {
  const kind = readwanixattachedkind()
  const id = readwanixattached()
  if (!kind || !id) {
    return ''
  }
  return proxies.get(id)?.serialbuffer ?? ''
}

export async function iframechildputfile(
  name: string,
  bytes: Uint8Array,
): Promise<void> {
  await childrpc('putfile', [name, [...bytes]])
}

export async function iframechildlistdir(path: string): Promise<string[]> {
  return childrpc<string[]>('listdir', [path])
}

export async function iframechildmountarchive(
  name: string,
  bytes: Uint8Array,
  mountdst: string,
): Promise<void> {
  await childrpc('mountarchive', [name, [...bytes], mountdst])
}

export async function teardownwanixtermiframe(): Promise<void> {
  try {
    await childrpc('teardown', [])
  } catch {
    // iframe may already be gone
  }
  iframeel?.remove()
  iframeel = null
  embedready = false
  embedreadywait = null
  vmbindsready = false
  taskspaceready = false
  vmprepstage = 'idle'
  vmpreperror = undefined
  proxies.clear()
  attachedkind = null
  attachedid = null
  iobridgestarted = false
  iframelayout = 'idle'
}
