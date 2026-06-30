import type { DEVICELIKE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import {
  type ParentRpcWaiters,
  WANIX_IFRAME_RPC_TIMEOUT_MS,
  callchildrpc,
  rejectparentrpc,
  resolveparentrpc,
} from 'zss/feature/wanix/wanixifracerpc'
import type {
  WanixIframeRemote,
  WanixZedCafeGuestFile,
  WanixZedCafeHostState,
} from 'zss/feature/wanix/wanixiframechildtypes'
import {
  type WANIX_ATTACH_KIND,
  clearwanixautotileflags,
  readwanixattached,
  readwanixattachedkind,
  readwanixautotiletriggered,
  readwanixtask,
  readwanixvm,
  clearwanixremotes,
  registervm,
  setwanixattached,
  setwanixautotiletriggered,
} from 'zss/feature/wanix/wanixsession'
import type { WanixTermCellsSnapshot } from 'zss/feature/wanix/wanixtermcells'
import {
  WANIX_TERM_IFRAME_SRC,
  type WANIX_VM_PREP_STAGE,
  iswanixtermiframemsg,
} from 'zss/feature/wanix/wanixtermiframeprotocol'
import {
  enterwanixattachedterminal,
  readterminalmodeattached,
} from 'zss/feature/wanix/wanixterminalmode'
import { iswanixtermprobemsg } from 'zss/feature/wanix/wanixtermprobe'
import {
  wanixtermscreenshowdetachhint,
  wanixtermscreensync,
} from 'zss/feature/wanix/wanixtermscreen'
import type { WANIX_VM_ASSET_URLS } from 'zss/feature/wanix/wanixvmassets'
import { readwanixbootzedcafestate } from 'zss/feature/wanix/wanixzedcafe'
import { WANIX_ZED_CAFE_WASM_CMD } from 'zss/feature/wanix/wanixzedcafeconstants'

const EMBED_READY_MS = 120_000

// Fixed xterm cell size (px) for the default wanix-term font. The host sizes the
// iframe to cols*WIDTH x rows*HEIGHT and the child wanix-term FitAddon fits the
// xterm grid to that box. Width/height are set by the host, not in the cssText.
const WANIX_CHAR_WIDTH = 9
const WANIX_CHAR_HEIGHT = 18

const IFRAME_STYLE_HIDDEN =
  'position:fixed;left:-9999px;top:0;opacity:0;visibility:hidden;pointer-events:none;border:0'

let iframeel: HTMLIFrameElement | null = null
let roomready = false
let embedready = false
let embedreadywait: Promise<void> | null = null
let messagelistenerinstalled = false
let vmbindsready = false
let taskspaceready = false
let vmprepstage: WANIX_VM_PREP_STAGE = 'idle'
let vmpreperror: string | undefined
let rpcseq = 0
const rpcwaiters: ParentRpcWaiters = new Map()
let desirediframecols = 0
let desirediframerows = 0
let pendingcellsraf = 0

function schedulecellsyncafterresize() {
  if (!readterminalmodeattached() || !readwanixattached() || !embedready) {
    return
  }
  if (pendingcellsraf && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(pendingcellsraf)
  }
  if (typeof requestAnimationFrame !== 'function') {
    void synccellsfromchild().then((snapshot) => {
      if (snapshot) {
        applycells(snapshot)
      }
    })
    return
  }
  pendingcellsraf = requestAnimationFrame(() => {
    pendingcellsraf = 0
    void synccellsfromchild().then((snapshot) => {
      if (snapshot) {
        applycells(snapshot)
      }
    })
  })
}

function applyiframepixels() {
  if (!iframeel || desirediframecols <= 0 || desirediframerows <= 0) {
    // wanixshowlog('iframe-pixel-size:skip', {
    //   hasiframe: !!iframeel,
    //   cols: desirediframecols,
    //   rows: desirediframerows,
    // })
    return
  }
  // the +1 is for the scrollbar
  const widthpx = (desirediframecols + 1) * WANIX_CHAR_WIDTH
  const heightpx = desirediframerows * WANIX_CHAR_HEIGHT
  iframeel.style.width = `${widthpx}px`
  iframeel.style.height = `${heightpx}px`
  // wanixshowlog('iframe-pixel-size', {
  //   cols: desirediframecols,
  //   rows: desirediframerows,
  //   widthpx,
  //   heightpx,
  //   charwidth: WANIX_CHAR_WIDTH,
  //   charheight: WANIX_CHAR_HEIGHT,
  // })
  schedulecellsyncafterresize()
}

/** Host-driven sizing: pixel-size the iframe to cols x rows (fixed cell size). */
export function iframeapplytermsize(cols: number, rows: number) {
  if (cols <= 0 || rows <= 0) {
    return
  }
  // wanixshowlog('iframe-term-size', { cols, rows })
  desirediframecols = cols
  desirediframerows = rows
  applyiframepixels()
}

async function synccellsfromchild(): Promise<WanixTermCellsSnapshot | null> {
  return childrpc<WanixTermCellsSnapshot | null>(
    'zss-wanix-term-probe-rpc',
    'readcells',
    [],
  )
}

function applycells(snapshot: WanixTermCellsSnapshot) {
  wanixtermscreensync(snapshot)
  wanixtermscreenshowdetachhint()
}

async function opentileoncells(
  kind: WANIX_ATTACH_KIND,
  id: string,
  snapshot?: WanixTermCellsSnapshot,
) {
  if (readwanixautotiletriggered(kind, id)) {
    return
  }
  setwanixautotiletriggered(kind, id)
  if (kind === 'vm') {
    vmprepstage = 'tile'
  }
  await enterwanixattachedterminal()
  const cells = snapshot ?? (await synccellsfromchild())
  if (cells) {
    applycells(cells)
  } else {
    wanixtermscreenshowdetachhint()
  }
}

export function readwanixtermiframelayout(): 'idle' | 'room' {
  return roomready ? 'room' : 'idle'
}

export function iswanixtermiframemode(): boolean {
  return !!document.getElementById('frame')
}

export function iswanixtermiframeactive(): boolean {
  return roomready
}

export function readwanixtermiframeprepstage(): WANIX_VM_PREP_STAGE {
  return vmprepstage
}

export function readwanixtermiframepreperror(): string | undefined {
  return vmpreperror
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

function handlecells(
  kind: WANIX_ATTACH_KIND,
  id: string,
  snapshot: WanixTermCellsSnapshot,
) {
  const exists = kind === 'task' ? readwanixtask(id) : readwanixvm(id)
  if (!exists) {
    return
  }
  const attached = readwanixattached()
  const attachedkind = readwanixattachedkind()
  if (attached !== id || attachedkind !== kind) {
    return
  }
  if (readterminalmodeattached()) {
    applycells(snapshot)
    return
  }
  void opentileoncells(kind, id, snapshot)
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
    if (data.type === 'zss-wanix-term-apilog') {
      void Promise.all([
        import('zss/device/session'),
        import('zss/device/registerplayer'),
      ]).then(([{ SOFTWARE }, { registerreadplayer }]) => {
        apilog(SOFTWARE, registerreadplayer(), data.message)
      })
      return
    }
    if (data.type === 'zss-wanix-term-rpc-res') {
      if (data.error) {
        rejectparentrpc(rpcwaiters, data.id, data.error)
        return
      }
      resolveparentrpc(rpcwaiters, data.id, data.result)
      return
    }
  }
  if (iswanixtermprobemsg(data) && data.type === 'zss-wanix-term-cells') {
    const id = readwanixattached() ?? ''
    const kind = readwanixattachedkind() ?? 'vm'
    if (id) {
      handlecells(kind, id, {
        cols: data.cols,
        rows: data.rows,
        char: data.char,
        color: data.color,
        bg: data.bg,
        cursorx: data.cursorx,
        cursory: data.cursory,
        cursorvisible: data.cursorvisible,
      })
    }
    return
  }
  if (
    iswanixtermprobemsg(data) &&
    data.type === 'zss-wanix-term-probe-rpc-res'
  ) {
    if (data.error) {
      rejectparentrpc(rpcwaiters, data.id, data.error)
      return
    }
    resolveparentrpc(rpcwaiters, data.id, data.result)
  }
}

function createiframe(src: string, title: string): HTMLIFrameElement {
  const el = document.createElement('iframe')
  el.id = 'zss-wanix-term-iframe'
  el.title = title
  el.src = src
  el.style.cssText = IFRAME_STYLE_HIDDEN
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
  applyiframepixels()
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

async function childrpc<T>(
  msgtype: 'zss-wanix-term-rpc' | 'zss-wanix-term-probe-rpc',
  method: string,
  args: unknown[] = [],
): Promise<T> {
  await waitembedready()
  const label = msgtype === 'zss-wanix-term-rpc' ? 'iframe' : 'probe'
  return callchildrpc<T>({
    target: childwindow(),
    msgtype,
    method,
    args,
    timeoutms: WANIX_IFRAME_RPC_TIMEOUT_MS,
    nextid: () => ++rpcseq,
    waiters: rpcwaiters,
    label,
  })
}

export async function iframeattachtarget(
  kind: WANIX_ATTACH_KIND,
  id: string,
): Promise<void> {
  setwanixattached(kind, id)
  await childrpc('zss-wanix-term-rpc', 'activatetarget', [kind, id])
  await childrpc('zss-wanix-term-probe-rpc', 'setactiveterm', [id])
  await enterwanixattachedterminal()
  const snapshot = await synccellsfromchild()
  if (snapshot) {
    applycells(snapshot)
  } else {
    wanixtermscreenshowdetachhint()
  }
}

export async function iframecapturezedcafeexport(): Promise<
  WanixZedCafeGuestFile[]
> {
  if (!iswanixtermiframeactive()) {
    return []
  }
  const files = await childrpc('zss-wanix-term-rpc', 'readzedcafeexportfiles', [])
  return Array.isArray(files) ? (files as WanixZedCafeGuestFile[]) : []
}

async function iframebootroom(opts: {
  device?: DEVICELIKE | null
  player?: string | null
  urls?: WANIX_VM_ASSET_URLS
  vmcapable?: boolean
  zedcafe?: WanixZedCafeHostState | null
}): Promise<void> {
  const vmcapable = opts.vmcapable ?? false
  if (roomready && !vmcapable) {
    return
  }
  if (roomready && vmcapable && vmbindsready) {
    return
  }
  vmprepstage = 'mounting'
  vmpreperror = undefined
  const device = opts.device ?? null
  const player = opts.player ?? null
  const bootzedcafe =
    opts.zedcafe !== undefined
      ? opts.zedcafe
      : await readwanixbootzedcafestate(device, player)
  if (device && player) {
    apilog(
      device,
      player,
      vmcapable
        ? 'wanix room: booting vm-capable wanix-system...'
        : 'wanix room: booting task wanix-system...',
    )
  }
  try {
    ensureiframe()
    await childrpc('zss-wanix-term-rpc', 'bootroom', [
      { vmcapable, urls: opts.urls, zedcafe: bootzedcafe },
    ])
    roomready = true
    taskspaceready = true
    if (vmcapable) {
      vmbindsready = true
    }
    vmprepstage = 'mount_ok'
    if (device && player) {
      apilog(device, player, 'wanix room: ready')
    }
  } catch (err) {
    vmprepstage = 'failed'
    vmpreperror = err instanceof Error ? err.message : String(err)
    throw err
  }
}

export async function iframeprepvmspace(
  device: DEVICELIKE,
  player: string,
  urls: WANIX_VM_ASSET_URLS,
  guestfiles: WanixZedCafeGuestFile[] = [],
  inboxbytes?: number[],
): Promise<void> {
  let bootzedcafe: WanixZedCafeHostState | null = null
  if (guestfiles.length) {
    bootzedcafe = {
      cmd: WANIX_ZED_CAFE_WASM_CMD,
      generation: 1,
      ready: false,
      taskrid: null,
      guestfiles,
      inboxbytes: inboxbytes?.length ? inboxbytes : undefined,
    }
  } else {
    bootzedcafe = await readwanixbootzedcafestate(device, player)
  }
  await iframebootroom({
    device,
    player,
    urls,
    vmcapable: true,
    zedcafe: bootzedcafe,
  })
}

export async function iframepreptaskspace(
  device?: DEVICELIKE,
  player?: string,
): Promise<void> {
  await iframebootroom({
    device,
    player,
    vmcapable: false,
  })
}

export async function iframespawnvm(opts: {
  vmid?: string
  mem?: string
  attach?: boolean
  inboxbytes?: number[]
  guestfiles?: WanixZedCafeGuestFile[]
}): Promise<{ vmid: string }> {
  const vmid = opts.vmid ?? 'linux-vm'
  const mem = opts.mem ?? '512M'
  registervm({ id: vmid, label: vmid, mem })
  if (opts.attach !== false) {
    setwanixattached('vm', vmid)
    await childrpc('zss-wanix-term-rpc', 'activatetarget', ['vm', vmid])
    await childrpc('zss-wanix-term-probe-rpc', 'setactiveterm', [vmid])
  }
  vmprepstage = 'spawn'
  await childrpc('zss-wanix-term-rpc', 'spawnvm', [
    vmid,
    mem,
    opts.inboxbytes ?? [],
    opts.guestfiles ?? [],
  ])
  return { vmid }
}

export async function iframespawntask(
  taskid: string,
  cmd: string,
  attach: boolean,
): Promise<{ taskid: string }> {
  await childrpc('zss-wanix-term-rpc', 'spawntask', [taskid, cmd])
  if (attach) {
    setwanixattached('task', taskid)
    await childrpc('zss-wanix-term-rpc', 'activatetarget', ['task', taskid])
    await childrpc('zss-wanix-term-probe-rpc', 'setactiveterm', [taskid])
  }
  return { taskid }
}

export async function iframehaltvm(vmid?: string): Promise<void> {
  await childrpc('zss-wanix-term-rpc', 'haltvm', [vmid])
  if (readwanixattachedkind() === 'vm') {
    setwanixattached(null, null)
  }
}

export async function iframehalttask(taskid?: string): Promise<void> {
  await childrpc('zss-wanix-term-rpc', 'halttask', [taskid])
  if (readwanixattachedkind() === 'task') {
    setwanixattached(null, null)
  }
}

export async function iframeterminput(text: string): Promise<void> {
  if (!text.length) {
    return
  }
  await childrpc('zss-wanix-term-probe-rpc', 'sendinput', [text])
}

export async function iframetermline(line: string): Promise<void> {
  const attachedkind = readwanixattachedkind()
  const payload = attachedkind === 'vm' ? `${line}\r` : `${line}\n`
  await childrpc('zss-wanix-term-probe-rpc', 'sendinput', [payload])
}

export async function iframechildputfile(
  name: string,
  bytes: Uint8Array,
): Promise<void> {
  await childrpc('zss-wanix-term-rpc', 'putfile', [name, [...bytes]])
}

export async function iframechildsynczedcafe(
  cmd: string,
  generation: number,
): Promise<void> {
  await childrpc('zss-wanix-term-rpc', 'synczedcafe', [cmd, generation])
}

export async function iframechildwaitzedcafeready(
  timeoutms = 30_000,
): Promise<string | null> {
  return childrpc<string | null>('zss-wanix-term-rpc', 'waitzedcafeready', [
    timeoutms,
  ])
}

export async function iframechildsetzedcafeready(
  ready: boolean,
): Promise<void> {
  await childrpc('zss-wanix-term-rpc', 'setzedcafeready', [ready])
}

export async function iframechildreadzedcafetaskrid(): Promise<string | null> {
  return childrpc<string | null>('zss-wanix-term-rpc', 'readzedcafetaskrid', [])
}

export async function iframechildhaltzedcafe(): Promise<void> {
  await childrpc('zss-wanix-term-rpc', 'haltzedcafe', [])
}

export async function iframechildrefreshvmzedcafeexport(
  guestfiles: WanixZedCafeGuestFile[],
): Promise<void> {
  if (!iswanixtermiframeactive()) {
    return
  }
  await childrpc('zss-wanix-term-rpc', 'refreshvmzedcafeexport', [guestfiles])
}

export async function iframechildprobezedcafeexport(): Promise<unknown> {
  return childrpc('zss-wanix-term-rpc', 'probezedcafeexport', [])
}

export async function iframechildlistdir(path: string): Promise<string[]> {
  return childrpc<string[]>('zss-wanix-term-rpc', 'listdir', [path])
}

export async function iframechildmountarchive(
  name: string,
  bytes: Uint8Array,
  mountdst: string,
): Promise<void> {
  await childrpc('zss-wanix-term-rpc', 'mountarchive', [
    name,
    [...bytes],
    mountdst,
  ])
}

export async function iframechildconnectremote(
  url: string,
  mountdst?: string,
  label?: string,
): Promise<WanixIframeRemote> {
  return childrpc<WanixIframeRemote>('zss-wanix-term-rpc', 'connectremote', [
    url,
    mountdst,
    label,
  ])
}

export async function iframechilddisconnectremote(remoteid: string): Promise<void> {
  await childrpc('zss-wanix-term-rpc', 'disconnectremote', [remoteid])
}

export async function iframechildlistremotes(): Promise<WanixIframeRemote[]> {
  return childrpc<WanixIframeRemote[]>('zss-wanix-term-rpc', 'listremotes', [])
}

export async function iframechildstartbridge(url: string): Promise<void> {
  await childrpc('zss-wanix-term-rpc', 'startbridge', [url])
}

export async function iframechildstopbridge(): Promise<void> {
  await childrpc('zss-wanix-term-rpc', 'stopbridge', [])
}

export async function iframechildreadbridgestatus(): Promise<{
  active: boolean
  url: string
  sessions: number
}> {
  return childrpc('zss-wanix-term-rpc', 'readbridgestatus', [])
}

/** Test hook — register a proxy + mark attached without a live iframe. */
export function wanixtermiframehosttestsetattached(
  kind: WANIX_ATTACH_KIND,
  id: string,
) {
  setwanixattached(kind, id)
}

/** Test hook — deliver a cell snapshot to the attach-on-cells handler. */
export function wanixtermiframehosttestcells(
  kind: WANIX_ATTACH_KIND,
  id: string,
  snapshot: WanixTermCellsSnapshot,
) {
  handlecells(kind, id, snapshot)
}

/** Test hook — reset proxy + attach state. */
export function wanixtermiframehosttestreset() {
  clearwanixautotileflags()
  setwanixattached(null, null)
}

export async function teardownwanixtermiframe(): Promise<void> {
  try {
    await childrpc('zss-wanix-term-rpc', 'teardown', [])
  } catch {
    // iframe may already be gone
  }
  iframeel?.remove()
  iframeel = null
  embedready = false
  embedreadywait = null
  roomready = false
  vmbindsready = false
  taskspaceready = false
  vmprepstage = 'idle'
  vmpreperror = undefined
  clearwanixautotileflags()
  clearwanixremotes()
  setwanixattached(null, null)
  desirediframecols = 0
  desirediframerows = 0
}

/** Re-read iframe xterm cells into the tile buffer (after tile resize). */
export async function iframesynctilefromchild(): Promise<void> {
  const snapshot = await synccellsfromchild()
  if (snapshot) {
    applycells(snapshot)
    return
  }
  wanixtermscreenshowdetachhint()
}
