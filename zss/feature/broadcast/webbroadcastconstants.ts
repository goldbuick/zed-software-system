import type { StreamConfig } from 'zss/feature/broadcast/webbroadcasttypes'

export const DEFAULT_STREAM_CONFIG: StreamConfig = {
  maxResolution: { width: 1280, height: 720 },
  maxFramerate: 30,
  maxBitrate: 3500,
}

export const DEFAULT_IVS_LOW_LATENCY_INGEST =
  'https://g.webrtc.live-video.net:4443'

export const DEFAULT_IVS_WHIP_ENDPOINT = 'https://global.whip.live-video.net'
