import type { ConnectionState } from 'zss/feature/broadcast/webbroadcasttypes'
import {
  mapconnectionstate,
  parseiceserversfromlink,
  postsdp,
  resolvelocation,
  waiticegathering,
} from 'zss/feature/broadcast/webrtcice'

export type WhepStart = {
  endpoint: string
  bearer: string
}

export class WhepTransport {
  private peerconnection: RTCPeerConnection | undefined
  private sessionurl: string | undefined
  private bearer: string | undefined
  private onconnectionstatechange:
    | ((state: ConnectionState) => void)
    | undefined
  private onerror: ((message: string) => void) | undefined
  private ontrack: ((event: RTCTrackEvent) => void) | undefined

  sethandlers(handlers: {
    onconnectionstatechange?: (state: ConnectionState) => void
    onerror?: (message: string) => void
    ontrack?: (event: RTCTrackEvent) => void
  }) {
    this.onconnectionstatechange = handlers.onconnectionstatechange
    this.onerror = handlers.onerror
    this.ontrack = handlers.ontrack
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

  async start(start: WhepStart) {
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
    pc.ontrack = (event) => {
      this.ontrack?.(event)
    }

    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addTransceiver('audio', { direction: 'recvonly' })

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await waiticegathering(pc)
    const localsdp = pc.localDescription?.sdp ?? offer.sdp
    if (!localsdp) {
      throw new Error('whep: missing local sdp')
    }

    let requesturl = start.endpoint
    let response = await postsdp(requesturl, start.bearer, localsdp, {
      Accept: 'application/sdp',
    })
    if (
      response.status === 307 ||
      response.status === 301 ||
      response.status === 302
    ) {
      const location = response.headers.get('Location')
      if (!location) {
        throw new Error('whep: redirect missing Location header')
      }
      requesturl = resolvelocation(requesturl, location)
      response = await postsdp(requesturl, start.bearer, localsdp, {
        Accept: 'application/sdp',
      })
    }

    if (!response.ok) {
      let message = `whep: offer failed (${response.status})`
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
      this.sessionurl = resolvelocation(requesturl, location)
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
      this.peerconnection.ontrack = null
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
