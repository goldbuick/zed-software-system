import { IvsLowLatencyTransport } from 'zss/feature/broadcast/ivslowlatencytransport'
import { WebBroadcastCompositor } from 'zss/feature/broadcast/webbroadcastcompositor'
import {
  DEFAULT_IVS_WHIP_ENDPOINT,
  DEFAULT_STREAM_CONFIG,
} from 'zss/feature/broadcast/webbroadcastconstants'
import type {
  BroadcastClientEvents,
  BroadcastEventHandler,
  BroadcastStartPayload,
  CanvasDimensions,
  ConnectionState,
  StreamConfig,
  VideoComposition,
  WebBroadcastStatsReader,
} from 'zss/feature/broadcast/webbroadcasttypes'
import { resolvewhipendpoint } from 'zss/feature/broadcast/webbroadcastwhipaliases'
import { WhipTransport } from 'zss/feature/broadcast/whiptransport'

export type WebBroadcastClientConfig = {
  streamConfig?: StreamConfig
}

function towhipstart(payload: BroadcastStartPayload): {
  endpoint: string
  bearer: string
} {
  if (payload.kind === 'whip') {
    return { endpoint: payload.endpoint, bearer: payload.bearer }
  }
  if (payload.kind === 'ivs-whip') {
    return {
      endpoint: payload.endpoint ?? DEFAULT_IVS_WHIP_ENDPOINT,
      bearer: payload.token,
    }
  }
  throw new Error('towhipstart expects whip or ivs-whip payload')
}

export class WebBroadcastClient implements WebBroadcastStatsReader {
  private readonly streamconfig: StreamConfig
  private readonly compositor: WebBroadcastCompositor
  private readonly lowlatency = new IvsLowLatencyTransport()
  private readonly whip = new WhipTransport()
  private readonly handlers = new Map<
    BroadcastClientEvents,
    Set<BroadcastEventHandler>
  >()
  private active = false
  private started = false
  private activetransport: 'low-latency' | 'whip' | undefined

  constructor(config: WebBroadcastClientConfig = {}) {
    this.streamconfig = config.streamConfig ?? DEFAULT_STREAM_CONFIG
    this.compositor = new WebBroadcastCompositor(this.streamconfig)
    this.wiretransports()
  }

  private wiretransports() {
    const emitconnection = (state: ConnectionState) => {
      this.emit('connectionstatechange', state)
    }
    const emiterror = (message: string) => {
      this.active = false
      this.emit('error', message)
    }
    this.lowlatency.sethandlers({
      onconnectionstatechange: emitconnection,
      onerror: emiterror,
    })
    this.whip.sethandlers({
      onconnectionstatechange: emitconnection,
      onerror: emiterror,
    })
  }

  on(event: BroadcastClientEvents, handler: BroadcastEventHandler) {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler)
  }

  off(event: BroadcastClientEvents, handler: BroadcastEventHandler) {
    this.handlers.get(event)?.delete(handler)
  }

  private emit(event: BroadcastClientEvents, ...args: unknown[]) {
    const set = this.handlers.get(event)
    if (!set) {
      return
    }
    for (const handler of set) {
      handler(...args)
    }
  }

  addimagesource(
    image: CanvasImageSource & { width: number; height: number },
    name: string,
    position: VideoComposition,
  ) {
    this.compositor.addimagesource(image, name, position)
  }

  async addaudioinputdevice(device: MediaStream, name: string) {
    await this.compositor.addaudioinputdevice(device, name)
  }

  private collecttracks(): MediaStreamTrack[] {
    const tracks: MediaStreamTrack[] = []
    const video = this.compositor.getvideotrack()
    const audio = this.compositor.getaudiotrack()
    if (video) {
      tracks.push(video)
    }
    if (audio) {
      tracks.push(audio)
    }
    return tracks
  }

  async start(payload: BroadcastStartPayload) {
    if (this.started) {
      throw new Error('web broadcast client: stream is already started')
    }
    await this.compositor.unlockaudio()
    this.compositor.start()
    const tracks = this.collecttracks()
    if (!tracks.length) {
      throw new Error('web broadcast client: no media tracks attached')
    }

    if (payload.kind === 'ivs-low-latency') {
      await this.lowlatency.start(
        {
          streamKey: payload.streamKey,
          ingestEndpoint: payload.ingestEndpoint,
        },
        this.streamconfig,
        tracks,
      )
      this.activetransport = 'low-latency'
    } else {
      await this.whip.start(towhipstart(payload), tracks)
      this.activetransport = 'whip'
    }

    this.started = true
    this.active = true
    this.emit('activestatechange', true)
  }

  stop() {
    if (this.activetransport === 'whip') {
      void this.whip.stop()
    } else {
      this.lowlatency.stop()
    }
    this.compositor.stop()
    this.started = false
    this.active = false
    this.activetransport = undefined
    this.emit('activestatechange', false)
  }

  delete() {
    this.stop()
    this.compositor.delete()
    this.handlers.clear()
  }

  getconnectionstate(): ConnectionState {
    if (this.activetransport === 'whip') {
      return this.whip.getconnectionstate()
    }
    if (this.activetransport === 'low-latency') {
      return this.lowlatency.getconnectionstate()
    }
    return 'none'
  }

  getsessionid(): string | undefined {
    if (this.activetransport === 'whip') {
      return this.whip.getsessionid()
    }
    if (this.activetransport === 'low-latency') {
      return this.lowlatency.getsessionid()
    }
    return undefined
  }

  getcanvasdimensions(): CanvasDimensions {
    return this.compositor.getcanvasdimensions()
  }

  async getstats(): Promise<RTCStatsReport | undefined> {
    const pc =
      this.activetransport === 'whip'
        ? this.whip.getpeerconnection()
        : this.lowlatency.getpeerconnection()
    if (!pc) {
      return undefined
    }
    return pc.getStats()
  }

  isactive(): boolean {
    return this.active
  }
}

export function createwebbroadcastclient(
  config: WebBroadcastClientConfig = {},
): WebBroadcastClient {
  return new WebBroadcastClient(config)
}

export function parsebroadcaststartpayload(
  data: unknown,
): BroadcastStartPayload | undefined {
  if (typeof data === 'string' && data.length > 0) {
    return { kind: 'ivs-low-latency', streamKey: data }
  }
  if (!data || typeof data !== 'object') {
    return undefined
  }
  const record = data as Record<string, unknown>
  if (
    record.kind === 'ivs-low-latency' &&
    typeof record.streamKey === 'string'
  ) {
    return {
      kind: 'ivs-low-latency',
      streamKey: record.streamKey,
      ingestEndpoint:
        typeof record.ingestEndpoint === 'string'
          ? record.ingestEndpoint
          : undefined,
    }
  }
  if (
    record.kind === 'whip' &&
    typeof record.endpoint === 'string' &&
    typeof record.bearer === 'string'
  ) {
    const endpoint = resolvewhipendpoint(record.endpoint)
    if (!endpoint) {
      return undefined
    }
    return {
      kind: 'whip',
      endpoint,
      bearer: record.bearer,
    }
  }
  if (record.kind === 'ivs-whip' && typeof record.token === 'string') {
    return {
      kind: 'ivs-whip',
      token: record.token,
      endpoint:
        typeof record.endpoint === 'string' ? record.endpoint : undefined,
    }
  }
  return undefined
}
