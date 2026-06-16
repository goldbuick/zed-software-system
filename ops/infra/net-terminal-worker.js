/**
 * PeerJS signaling for terminal.zed.cafe (one Durable Object per peer ID).
 * API reference: ops/infra/README.md#terminal-net-terminal-workerjs
 */

const WELCOME_TEXT =
  '{"name":"PeerJS Server","description":"A server side element to broker connections between PeerJS clients.","website":"https://peerjs.com/"}'
const HEARTBEAT = '{"type":"HEARTBEAT"}'
const OPEN = '{"type":"OPEN"}'
const ID_TAKEN = '{"type":"ID-TAKEN","payload":{"msg":"ID is taken"}}'

const corsheaders = {
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

function withcors(response) {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(corsheaders)) {
    headers.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export class PeerServer {
  constructor(ctx, env) {
    this.ctx = ctx
    this.env = env
    ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(HEARTBEAT, HEARTBEAT),
    )
  }

  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === '/relay' && request.method === 'POST') {
      const data = await request.json()
      const sockets = this.ctx.getWebSockets()
      const ws = sockets[0]
      if (ws) {
        ws.send(JSON.stringify(data))
      }
      return new Response('ok')
    }

    const peerid = url.searchParams.get('id')
    const token = url.searchParams.get('token')
    if (!peerid || !token) {
      return new Response(null, { status: 400 })
    }

    const [client, server] = Object.values(new WebSocketPair())
    const existing = this.ctx.getWebSockets()

    if (existing.length > 0) {
      const old = existing[0].deserializeAttachment()
      if (old?.token !== token) {
        server.accept()
        server.send(ID_TAKEN)
        server.close(1008, 'ID is taken')
        return new Response(null, { status: 101, webSocket: client })
      }
      for (const ws of existing) {
        ws.close(1000, 'reconnect')
      }
    }

    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ peerId: peerid, token })
    server.send(OPEN)

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws, message) {
    let data
    try {
      data = JSON.parse(message)
    } catch {
      return
    }

    const dst = data.dst
    if (!dst) {
      return
    }

    const attachment = ws.deserializeAttachment()
    const peerid = attachment?.peerId
    if (!peerid) {
      return
    }

    const target = this.env.PEER_SERVER.get(
      this.env.PEER_SERVER.idFromName(dst),
    )
    await target.fetch(
      new Request('http://internal/relay', {
        method: 'POST',
        body: JSON.stringify({ ...data, src: peerid }),
      }),
    )
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsheaders })
    }

    const path = url.pathname.replace(/\/+$/, '') || '/'

    if (path === '/peerjs/id') {
      return withcors(
        new Response(crypto.randomUUID(), {
          headers: { 'Content-Type': 'text/plain' },
        }),
      )
    }

    if (path === '/peerjs') {
      if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
        const peerid = url.searchParams.get('id')
        if (!peerid) {
          return new Response('missing id', { status: 400 })
        }
        const stub = env.PEER_SERVER.get(env.PEER_SERVER.idFromName(peerid))
        return stub.fetch(request)
      }
      return withcors(
        new Response(WELCOME_TEXT, {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }

    return new Response('not found', { status: 404 })
  },
}
