import {
  WANIX_BRIDGE_PROXY_PATH,
  readwanixbridgeproxyimporturl,
} from 'zss/feature/wanix/wanixremoteconstants'
import {
  WANIX_IFRAME_SYSTEM_ID,
  type WanixSystemElement,
} from 'zss/feature/wanix/wanixiframechildtypes'
import { postwanixiframeapilog } from 'zss/feature/wanix/wanixtermiframeprotocol'

const MUX_VERSION = 1
const MUX_SESSION_SIZE = 16
const WANIX_BRIDGE_MAX_SESSIONS = 9
const WANIX_BRIDGE_TASK_ID = '1'

type WanixSystemWithP9 = WanixSystemElement & {
  _open9P?: (taskid?: string) => MessagePort
}

type HostControlMsg = {
  type: string
  id: string
}

type BridgeSession = {
  id: string
  port: MessagePort
  onportmessage: (event: MessageEvent) => void
}

let hostws: WebSocket | null = null
let hosturl = ''
const sessions = new Map<string, BridgeSession>()
let onwsmessage: ((event: MessageEvent) => void) | null = null
let onwsclose: (() => void) | null = null
let onwserror: ((event: Event) => void) | null = null

function padsessionid(id: string): Uint8Array {
  if (!id || id.length > MUX_SESSION_SIZE) {
    throw new Error(`invalid session id: ${id}`)
  }
  const out = new Uint8Array(MUX_SESSION_SIZE)
  const encoded = new TextEncoder().encode(id)
  out.set(encoded)
  return out
}

function trimsessionid(raw: Uint8Array): string {
  let end = raw.length
  while (end > 0 && raw[end - 1] === 0) {
    end--
  }
  return new TextDecoder().decode(raw.subarray(0, end))
}

function encodemuxframe(sessionid: string, payload: Uint8Array): Uint8Array {
  const sid = padsessionid(sessionid)
  const out = new Uint8Array(1 + MUX_SESSION_SIZE + payload.length)
  out[0] = MUX_VERSION
  out.set(sid, 1)
  out.set(payload, 1 + MUX_SESSION_SIZE)
  return out
}

function decodemuxframe(
  buf: Uint8Array,
): { sessionid: string; payload: Uint8Array } {
  if (buf.length < 1 + MUX_SESSION_SIZE) {
    throw new Error('mux frame too short')
  }
  if (buf[0] !== MUX_VERSION) {
    throw new Error(`unsupported mux version ${buf[0]}`)
  }
  const sessionid = trimsessionid(buf.subarray(1, 1 + MUX_SESSION_SIZE))
  const payload = buf.subarray(1 + MUX_SESSION_SIZE)
  return { sessionid, payload }
}

function readwsbytes(data: Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  if (data instanceof ArrayBuffer) {
    return Promise.resolve(new Uint8Array(data))
  }
  if (data instanceof Uint8Array) {
    return Promise.resolve(data)
  }
  return data.arrayBuffer().then((buf) => new Uint8Array(buf))
}

function parsesessioncontrol(raw: string): HostControlMsg | null {
  try {
    const msg = JSON.parse(raw) as HostControlMsg
    if (!msg || typeof msg.type !== 'string' || typeof msg.id !== 'string') {
      return null
    }
    return msg
  } catch {
    return null
  }
}

async function waitsystemelement(): Promise<WanixSystemWithP9> {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const system = document.querySelector(
      `wanix-system#${WANIX_IFRAME_SYSTEM_ID}`,
    ) as WanixSystemWithP9 | null
    if (system?.isReady && typeof system._open9P === 'function') {
      return system
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('wanix bridge: wanix-system not ready')
}

function opensession(sessionid: string) {
  if (sessions.has(sessionid)) {
    return
  }
  if (sessions.size >= WANIX_BRIDGE_MAX_SESSIONS) {
    postwanixiframeapilog(
      `wanix bridge: session cap (${WANIX_BRIDGE_MAX_SESSIONS}) reached`,
    )
    return
  }
  const system = document.querySelector(
    `wanix-system#${WANIX_IFRAME_SYSTEM_ID}`,
  ) as WanixSystemWithP9 | null
  if (!system || typeof system._open9P !== 'function') {
    postwanixiframeapilog('wanix bridge: wanix-system missing for new session')
    return
  }
  const port = system._open9P(WANIX_BRIDGE_TASK_ID)
  const onportmessage = (event: MessageEvent) => {
    if (!hostws || hostws.readyState !== WebSocket.OPEN) {
      return
    }
    void readwsbytes(event.data as Blob | ArrayBuffer).then((bytes) => {
      const frame = encodemuxframe(sessionid, bytes)
      hostws?.send(frame)
    })
  }
  port.addEventListener('message', onportmessage)
  port.start()
  sessions.set(sessionid, { id: sessionid, port, onportmessage })
  postwanixiframeapilog(`wanix bridge: session ${sessionid} open`)
}

function closesession(sessionid: string) {
  const sess = sessions.get(sessionid)
  if (!sess) {
    return
  }
  sess.port.removeEventListener('message', sess.onportmessage)
  try {
    sess.port.close()
  } catch {
    // ignore
  }
  sessions.delete(sessionid)
  postwanixiframeapilog(`wanix bridge: session ${sessionid} closed`)
}

function clearsessions() {
  for (const id of [...sessions.keys()]) {
    closesession(id)
  }
}


export function readwanixbridgeactive(): boolean {
  return hostws !== null && hostws.readyState === WebSocket.OPEN
}

export function readwanixbridgeurl(): string {
  return hosturl
}

export function readwanixbridgesessioncount(): number {
  return sessions.size
}

export function parsewanixbridgehosturl(raw: string): URL {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('wanix bridge: url required')
  }
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('wanix bridge: invalid url')
  }
  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    throw new Error('wanix bridge: url must start with ws:// or wss://')
  }
  if (!parsed.searchParams.get('token')) {
    throw new Error('wanix bridge: url must include ?token=')
  }
  return parsed
}

export async function startwanixbridgehost(url: string): Promise<void> {
  if (readwanixbridgeactive()) {
    throw new Error('wanix bridge: already running')
  }
  const parsed = parsewanixbridgehosturl(url)
  await waitsystemelement()
  hosturl = parsed.toString()
  const ws = new WebSocket(hosturl)
  ws.binaryType = 'arraybuffer'
  hostws = ws

  await new Promise<void>((resolve, reject) => {
    const onopen = () => {
      ws.removeEventListener('error', onerror)
      resolve()
    }
    const onerror = () => {
      ws.removeEventListener('open', onopen)
      reject(new Error('wanix bridge: host websocket failed'))
    }
    ws.addEventListener('open', onopen, { once: true })
    ws.addEventListener('error', onerror, { once: true })
  })

  onwsmessage = (event) => {
    const { data } = event
    if (typeof data === 'string') {
      const msg = parsesessioncontrol(data)
      if (!msg) {
        return
      }
      if (msg.type === 'new-session') {
        opensession(msg.id)
        return
      }
      if (msg.type === 'close-session') {
        closesession(msg.id)
      }
      return
    }
    void readwsbytes(data as ArrayBuffer).then((buf) => {
      try {
        const { sessionid, payload } = decodemuxframe(buf)
        const sess = sessions.get(sessionid)
        if (!sess) {
          return
        }
        const copy = payload.slice()
        sess.port.postMessage(copy, [copy.buffer])
      } catch (err) {
        postwanixiframeapilog(
          `wanix bridge: mux decode error — ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      }
    })
  }
  onwsclose = () => {
    if (!hostws) {
      return
    }
    postwanixiframeapilog('wanix bridge: host websocket closed')
    stopwanixbridgehost()
  }
  onwserror = () => {
    postwanixiframeapilog('wanix bridge: host websocket error')
  }
  ws.addEventListener('message', onwsmessage)
  ws.addEventListener('close', onwsclose)
  ws.addEventListener('error', onwserror)
  postwanixiframeapilog(`wanix bridge: host connected (${hosturl})`)
}

export function stopwanixbridgehost() {
  clearsessions()
  const ws = hostws
  hostws = null
  hosturl = ''
  if (!ws) {
    return
  }
  if (onwsmessage) {
    ws.removeEventListener('message', onwsmessage)
  }
  if (onwsclose) {
    ws.removeEventListener('close', onwsclose)
  }
  if (onwserror) {
    ws.removeEventListener('error', onwserror)
  }
  onwsmessage = null
  onwsclose = null
  onwserror = null
  try {
    ws.close()
  } catch {
    // ignore
  }
}

export function readwanixbridgeimporturl(hosturl: string): string {
  const parsed = new URL(hosturl)
  if (parsed.pathname.replace(/\/$/, '') === WANIX_BRIDGE_PROXY_PATH) {
    const token = parsed.searchParams.get('token')
    if (!token) {
      throw new Error('wanix bridge: host url missing ?token=')
    }
    return readwanixbridgeproxyimporturl(token)
  }
  parsed.pathname = '/'
  return parsed.toString()
}
