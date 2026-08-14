import type { ConnectionState } from 'zss/feature/broadcast/webbroadcasttypes'

export function mapconnectionstate(pc: RTCPeerConnection): ConnectionState {
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

export function parseiceserversfromlink(header: string | null): RTCIceServer[] {
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

export function resolvelocation(baseurl: string, location: string): string {
  try {
    return new URL(location, baseurl).href
  } catch {
    return location
  }
}

const ICE_GATHER_TIMEOUT_MS = 3000

export function waiticegathering(
  pc: RTCPeerConnection,
  timeoutms = ICE_GATHER_TIMEOUT_MS,
): Promise<void> {
  if (pc.iceGatheringState === 'complete') {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const finish = () => {
      pc.removeEventListener('icegatheringstatechange', onchange)
      resolve()
    }
    const onchange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timer)
        finish()
      }
    }
    const timer = setTimeout(finish, timeoutms)
    pc.addEventListener('icegatheringstatechange', onchange)
  })
}

export async function postsdp(
  url: string,
  bearer: string,
  sdp: string,
  extraheaders: Record<string, string> = {},
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/sdp',
      Authorization: `Bearer ${bearer}`,
      ...extraheaders,
    },
    body: sdp,
  })
}
