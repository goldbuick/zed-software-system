import { BroadcastFrameClock } from 'zss/feature/broadcast/broadcastframeclock'
import type { BroadcastFrameStage } from 'zss/feature/broadcast/broadcastframeclock'
import {
  broadcasthiddendiagmarkraf,
  broadcasthiddendiagmarkrequestframe,
  broadcasthiddendiagstart,
  broadcasthiddendiagstop,
} from 'zss/feature/broadcast/broadcasthiddendiag'
import { computedrawregion } from 'zss/feature/broadcast/webbroadcastdraw'
import type {
  CanvasDimensions,
  StreamConfig,
  VideoComposition,
} from 'zss/feature/broadcast/webbroadcasttypes'

type VideoLayer = {
  name: string
  element: CanvasImageSource & { width: number; height: number }
  position: VideoComposition
  render: boolean
}

type AudioLayer = {
  name: string
  source: MediaStream
  audiotracksource: MediaStreamAudioSourceNode
  gainnode: GainNode
}

export class WebBroadcastCompositor {
  private readonly streamconfig: StreamConfig
  private readonly compositeel: HTMLCanvasElement
  private readonly compositecontext: CanvasRenderingContext2D
  private readonly compositestream: MediaStream
  private readonly audiocontext: AudioContext
  private readonly audiodestination: MediaStreamAudioDestinationNode
  private readonly videolayers: VideoLayer[] = []
  private readonly audiolayers: AudioLayer[] = []
  private readonly frameclock = new BroadcastFrameClock()
  private running = false

  constructor(streamconfig: StreamConfig) {
    this.streamconfig = streamconfig
    this.compositeel = document.createElement('canvas')
    this.compositeel.width = streamconfig.maxResolution.width
    this.compositeel.height = streamconfig.maxResolution.height
    const ctx = this.compositeel.getContext('2d')
    if (!ctx) {
      throw new Error('web broadcast compositor: failed to get 2d context')
    }
    this.compositecontext = ctx

    const framerate =
      typeof CanvasCaptureMediaStreamTrack !== 'undefined'
        ? 0
        : streamconfig.maxFramerate
    this.compositestream = this.compositeel.captureStream(framerate)

    this.audiocontext = new AudioContext()
    this.audiodestination = this.audiocontext.createMediaStreamDestination()
    this.setupsilence()
    this.frameclock.setoncapture(() => {
      broadcasthiddendiagmarkraf()
      this.drawcomposite()
    })
  }

  private setupsilence() {
    const source = this.audiocontext.createConstantSource()
    const gain = this.audiocontext.createGain()
    gain.gain.value = 0
    source.connect(gain)
    gain.connect(this.audiodestination)
    source.start()
  }

  async unlockaudio() {
    if (this.audiocontext.state === 'suspended') {
      await this.audiocontext.resume()
    }
  }

  setonrender(stage: BroadcastFrameStage | undefined) {
    this.frameclock.setonrender(stage)
  }

  async start() {
    if (this.running) {
      return
    }
    this.running = true
    void broadcasthiddendiagstart(this.audiocontext)
    await this.frameclock.start(
      this.audiocontext,
      this.streamconfig.maxFramerate,
    )
  }

  stop() {
    this.running = false
    broadcasthiddendiagstop()
    this.frameclock.stop()
  }

  delete() {
    this.stop()
    this.frameclock.delete()
    for (const layer of this.audiolayers) {
      layer.audiotracksource.disconnect()
      layer.gainnode.disconnect()
    }
    this.audiolayers.length = 0
    this.videolayers.length = 0
    void this.audiocontext.close()
  }

  getcanvasdimensions(): CanvasDimensions {
    return {
      width: this.compositeel.width,
      height: this.compositeel.height,
    }
  }

  getvideotrack(): MediaStreamTrack | undefined {
    return this.compositestream.getVideoTracks()[0]
  }

  getaudiotrack(): MediaStreamTrack | undefined {
    return this.audiodestination.stream.getAudioTracks()[0]
  }

  addimagesource(
    image: CanvasImageSource & { width: number; height: number },
    name: string,
    position: VideoComposition,
  ) {
    if (this.videolayers.some((layer) => layer.name === name)) {
      throw new Error(
        `web broadcast compositor: video name already registered: ${name}`,
      )
    }
    if (typeof position.index !== 'number') {
      throw new Error(
        'web broadcast compositor: video composition index is required',
      )
    }
    this.videolayers.push({
      name,
      element: image,
      position,
      render: true,
    })
  }

  async addaudioinputdevice(device: MediaStream, name: string) {
    if (this.audiolayers.some((layer) => layer.name === name)) {
      throw new Error(
        `web broadcast compositor: audio name already registered: ${name}`,
      )
    }
    const tracks = device.getAudioTracks()
    if (!tracks.length) {
      throw new Error('web broadcast compositor: audio input has no tracks')
    }
    await this.unlockaudio()
    const audiotracksource = this.audiocontext.createMediaStreamSource(
      new MediaStream(tracks),
    )
    const gainnode = this.audiocontext.createGain()
    gainnode.gain.value = 1
    audiotracksource.connect(gainnode)
    gainnode.connect(this.audiodestination)
    this.audiolayers.push({
      name,
      source: device,
      audiotracksource,
      gainnode,
    })
  }

  hasaudioinputdevice(name: string): boolean {
    return this.audiolayers.some((layer) => layer.name === name)
  }

  removeaudioinputdevice(name: string) {
    const index = this.audiolayers.findIndex((layer) => layer.name === name)
    if (index < 0) {
      return
    }
    const layer = this.audiolayers[index]
    layer.audiotracksource.disconnect()
    layer.gainnode.disconnect()
    this.audiolayers.splice(index, 1)
  }

  setaudioinputgain(name: string, gain: number) {
    const layer = this.audiolayers.find((entry) => entry.name === name)
    if (!layer) {
      return
    }
    layer.gainnode.gain.value = Math.max(0, Math.min(1, gain))
  }

  private drawcomposite() {
    const { width, height } = this.compositeel
    this.compositecontext.clearRect(0, 0, width, height)
    this.compositecontext.fillStyle = '#000000'
    this.compositecontext.fillRect(0, 0, width, height)

    const layers = [...this.videolayers]
      .filter((layer) => layer.render)
      .sort((a, b) => a.position.index - b.position.index)

    for (const layer of layers) {
      const element = layer.element
      let sourcewidth = element.width
      let sourceheight = element.height
      if (element instanceof HTMLVideoElement) {
        sourcewidth = element.videoWidth
        sourceheight = element.videoHeight
      }
      const region = computedrawregion(layer.position, width, height, {
        width: sourcewidth,
        height: sourceheight,
      })
      this.compositecontext.drawImage(
        element,
        region.x,
        region.y,
        region.width,
        region.height,
      )
    }

    this.requestframecapture()
  }

  private requestframecapture() {
    if (typeof CanvasCaptureMediaStreamTrack === 'undefined') {
      return
    }
    const stream = this.compositestream as MediaStream & {
      requestFrame?: () => void
    }
    if (typeof stream.requestFrame === 'function') {
      stream.requestFrame()
      broadcasthiddendiagmarkrequestframe()
      return
    }
    const track = this.getvideotrack()
    if (
      track &&
      'requestFrame' in track &&
      typeof track.requestFrame === 'function'
    ) {
      track.requestFrame()
      broadcasthiddendiagmarkrequestframe()
    }
  }
}
