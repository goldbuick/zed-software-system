export type ResolutionConfig = {
  width: number
  height: number
}

export type StreamConfig = {
  maxResolution: ResolutionConfig
  maxFramerate: number
  maxBitrate: number
}

export type VideoComposition = {
  index: number
  x?: number
  y?: number
  width?: number
  height?: number
}

export type CanvasDimensions = {
  width: number
  height: number
}

export type ConnectionState =
  | 'none'
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'closed'
  | 'failed'

export type BroadcastStartPayload =
  | {
      kind: 'ivs-low-latency'
      streamKey: string
      ingestEndpoint?: string
    }
  | {
      kind: 'whip'
      endpoint: string
      bearer: string
    }
  | {
      kind: 'ivs-whip'
      token: string
      endpoint?: string
    }

export type BroadcastClientEvents =
  | 'connectionstatechange'
  | 'activestatechange'
  | 'error'

export type BroadcastEventHandler = (...args: unknown[]) => void

export type DrawRegion = {
  x: number
  y: number
  width: number
  height: number
}

export type WebBroadcastStatsReader = {
  getconnectionstate: () => ConnectionState
  getsessionid: () => string | undefined
  getcanvasdimensions: () => CanvasDimensions
  getstats: () => Promise<RTCStatsReport | undefined>
}
