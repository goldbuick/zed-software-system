import type { WebBroadcastStatsReader } from 'zss/feature/broadcast/webbroadcasttypes'

export type IvsBroadcastClientRef = WebBroadcastStatsReader

let client: IvsBroadcastClientRef | undefined

/** Latest pick from WebRTC stats poll. */
type WirePick = {
  bytesSent?: number
  fps?: number
  frameW?: number
  frameH?: number
  packetsLost?: number
}

let wirepick: WirePick = {}
let lastvideokbps: number | undefined
let prevbytessent = 0
let prevbytespollms = 0
let statsinflight = false
let lastms = 0

const POLL_INTERVAL_MS = 450

export function setIvsBroadcastClient(c: IvsBroadcastClientRef | undefined) {
  client = c
}

export function clearIvsBroadcastClient() {
  client = undefined
  wirepick = {}
  lastvideokbps = undefined
  prevbytessent = 0
  prevbytespollms = 0
  statsinflight = false
  lastms = 0
}

export type IvsBroadcastStatsSnapshot = {
  connectionState: string
  sessionId?: string
  canvasW?: number
  canvasH?: number
  videoKbps?: number
  fps?: number
  frameW?: number
  frameH?: number
  packetsLost?: number
  detail?: string
}

function shallowpickwirestats(report: RTCStatsReport): WirePick {
  const out: WirePick = {}
  report.forEach((entry) => {
    const record = entry as unknown as Record<string, unknown>
    if (typeof record.bytesSent === 'number') {
      out.bytesSent = record.bytesSent
    }
    if (typeof record.framesPerSecond === 'number') {
      out.fps = record.framesPerSecond
    }
    if (typeof record.frameWidth === 'number') {
      out.frameW = record.frameWidth
    }
    if (typeof record.frameHeight === 'number') {
      out.frameH = record.frameHeight
    }
    if (typeof record.packetsLost === 'number') {
      out.packetsLost = record.packetsLost
    }
  })
  return out
}

function updatekbpsfrombytes(bytestsent: number) {
  const now = performance.now()
  if (prevbytespollms > 0) {
    const dt = (now - prevbytespollms) / 1000
    if (dt > 0.04 && bytestsent >= prevbytessent) {
      lastvideokbps = ((bytestsent - prevbytessent) * 8) / 1000 / dt
    }
  }
  prevbytessent = bytestsent
  prevbytespollms = now
}

/** Fire-and-forget poll of broadcast client stats. Internally throttled. */
export function ivsBroadcastStatsPoll() {
  const c = client
  if (!c || statsinflight) {
    return
  }
  const now = performance.now()
  if (now - lastms < POLL_INTERVAL_MS) {
    return
  }
  lastms = now

  statsinflight = true
  Promise.resolve(c.getstats())
    .then((report) => {
      if (!report) {
        return
      }
      const picked = shallowpickwirestats(report)
      wirepick = picked
      if (picked.bytesSent != null) {
        updatekbpsfrombytes(picked.bytesSent)
      }
    })
    .catch(() => {
      /* ignore */
    })
    .finally(() => {
      statsinflight = false
    })
}

export function readIvsBroadcastStatsSnapshot(): IvsBroadcastStatsSnapshot | null {
  if (!client) {
    return null
  }
  try {
    const connectionstate = String(client.getconnectionstate())
    const sessionid = client.getsessionid()
    const dims = client.getcanvasdimensions()
    return {
      connectionState: connectionstate,
      sessionId: sessionid,
      canvasW: dims?.width,
      canvasH: dims?.height,
      videoKbps: lastvideokbps,
      fps: wirepick.fps,
      frameW: wirepick.frameW,
      frameH: wirepick.frameH,
      packetsLost: wirepick.packetsLost,
    }
  } catch {
    return {
      connectionState: 'error',
      detail: 'read failed',
    }
  }
}
