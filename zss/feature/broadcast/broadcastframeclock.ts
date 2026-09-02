/**
 * Visibility-independent frame clock for live broadcast.
 * Driven by a worker timer: worker timers are exempt from the one-tick-per-second
 * clamp Chrome applies to hidden pages, and rAF is suspended for hidden pages
 * regardless of audibility. The framerate gate lives inside the worker so only
 * on-schedule frames cross to the main thread.
 */

import { broadcasthiddendiagmarkclocktick } from 'zss/feature/broadcast/broadcasthiddendiag'

export type BroadcastFrameStage = (now: number) => void

const WORKER_SOURCE = `
let interval = 0
let nextframe = 0
let timer = 0

function tick() {
  const now = Date.now()
  if (now < nextframe) {
    return
  }
  nextframe = (nextframe < now ? now : nextframe) + interval
  postMessage(1)
}

self.onmessage = function (event) {
  if (timer !== 0) {
    return
  }
  interval = 1000 / event.data
  nextframe = Date.now()
  timer = setInterval(tick, Math.max(1, Math.round(interval / 4)))
}
`

export class BroadcastFrameClock {
  private onrender: BroadcastFrameStage | undefined
  private oncapture: BroadcastFrameStage | undefined
  private running = false
  private worker: Worker | undefined
  private workerurl: string | undefined

  setonrender(stage: BroadcastFrameStage | undefined) {
    this.onrender = stage
  }

  setoncapture(stage: BroadcastFrameStage | undefined) {
    this.oncapture = stage
  }

  start(maxframerate: number) {
    if (this.running) {
      return
    }
    if (typeof Worker === 'undefined') {
      throw new Error('broadcast frame clock: Worker unavailable')
    }
    const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' })
    this.workerurl = URL.createObjectURL(blob)
    const worker = new Worker(this.workerurl)
    worker.onmessage = () => {
      this.ontick()
    }
    worker.postMessage(Math.max(1, maxframerate))
    this.worker = worker
    this.running = true
  }

  stop() {
    if (!this.running) {
      return
    }
    this.running = false
    this.worker?.terminate()
    this.worker = undefined
    if (this.workerurl) {
      URL.revokeObjectURL(this.workerurl)
      this.workerurl = undefined
    }
  }

  delete() {
    this.stop()
    this.onrender = undefined
    this.oncapture = undefined
  }

  private ontick() {
    if (!this.running) {
      return
    }
    broadcasthiddendiagmarkclocktick()
    const now = performance.now()
    this.onrender?.(now)
    this.oncapture?.(now)
  }
}
