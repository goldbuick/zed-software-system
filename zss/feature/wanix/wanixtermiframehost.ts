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
import {
  wanixtermscreenshowdetachhint,
  wanixtermscreenwrite,
} from 'zss/feature/wanix/wanixtermscreen'
import type { WANIX_VM_ASSET_URLS } from 'zss/feature/wanix/wanixvmassets'

const EMBED_READY_MS = 120_000
const RPC_TIMEOUT_MS = 600_000
const IFRAME_STYLE_HIDDEN =
  'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;visibility:hidden;pointer-events:none;border:0'
// Debug overlay: translucent, click-through, top-right. Opt-in only.
const IFRAME_STYLE_SHOW =
  'position:fixed;right:0;top:0;width:640px;height:480px;opacity:0.6;visibility:visible;pointer-events:none;border:0;z-index:2147483647'

/** Dev-only: reveal the hidden VM iframe as a translucent overlay to inspect the real xterm. */
function iswanixiframeshow(): boolean {
  try {
    if ((window as unknown as { ZSS_WANIX_SHOW?: unknown }).ZSS_WANIX_SHOW) {
      return true
    }
    return window.localStorage?.getItem('zss-wanix-show') === '1'
  } catch {
    return false
  }
}

function appendshowparam(src: string): string {
  if (!iswanixiframeshow()) {
    return src
  }
  return src.includes('?') ? `${src}&show=1` : `${src}?show=1`
}

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
let messagelistenerinstalled = false
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
let iobridgestarted = false

const TERM_SIZE_DEBOUNCE_MS = 200
const VM_IDLE_PROMPT_RE = /~\s#/
let desiredtermcols = 0
let desiredtermrows = 0
let appliedcols = 0
let appliedrows = 0
let sttysentcols = 0
let sttysentrows = 0
let termsizehandle: ReturnType<typeof setTimeout> | undefined

/** Forget what we pushed to the guest so a freshly attached VM is re-synced. */
function resetiframetermsizeapplied() {
  appliedcols = 0
  appliedrows = 0
  sttysentcols = 0
  sttysentrows = 0
}

function resetiframetermsize() {
  if (termsizehandle !== undefined) {
    clearTimeout(termsizehandle)
    termsizehandle = undefined
  }
  desiredtermcols = 0
  desiredtermrows = 0
  resetiframetermsizeapplied()
}

async function opentileonserial(kind: WANIX_ATTACH_KIND, entry: ProxyEntry) {
  if (entry.autotiletriggered) {
    return
  }
  entry.autotiletriggered = true
  if (kind === 'vm') {
    vmprepstage = 'serial'
  }
  await enterwanixattachedterminal()
  if (entry.serialbuffer.length > 0) {
    wanixtermscreenwrite(entry.serialbuffer)
  }
  wanixtermscreenshowdetachhint()
}

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

function resetembedreadywait() {
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

function ensuremessagelistener() {
  if (messagelistenerinstalled) {
    return
  }
  window.addEventListener('message', onmessage)
  messagelistenerinstalled = true
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
  const attached = readwanixattached()
  const attachedkind = readwanixattachedkind()
  if (attached !== id || attachedkind !== kind) {
    return
  }
  if (kind === 'vm') {
    // A prompt may have just landed — retry the idle-gated stty winsize push.
    trysendiframevmstty()
  }
  if (readterminalmodeattached()) {
    wanixtermscreenwrite(stripped)
    return
  }
  void opentileonserial(kind, entry)
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
      const kind = data.kind ?? readwanixattachedkind() ?? 'vm'
      const id = data.id ?? readwanixattached() ?? ''
      if (id) {
        handlechunk(kind, id, data.chunk)
      }
      return
    }
  }
  if (iswanixtermprobemsg(data) && data.type === 'zss-wanix-term-chunk') {
    const id = readwanixattached() ?? ''
    const kind = readwanixattachedkind() ?? 'vm'
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

function createiframe(src: string, title: string): HTMLIFrameElement {
  const el = document.createElement('iframe')
  el.id = 'zss-wanix-term-iframe'
  el.title = title
  el.src = appendshowparam(src)
  el.style.cssText = iswanixiframeshow()
    ? IFRAME_STYLE_SHOW
    : IFRAME_STYLE_HIDDEN
  document.body.appendChild(el)
  return el
}

function ensureiframe(): HTMLIFrameElement {
  ensuremessagelistener()
  if (iframeel?.contentWindow) {
    return iframeel
  }
  let el = document.getElementById(
    'zss-wanix-term-iframe',
  ) as HTMLIFrameElement | null
  el ??= createiframe(WANIX_TERM_IFRAME_SRC, 'wanix term host')
  iframeel = el
  if (!embedreadywait) {
    resetembedreadywait()
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

export async function iframeattachtarget(
  kind: WANIX_ATTACH_KIND,
  id: string,
): Promise<void> {
  if (!proxies.has(id)) {
    proxies.set(id, {
      id,
      kind,
      serialbuffer: '',
      autotiletriggered: false,
      pendingvmline: null,
    })
  }
  setwanixattached(kind, id)
  if (kind === 'vm') {
    // New guest defaults to 80 cols — re-push the current tile size to it.
    resetiframetermsizeapplied()
  }
  await enterwanixattachedterminal()
  const entry = proxies.get(id)
  if (entry && entry.serialbuffer.length > 0) {
    wanixtermscreenwrite(entry.serialbuffer)
  }
  wanixtermscreenshowdetachhint()
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
    iframelayout = 'vm'
    ensureiframe()
    await childrpc('prepvm', [urls])
    vmbindsready = true
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
  iframelayout = 'task'
  await childrpc('preptask', [])
  taskspaceready = true
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
  const attached = readwanixattached()
  if (readwanixattachedkind() === 'vm' && attached) {
    await backfillvmserial(attached)
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
    setwanixattached('vm', vmid)
    // New guest defaults to 80 cols — re-push the current tile size to it.
    resetiframetermsizeapplied()
  }
  vmprepstage = 'spawn'
  await childrpc('spawnvm', [vmid, mem])
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
    setwanixattached('task', taskid)
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
  if (readwanixattachedkind() === 'vm') {
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
  if (readwanixattachedkind() === 'task') {
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
  const attached = readwanixattached()
  const attachedkind = readwanixattachedkind()
  const entry = attached && attachedkind ? proxies.get(attached) : undefined
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

/**
 * Sync the guest terminal width to the visible tile (iframe route). Resizes the
 * child xterm so serial readback keeps full-width lines, then pushes the winsize
 * into the guest via `stty` at an idle prompt. Debounced; retried from handlechunk.
 */
export function iframeapplytermsize(cols: number, rows: number) {
  if (cols <= 0 || rows <= 0) {
    return
  }
  desiredtermcols = cols
  desiredtermrows = rows
  if (termsizehandle !== undefined) {
    clearTimeout(termsizehandle)
  }
  termsizehandle = setTimeout(() => {
    termsizehandle = undefined
    void iframeapplytermsizenow()
  }, TERM_SIZE_DEBOUNCE_MS)
}

async function iframeapplytermsizenow() {
  if (readwanixattachedkind() !== 'vm' || desiredtermcols <= 0) {
    return
  }
  if (desiredtermcols !== appliedcols || desiredtermrows !== appliedrows) {
    const cols = desiredtermcols
    const rows = desiredtermrows
    try {
      await probechildrpc('setsize', [cols, rows])
      appliedcols = cols
      appliedrows = rows
    } catch {
      // child xterm not ready — retried on the next size change / chunk
    }
  }
  trysendiframevmstty()
}

/**
 * Push the desired winsize into the guest via `stty`, but only at an idle shell
 * prompt so we never inject into a running program. Re-attempted from handlechunk.
 */
function trysendiframevmstty() {
  if (readwanixattachedkind() !== 'vm' || desiredtermcols <= 0) {
    return
  }
  if (desiredtermcols === sttysentcols && desiredtermrows === sttysentrows) {
    return
  }
  const tail = readwanixtermiframserial().slice(-200)
  if (!VM_IDLE_PROMPT_RE.test(tail)) {
    return
  }
  const cols = desiredtermcols
  const rows = desiredtermrows
  sttysentcols = cols
  sttysentrows = rows
  // VM serial submits lines with CR (matches iframetermline).
  void probechildrpc('sendinput', [`stty cols ${cols} rows ${rows}\r`]).catch(
    () => {
      // input chain rejected — allow a retry on the next chunk
      if (sttysentcols === cols && sttysentrows === rows) {
        sttysentcols = 0
        sttysentrows = 0
      }
    },
  )
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
  setwanixattached(null, null)
  iobridgestarted = false
  iframelayout = 'idle'
  resetiframetermsize()
}
