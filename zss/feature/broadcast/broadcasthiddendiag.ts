/**
 * Dev-only probe for broadcast video stall when the page is hidden.
 * Logs once per second while a stream is active. No product behavior change.
 */
import {
  ivsBroadcastStatsPoll,
  readIvsBroadcastStatsSnapshot,
} from 'zss/perf/ivsbroadcaststats'
import { isperfdevbuild, readtickstats } from 'zss/perf/ticktimingstats'

const LOG_INTERVAL_MS = 1000
const WORKLET_NAME = 'zss-broadcast-diag-probe'

const WORKLET_SOURCE = `
class BroadcastDiagProbe extends AudioWorkletProcessor {
  process() {
    this.port.postMessage(1)
    return true
  }
}
registerProcessor('${WORKLET_NAME}', BroadcastDiagProbe)
`

const WORKER_SOURCE = `setInterval(function () { postMessage(1) }, 16)`

let running = false
let logtimer: ReturnType<typeof setInterval> | undefined
let rafcount = 0
let requestframecount = 0
let workletticks = 0
let workerticks = 0
let prevframessent = 0
let prevframesencoded = 0
let prevtickboardscalls = 0
let workletnode: AudioWorkletNode | undefined
let workletkeepalive: ConstantSourceNode | undefined
let workletsilent: GainNode | undefined
let workleturl: string | undefined
let worker: Worker | undefined
let workerurl: string | undefined

export function broadcasthiddendiagmarkraf() {
  if (!running) {
    return
  }
  ++rafcount
}

export function broadcasthiddendiagmarkrequestframe() {
  if (!running) {
    return
  }
  ++requestframecount
}

async function startworkletprobe(ctx: AudioContext) {
  if (typeof AudioWorkletNode === 'undefined') {
    return
  }
  const blob = new Blob([WORKLET_SOURCE], { type: 'application/javascript' })
  workleturl = URL.createObjectURL(blob)
  try {
    await ctx.audioWorklet.addModule(workleturl)
  } catch {
    // Probe must not break broadcast if worklet load fails.
    return
  }
  const node = new AudioWorkletNode(ctx, WORKLET_NAME, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
  })
  node.port.onmessage = () => {
    ++workletticks
  }
  const silent = ctx.createGain()
  silent.gain.value = 0
  const keepalive = ctx.createConstantSource()
  keepalive.offset.value = 0
  keepalive.connect(node)
  node.connect(silent)
  silent.connect(ctx.destination)
  keepalive.start()
  workletnode = node
  workletsilent = silent
  workletkeepalive = keepalive
}

function startworkerprobe() {
  if (typeof Worker === 'undefined') {
    return
  }
  const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' })
  workerurl = URL.createObjectURL(blob)
  try {
    worker = new Worker(workerurl)
  } catch {
    return
  }
  worker.onmessage = () => {
    ++workerticks
  }
}

function tickboardsdelta(): number {
  const boards = readtickstats().stages['tick:boards']
  const calls = boards?.calls ?? 0
  const delta = Math.max(0, calls - prevtickboardscalls)
  prevtickboardscalls = calls
  return delta
}

function wireframedeltas(): {
  framessentdelta: number
  framesencodeddelta: number
  videokbps: number | undefined
} {
  ivsBroadcastStatsPoll()
  const snap = readIvsBroadcastStatsSnapshot()
  const framessent = snap?.framesSent ?? 0
  const framesencoded = snap?.framesEncoded ?? 0
  const framessentdelta = Math.max(0, framessent - prevframessent)
  const framesencodeddelta = Math.max(0, framesencoded - prevframesencoded)
  prevframessent = framessent
  prevframesencoded = framesencoded
  return {
    framessentdelta,
    framesencodeddelta,
    videokbps: snap?.videoKbps,
  }
}

function emitlog() {
  const visibility =
    typeof document !== 'undefined' ? document.visibilityState : 'unknown'
  const hidden =
    typeof document !== 'undefined' ? String(document.hidden) : 'unknown'
  const raf = rafcount
  const reqframe = requestframecount
  const worklet = workletticks
  const workertick = workerticks
  rafcount = 0
  requestframecount = 0
  workletticks = 0
  workerticks = 0
  const wire = wireframedeltas()
  const tickboards = tickboardsdelta()
  const kbps = wire.videokbps != null ? wire.videokbps.toFixed(1) : 'n/a'
  // eslint-disable-next-line no-console -- dev-only broadcast visibility diagnosis
  console.log(
    `[zss broadcast diag] visibility=${visibility} hidden=${hidden}` +
      ` raf/s=${raf} reqFrame/s=${reqframe}` +
      ` worklet/s=${worklet} worker/s=${workertick}` +
      ` framesSentDelta=${wire.framessentdelta}` +
      ` framesEncodedDelta=${wire.framesencodeddelta}` +
      ` tickBoardsCallsDelta=${tickboards}` +
      ` videoKbps=${kbps}`,
  )
}

export async function broadcasthiddendiagstart(ctx: AudioContext) {
  if (!isperfdevbuild() || running) {
    return
  }
  running = true
  rafcount = 0
  requestframecount = 0
  workletticks = 0
  workerticks = 0
  prevframessent = 0
  prevframesencoded = 0
  prevtickboardscalls = readtickstats().stages['tick:boards']?.calls ?? 0
  await startworkletprobe(ctx)
  startworkerprobe()
  logtimer = setInterval(emitlog, LOG_INTERVAL_MS)
  // eslint-disable-next-line no-console -- dev-only broadcast visibility diagnosis
  console.log('[zss broadcast diag] started (once-per-second while streaming)')
}

export function broadcasthiddendiagstop() {
  if (!running) {
    return
  }
  running = false
  if (logtimer != null) {
    clearInterval(logtimer)
    logtimer = undefined
  }
  if (workletkeepalive) {
    try {
      workletkeepalive.stop()
    } catch {
      /* ignore */
    }
    workletkeepalive.disconnect()
    workletkeepalive = undefined
  }
  workletnode?.disconnect()
  workletnode = undefined
  workletsilent?.disconnect()
  workletsilent = undefined
  if (workleturl) {
    URL.revokeObjectURL(workleturl)
    workleturl = undefined
  }
  if (worker) {
    worker.terminate()
    worker = undefined
  }
  if (workerurl) {
    URL.revokeObjectURL(workerurl)
    workerurl = undefined
  }
  // eslint-disable-next-line no-console -- dev-only broadcast visibility diagnosis
  console.log('[zss broadcast diag] stopped')
}
