import { DEFAULT_IVS_LOW_LATENCY_INGEST } from 'zss/feature/broadcast/webbroadcastconstants'
import type {
  ConnectionState,
  StreamConfig,
} from 'zss/feature/broadcast/webbroadcasttypes'

export type IvsLowLatencyStart = {
  streamKey: string
  ingestEndpoint?: string
}

function encodeoffer(description: RTCSessionDescriptionInit): string {
  return btoa(JSON.stringify(description))
}

function decodeanswer(answer: string): RTCSessionDescriptionInit {
  return JSON.parse(atob(answer)) as RTCSessionDescriptionInit
}

function mapconnectionstate(pc: RTCPeerConnection): ConnectionState {
  const state = pc.connectionState || pc.iceConnectionState
  switch (state) {
    case 'new':
      return 'new'
    case 'connecting':
    case 'checking':
      return 'connecting'
    case 'connected':
    case 'completed':
      return 'connected'
    case 'disconnected':
      return 'disconnected'
    case 'failed':
      return 'failed'
    case 'closed':
      return 'closed'
    default:
      return 'none'
  }
}

export class IvsLowLatencyTransport {
  private peerconnection: RTCPeerConnection | undefined
  private ingestsessionid: string | undefined
  private onconnectionstatechange:
    | ((state: ConnectionState) => void)
    | undefined
  private onerror: ((message: string) => void) | undefined

  sethandlers(handlers: {
    onconnectionstatechange?: (state: ConnectionState) => void
    onerror?: (message: string) => void
  }) {
    this.onconnectionstatechange = handlers.onconnectionstatechange
    this.onerror = handlers.onerror
  }

  getconnectionstate(): ConnectionState {
    if (!this.peerconnection) {
      return 'none'
    }
    return mapconnectionstate(this.peerconnection)
  }

  getsessionid(): string | undefined {
    return this.ingestsessionid
  }

  getpeerconnection(): RTCPeerConnection | undefined {
    return this.peerconnection
  }

  async start(
    start: IvsLowLatencyStart,
    streamconfig: StreamConfig,
    tracks: MediaStreamTrack[],
  ) {
    this.stop()
    const pc = new RTCPeerConnection()
    this.peerconnection = pc
    pc.onconnectionstatechange = () => {
      this.onconnectionstatechange?.(mapconnectionstate(pc))
    }
    pc.oniceconnectionstatechange = () => {
      this.onconnectionstatechange?.(mapconnectionstate(pc))
    }

    for (const track of tracks) {
      pc.addTrack(track)
    }

    const offer = await pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    })
    await pc.setLocalDescription(offer)

    const ingestendpoint =
      start.ingestEndpoint ?? DEFAULT_IVS_LOW_LATENCY_INGEST
    const response = await fetch(`${ingestendpoint}/v1/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offer: encodeoffer(offer),
        streamKey: start.streamKey,
        ...streamconfig,
      }),
    })

    if (!response.ok) {
      let message = `ivs low-latency offer failed (${response.status})`
      try {
        const body = (await response.json()) as { message?: string }
        if (body.message) {
          message = body.message
        }
      } catch {
        /* ignore */
      }
      this.stop()
      this.onerror?.(message)
      throw new Error(message)
    }

    const body = (await response.json()) as {
      answer?: string
      ingestSessionId?: string
    }
    if (!body.answer) {
      const message = 'ivs low-latency offer missing answer'
      this.stop()
      this.onerror?.(message)
      throw new Error(message)
    }

    await pc.setRemoteDescription(decodeanswer(body.answer))
    this.ingestsessionid = body.ingestSessionId
    this.onconnectionstatechange?.(mapconnectionstate(pc))
  }

  stop() {
    if (this.peerconnection) {
      this.peerconnection.onconnectionstatechange = null
      this.peerconnection.oniceconnectionstatechange = null
      this.peerconnection.close()
      this.peerconnection = undefined
    }
    this.ingestsessionid = undefined
  }
}
