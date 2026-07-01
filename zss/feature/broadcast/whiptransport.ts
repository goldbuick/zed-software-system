import type { ConnectionState } from 'zss/feature/broadcast/webbroadcasttypes'

export type WhipStart = {
  endpoint: string
  bearer: string
}

function mapconnectionstate(pc: RTCPeerConnection): ConnectionState {
  const state = String(pc.connectionState || pc.iceConnectionState)
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

function parseiceserversfromlink(header: string | null): RTCIceServer[] {
  if (!header) {
    return []
  }
  const servers: RTCIceServer[] = []
  const parts = header.split(/,\s*(?=<)/)
  for (const part of parts) {
    if (!part.includes('rel="ice-server"')) {
      continue
    }
    const urlmatch = /<([^>]+)>/.exec(part)
    if (!urlmatch) {
      continue
    }
    const server: RTCIceServer = { urls: urlmatch[1] }
    const user = /username="([^"]+)"/.exec(part)
    const cred = /credential="([^"]+)"/.exec(part)
    if (user) {
      server.username = user[1]
    }
    if (cred) {
      server.credential = cred[1]
    }
    servers.push(server)
  }
  return servers
}

async function postwhipoffer(
  url: string,
  bearer: string,
  sdp: string,
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/sdp',
      Authorization: `Bearer ${bearer}`,
    },
    body: sdp,
  })
}

export class WhipTransport {
  private peerconnection: RTCPeerConnection | undefined
  private sessionurl: string | undefined
  private bearer: string | undefined
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
    return this.sessionurl
  }

  getpeerconnection(): RTCPeerConnection | undefined {
    return this.peerconnection
  }

  async start(start: WhipStart, tracks: MediaStreamTrack[]) {
    void this.stop()
    this.bearer = start.bearer
    const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' })
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

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    if (!offer.sdp) {
      throw new Error('whip: missing local sdp')
    }

    let response = await postwhipoffer(start.endpoint, start.bearer, offer.sdp)
    if (
      response.status === 307 ||
      response.status === 301 ||
      response.status === 302
    ) {
      const location = response.headers.get('Location')
      if (!location) {
        throw new Error('whip: redirect missing Location header')
      }
      response = await postwhipoffer(location, start.bearer, offer.sdp)
    }

    if (!response.ok) {
      let message = `whip: offer failed (${response.status})`
      try {
        const text = await response.text()
        if (text) {
          message = text
        }
      } catch {
        /* ignore */
      }
      void this.stop()
      this.onerror?.(message)
      throw new Error(message)
    }

    const answer = await response.text()
    const iceservers = parseiceserversfromlink(response.headers.get('Link'))
    if (iceservers.length) {
      pc.setConfiguration({ iceServers: iceservers })
    }

    const location = response.headers.get('Location')
    if (location) {
      this.sessionurl = location
    }

    await pc.setRemoteDescription({ type: 'answer', sdp: answer })
    this.onconnectionstatechange?.(mapconnectionstate(pc))
  }

  async stop() {
    const sessionurl = this.sessionurl
    const bearer = this.bearer
    if (this.peerconnection) {
      this.peerconnection.onconnectionstatechange = null
      this.peerconnection.oniceconnectionstatechange = null
      this.peerconnection.close()
      this.peerconnection = undefined
    }
    this.sessionurl = undefined
    this.bearer = undefined
    if (sessionurl && bearer) {
      try {
        await fetch(sessionurl, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${bearer}` },
        })
      } catch {
        /* ignore */
      }
    }
  }
}
