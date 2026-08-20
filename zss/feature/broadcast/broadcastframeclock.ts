/**
 * Visibility-independent frame clock for live broadcast.
 * Driven by an AudioWorklet on the compositor AudioContext (audio render
 * thread is not throttled when the page is hidden).
 */

export type BroadcastFrameStage = (now: number) => void

const WORKLET_NAME = 'zss-broadcast-frameclock'

const WORKLET_SOURCE = `
class BroadcastFrameClockProcessor extends AudioWorkletProcessor {
  process() {
    this.port.postMessage(1)
    return true
  }
}
registerProcessor('${WORKLET_NAME}', BroadcastFrameClockProcessor)
`

export class BroadcastFrameClock {
  private onrender: BroadcastFrameStage | undefined
  private oncapture: BroadcastFrameStage | undefined
  private running = false
  private maxframerate = 60
  private nextframe = 0
  private workletnode: AudioWorkletNode | undefined
  private keepalive: ConstantSourceNode | undefined
  private silent: GainNode | undefined
  private moduleurl: string | undefined
  private moduleloaded = false

  setonrender(stage: BroadcastFrameStage | undefined) {
    this.onrender = stage
  }

  setoncapture(stage: BroadcastFrameStage | undefined) {
    this.oncapture = stage
  }

  async start(ctx: AudioContext, maxframerate: number) {
    if (this.running) {
      return
    }
    if (typeof AudioWorkletNode === 'undefined') {
      throw new Error('broadcast frame clock: AudioWorkletNode unavailable')
    }
    this.maxframerate = Math.max(1, maxframerate)
    this.nextframe = performance.now()
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    if (!this.moduleloaded) {
      const blob = new Blob([WORKLET_SOURCE], {
        type: 'application/javascript',
      })
      this.moduleurl = URL.createObjectURL(blob)
      await ctx.audioWorklet.addModule(this.moduleurl)
      this.moduleloaded = true
    }
    const node = new AudioWorkletNode(ctx, WORKLET_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    })
    node.port.onmessage = () => {
      this.ontick()
    }
    const silent = ctx.createGain()
    silent.gain.value = 0
    const keepalive = ctx.createConstantSource()
    keepalive.offset.value = 0
    keepalive.connect(node)
    node.connect(silent)
    silent.connect(ctx.destination)
    keepalive.start()
    this.workletnode = node
    this.silent = silent
    this.keepalive = keepalive
    this.running = true
  }

  stop() {
    if (!this.running) {
      return
    }
    this.running = false
    if (this.keepalive) {
      try {
        this.keepalive.stop()
      } catch {
        /* ignore */
      }
      this.keepalive.disconnect()
      this.keepalive = undefined
    }
    this.workletnode?.disconnect()
    this.workletnode = undefined
    this.silent?.disconnect()
    this.silent = undefined
  }

  delete() {
    this.stop()
    this.onrender = undefined
    this.oncapture = undefined
    if (this.moduleurl) {
      URL.revokeObjectURL(this.moduleurl)
      this.moduleurl = undefined
    }
    this.moduleloaded = false
  }

  private ontick() {
    if (!this.running) {
      return
    }
    const now = performance.now()
    if (now < this.nextframe) {
      return
    }
    const interval = 1000 / this.maxframerate
    while (this.nextframe <= now) {
      this.nextframe += interval
    }
    this.onrender?.(now)
    this.oncapture?.(now)
  }
}
