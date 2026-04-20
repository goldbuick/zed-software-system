import type { AmazonIVSBroadcastClient } from 'amazon-ivs-web-broadcast'

export type IvsBroadcastClientRef = AmazonIVSBroadcastClient

let client: IvsBroadcastClientRef | undefined

/** Latest pick from SDK wire stats (getStats / getConnectionStats). */
type WirePick = {
  bytesSent?: number
  fps?: number
  frameW?: number
  frameH?: number
  packetsLost?: number
}

let wirePick: WirePick = {}
let lastVideoKbps: number | undefined
let prevBytesSent = 0
let prevBytesPollMs = 0
let statsInflight = false
let lastKickMs = 0

const KICK_INTERVAL_MS = 450

export function setIvsBroadcastClient(c: IvsBroadcastClientRef | undefined) {
  client = c
}

export function clearIvsBroadcastClient() {
  client = undefined
  wirePick = {}
  lastVideoKbps = undefined
  prevBytesSent = 0
  prevBytesPollMs = 0
  statsInflight = false
  lastKickMs = 0
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

function shallowPickWireStats(obj: unknown): WirePick {
  const out: WirePick = {}
  if (!obj || typeof obj !== 'object') {
    return out
  }
  const walk = (o: Record<string, unknown>, depth: number) => {
    if (depth <= 0) {
      return
    }
    for (const [k, v] of Object.entries(o)) {
      if (k === 'bytesSent' && typeof v === 'number') {
        out.bytesSent = v
      }
      if (k === 'framesPerSecond' && typeof v === 'number') {
        out.fps = v
      }
      if (k === 'frameWidth' && typeof v === 'number') {
        out.frameW = v
      }
      if (k === 'frameHeight' && typeof v === 'number') {
        out.frameH = v
      }
      if (k === 'packetsLost' && typeof v === 'number') {
        out.packetsLost = v
      }
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        walk(v as Record<string, unknown>, depth - 1)
      }
    }
  }
  walk(obj as Record<string, unknown>, 6)
  return out
}

function updateKbpsFromBytes(bytesSent: number) {
  const now = performance.now()
  if (prevBytesPollMs > 0) {
    const dt = (now - prevBytesPollMs) / 1000
    if (dt > 0.04 && bytesSent >= prevBytesSent) {
      lastVideoKbps = ((bytesSent - prevBytesSent) * 8) / 1000 / dt
    }
  }
  prevBytesSent = bytesSent
  prevBytesPollMs = now
}

/**
 * Fire-and-forget poll of IVS client stats (not in public .d.ts for 1.33, but
 * present at runtime). Call from the perf overlay tick; internally throttled.
 */
export function kickIvsBroadcastStatsPoll() {
  const c = client
  if (!c || statsInflight) {
    return
  }
  const now = performance.now()
  if (now - lastKickMs < KICK_INTERVAL_MS) {
    return
  }
  lastKickMs = now

  const anyc = c as unknown as {
    getStats?: () => unknown | Promise<unknown>
    getConnectionStats?: () => unknown | Promise<unknown>
  }
  const fn =
    typeof anyc.getStats === 'function'
      ? anyc.getStats
      : typeof anyc.getConnectionStats === 'function'
        ? anyc.getConnectionStats
        : undefined
  if (!fn) {
    return
  }

  statsInflight = true
  Promise.resolve(fn.call(anyc))
    .then((raw) => {
      const picked = shallowPickWireStats(raw)
      wirePick = picked
      if (picked.bytesSent != null) {
        updateKbpsFromBytes(picked.bytesSent)
      }
    })
    .catch(() => {
      /* ignore */
    })
    .finally(() => {
      statsInflight = false
    })
}

export function readIvsBroadcastStatsSnapshot(): IvsBroadcastStatsSnapshot | null {
  if (!client) {
    return null
  }
  try {
    const connectionState = String(client.getConnectionState())
    const sessionId = client.getSessionId()
    const dims = client.getCanvasDimensions()
    return {
      connectionState,
      sessionId,
      canvasW: dims?.width,
      canvasH: dims?.height,
      videoKbps: lastVideoKbps,
      fps: wirePick.fps,
      frameW: wirePick.frameW,
      frameH: wirePick.frameH,
      packetsLost: wirePick.packetsLost,
    }
  } catch {
    return {
      connectionState: 'error',
      detail: 'read failed',
    }
  }
}
