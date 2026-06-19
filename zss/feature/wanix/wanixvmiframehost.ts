import type { DEVICELIKE } from 'zss/device/api'
import { suspendgadgetglcontext } from 'zss/gadget/canvasrelayout'
import {
  enterwanixattachedterminal,
  readterminalmodeattached,
} from 'zss/feature/wanix/wanixterminalmode'
import { wanixtermscreenwrite } from 'zss/feature/wanix/wanixtermscreen'
import {
  iswanixvmiframemsg,
  WANIX_VM_IFRAME_SRC,
} from 'zss/feature/wanix/wanixvmiframeprotocol'
import type { WANIX_VM_ASSET_URLS } from 'zss/feature/wanix/wanixvmassets'
import {
  readwanixattached,
  readwanixattachedkind,
  registervm,
  setwanixattached,
  type WANIX_ATTACH_KIND,
} from 'zss/feature/wanix/wanixsession'

const EMBED_RPC_TIMEOUT_MS = 600_000
const EMBED_READY_TIMEOUT_MS = 120_000

export type IFRAME_SPAWN_WANIX_VM_OPTS = {
  vmid?: string
  mem?: string
  attach?: boolean
  wait?: boolean
  skiptermconnect?: boolean
}

type VmPrepStage = 'idle' | 'mounting' | 'mount_ok' | 'spawn' | 'serial' | 'failed'

type IframeProxyEntry = {
  id: string
  mem: string
  serialbuffer: string
  autotiletriggered: boolean
  pendingvmline: string | null
  exitwaiter?: { resolve: (code: number) => void; reject: (err: Error) => void }
}

let iframeel: HTMLIFrameElement | null = null
let embedready = false
let embedreadywait: Promise<void> | null = null
let vmbindsready = false
let vmprepstage: VmPrepStage = 'idle'
let vmpreperror: string | undefined
let vmiframemodelatched: boolean | undefined
let rpcseq = 0
const rpcwaiters = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (err: Error) => void }
>()
const proxyvms = new Map<string, IframeProxyEntry>()
let attachedkind: WANIX_ATTACH_KIND | null = null
let attachedid: string | null = null
let onvmexit: ((vmid: string, code: number) => void) | undefined
let ingestchunk: ((kind: WANIX_ATTACH_KIND, id: string, chunk: string) => void) | undefined
let setstage: ((stage: VmPrepStage, err?: string) => void) | undefined

export function iswanixvmiframemode(): boolean {
  if (typeof document === 'undefined') {
    return false
  }
  if (vmiframemodelatched === undefined) {
    vmiframemodelatched = !!document.getElementById('frame')
  }
  return vmiframemodelatched
}

export function resetwanixvmiframemodelatch() {
  vmiframemodelatched = undefined
}

export function iswanixvmiframeactive(): boolean {
  return vmbindsready
}

export function readwanixvmiframeprepstage(): VmPrepStage {
  return vmprepstage
}

export function readwanixvmiframepreperror(): string | undefined {
  return vmpreperror
}

export function registervmiframehooks(hooks: {
  ingestchunk: (kind: WANIX_ATTACH_KIND, id: string, chunk: string) => void
  setstage: (stage: VmPrepStage, err?: string) => void
  onvmexit?: (vmid: string, code: number) => void
}) {
  ingestchunk = hooks.ingestchunk
  setstage = hooks.setstage
  onvmexit = hooks.onvmexit
}

function stripvmlineecho(entry: IframeProxyEntry, chunk: string): string {
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

function handleproxytermchunk(vmid: string, chunk: string) {
  const entry = proxyvms.get(vmid)
  if (!entry || !chunk.length) {
    return
  }
  const stripped = stripvmlineecho(entry, chunk)
  if (!stripped.length) {
    return
  }
  entry.serialbuffer += stripped
  ingestchunk?.('vm', vmid, stripped)
  if (attachedid !== vmid || attachedkind !== 'vm') {
    return
  }
  if (readterminalmodeattached()) {
    wanixtermscreenwrite(stripped)
    return
  }
  if (!entry.autotiletriggered) {
    entry.autotiletriggered = true
    setstage?.('serial')
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
  if (!iswanixvmiframemsg(data)) {
    return
  }
  if (data.type === 'zss-wanix-vm-ready') {
    embedready = true
    return
  }
  if (data.type === 'zss-wanix-vm-rpc-res') {
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
  if (data.type === 'zss-wanix-vm-term') {
    handleproxytermchunk(data.vmid, data.chunk)
    return
  }
  if (data.type === 'zss-wanix-vm-exit') {
    const entry = proxyvms.get(data.vmid)
    entry?.exitwaiter?.resolve(data.code)
    proxyvms.delete(data.vmid)
    if (attachedid === data.vmid && attachedkind === 'vm') {
      attachedid = null
      attachedkind = null
      setwanixattached(null, null)
    }
    onvmexit?.(data.vmid, data.code)
  }
}

let listenerinstalled = false

function ensurelistener() {
  if (listenerinstalled) {
    return
  }
  listenerinstalled = true
  window.addEventListener('message', onmessage)
}

function ensureiframeel(): HTMLIFrameElement {
  ensurelistener()
  if (iframeel) {
    return iframeel
  }
  const el = document.createElement('iframe')
  el.id = 'zss-wanix-vm-iframe'
  el.src = WANIX_VM_IFRAME_SRC
  el.style.position = 'fixed'
  el.style.left = '-9999px'
  el.style.top = '0'
  el.style.width = '800px'
  el.style.height = '600px'
  el.style.opacity = '0'
  el.style.border = '0'
  el.style.pointerEvents = 'none'
  document.body.appendChild(el)
  iframeel = el
  embedready = false
  embedreadywait = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('wanix vm iframe ready timeout'))
    }, EMBED_READY_TIMEOUT_MS)
    const onready = (event: MessageEvent) => {
      if (
        event.source === el.contentWindow &&
        iswanixvmiframemsg(event.data) &&
        event.data.type === 'zss-wanix-vm-ready'
      ) {
        clearTimeout(timer)
        window.removeEventListener('message', onready)
        embedready = true
        resolve()
      }
    }
    window.addEventListener('message', onready)
    el.addEventListener('error', () => {
      clearTimeout(timer)
      reject(new Error('wanix vm iframe failed to load'))
    })
  })
  return el
}

async function waitembedready() {
  await suspendgadgetglcontext()
  ensureiframeel()
  if (embedready) {
    return
  }
  await embedreadywait
}

async function embedrpc(method: string, args: unknown[]): Promise<unknown> {
  await waitembedready()
  const win = iframeel?.contentWindow
  if (!win) {
    throw new Error('wanix vm iframe missing contentWindow')
  }
  const id = ++rpcseq
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      rpcwaiters.delete(id)
      reject(new Error(`wanix vm iframe rpc timeout: ${method}`))
    }, EMBED_RPC_TIMEOUT_MS)
    rpcwaiters.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      reject: (err) => {
        clearTimeout(timer)
        reject(err)
      },
    })
    win.postMessage({ type: 'zss-wanix-vm-rpc', id, method, args }, window.location.origin)
  })
}

export async function iframeprepvmspace(
  device: DEVICELIKE,
  player: string,
  urls: WANIX_VM_ASSET_URLS,
  iobridgestart: (device: DEVICELIKE, player: string) => void,
): Promise<void> {
  if (vmbindsready) {
    iobridgestart(device, player)
    vmprepstage = 'mount_ok'
    return
  }
  vmprepstage = 'mounting'
  vmpreperror = undefined
  iobridgestart(device, player)
  setstage?.('mounting')
  try {
    await embedrpc('prep', [urls])
    vmbindsready = true
    vmprepstage = 'mount_ok'
    setstage?.('mount_ok')
  } catch (err) {
    vmprepstage = 'failed'
    vmpreperror = err instanceof Error ? err.message : String(err)
    setstage?.('failed', vmpreperror)
    throw err
  }
}

export async function iframespawnvm(
  opts: IFRAME_SPAWN_WANIX_VM_OPTS = {},
): Promise<{ vmid: string; code?: number }> {
  if (!vmbindsready) {
    throw new Error('vm assets not prepared')
  }
  const skipterm = opts.skiptermconnect === true
  const result = (await embedrpc('spawn', [
    {
      ...opts,
      attach: false,
      skiptermconnect: true,
    },
  ])) as { vmid: string; code?: number }
  const vmid = result.vmid
  if (!skipterm) {
    await suspendgadgetglcontext()
    await embedrpc('openvmterm', [vmid])
  }
  const mem = typeof opts.mem === 'string' ? opts.mem : '512M'
  proxyvms.set(vmid, {
    id: vmid,
    mem,
    serialbuffer: '',
    autotiletriggered: false,
    pendingvmline: null,
  })
  registervm({ id: vmid, label: vmid, mem })
  if (opts.attach !== false) {
    attachedkind = 'vm'
    attachedid = vmid
    setwanixattached('vm', vmid)
    await enterwanixattachedterminal()
    const entry = proxyvms.get(vmid)
    if (entry?.serialbuffer.length) {
      wanixtermscreenwrite(entry.serialbuffer)
    }
  }
  setstage?.('spawn')
  return result
}

export async function iframetermline(line: string): Promise<void> {
  await iframeterminput(line.endsWith('\r') ? line : `${line}\r`)
}

export async function iframeterminput(text: string): Promise<void> {
  const kind = readwanixattachedkind()
  const id = readwanixattached()
  if (kind === 'vm' && id && !text.includes('\n')) {
    const entry = proxyvms.get(id)
    if (entry && !text.endsWith('\r')) {
      entry.pendingvmline = text.replace(/\r$/, '')
    }
  }
  await embedrpc('terminput', [text])
}

export async function iframehaltvm(vmid?: string): Promise<void> {
  const id = vmid ?? attachedid ?? undefined
  await embedrpc('halt', [id])
  if (id) {
    proxyvms.delete(id)
  }
  if (id && attachedid === id) {
    attachedid = null
    attachedkind = null
    setwanixattached(null, null)
  }
}

export function readwanixvmiframserial(): string {
  const kind = readwanixattachedkind()
  const id = readwanixattached()
  if (kind !== 'vm' || !id) {
    return ''
  }
  return proxyvms.get(id)?.serialbuffer ?? ''
}

export function haswanixvmiframeproxy(vmid: string): boolean {
  return proxyvms.has(vmid)
}

export function teardownwanixvmiframe() {
  iframeel?.remove()
  iframeel = null
  embedready = false
  embedreadywait = null
  vmbindsready = false
  vmprepstage = 'idle'
  vmpreperror = undefined
  proxyvms.clear()
  attachedid = null
  attachedkind = null
  resetwanixvmiframemodelatch()
}
